// Configurações padrão do algoritmo. Os valores não informados pelo chamador
// permanecem com estes padrões durante a normalização.
export const PADRAO = {
  /* ---------- Opções principais ---------- */
  espessura: 0,          // px por lado na imagem final: >0 engrossa, <0 afina, 0 mantém (-10 a 10)
  transparente: false,   // true = fundo transparente | false = fundo branco
  pretoPuro: true,       // true = tinta #000000 | false = usa a cor média da tinta original
  suavizar: true,       // true = bordas com anti-aliasing (blur)

  /* ---------- Avançado ---------- */
  fundoLargura: 32,      // largura do mapa de iluminação; menor = fundo mais suave
  percentilBaixo: 0.005,  // Percentil usado como início do intervalo de contraste (0 a 1)
  percentilAlto: 0.995,   // Percentil usado como fim do intervalo de contraste (0 a 1)
  margemForte: -20,      // tinta "certa": Otsu + margemForte
  margemFraca: 15,       // tinta "provável": Otsu + margemFraca
  raioFecho: 1,          // fecha lacunas de ~2*raio px (0 = desliga)
  areaMinima: 20         // remove manchas menores que isso (px, na resolução original)
};

// Limita o total de pixels de entrada ou saída para evitar alocações de memória excessivas.
const MAX_PIXELS = 36_000_000;

/**
 * Processa o conteúdo de um canvas e o substitui por uma imagem de assinatura
 * segmentada, redimensionada e opcionalmente transparente.
 *
 * Etapas: corrige iluminação, converte para tons de cinza, ajusta contraste,
 * detecta os traços, aplica operações morfológicas e grava o resultado no canvas.
 * O mesmo canvas é alterado; a função retorna dimensões finais e limiar de Otsu.
 */
export function processImage(canvas, opcoes = {}) {
  // Completa e valida as opções antes de fazer cálculos ou percorrer os pixels.
  const cfg = normalizar(opcoes);
  // willReadFrequently sugere ao navegador uma otimização para leitura de pixels.
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || canvas.width === 0 || canvas.height === 0) {
    throw new Error("Não foi possível preparar a imagem para processamento.");
  }

  // w/h e W/H representam, respectivamente, as dimensões de entrada e de saída.
  const { width: w, height: h } = canvas;
  const n = w * h;
  const [W, H] = calcularTamanho(w, h, cfg.largura, cfg.altura);
  const N = W * H;
  // Verifica ambas as resoluções antes de alocar buffers que crescem com os pixels.
  if (Math.max(n, N) > MAX_PIXELS) {
    throw new Error("Imagem grande demais para processar. Reduza o tamanho de entrada ou de saída.");
  }

  // ImageData armazena cada pixel como quatro bytes RGBA consecutivos.
  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;
  // Estima o fundo iluminado em baixa resolução e o amplia para o tamanho original.
  const fundo = estimarFundo(canvas, w, h, cfg.fundoLargura);

  // Corrige a iluminação dividindo cada canal pela estimativa do fundo,
  // converte para luminância e constrói um histograma de níveis de cinza.
  const gray = new Uint8ClampedArray(n);
  const hist = new Uint32Array(256);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const r = (px[p]     * 255) / (fundo[p]     || 1);
    const g = (px[p + 1] * 255) / (fundo[p + 1] || 1);
    const b = (px[p + 2] * 255) / (fundo[p + 2] || 1);
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    hist[gray[i]]++;
  }

  // Expande o intervalo tonal definido pelos percentis e atualiza os níveis
  // de cinza e o histograma para que a detecção da tinta tenha mais contraste.
  const lut = criarLutContraste(hist, n, cfg.percentilBaixo, cfg.percentilAlto);
  const histC = new Uint32Array(256);
  for (let v = 0; v < 256; v++) histC[lut[v]] += hist[v];
  for (let i = 0; i < n; i++) gray[i] = lut[gray[i]];

  // Otsu separa tinta e fundo; as margens formam os limiares forte/fraco
  // usados pela histerese para preservar traços conectados de baixa intensidade.
  const limiar = otsu(histC, n);
  const forte = Math.max(0, limiar + cfg.margemForte);
  const fraco = Math.min(254, limiar + cfg.margemFraca);

  // Escolhe a tinta preta ou calcula a cor média original dos pixels classificados
  // como tinta forte, antes que qualquer redimensionamento altere esses pixels.
  const corTinta = cfg.pretoPuro ? [0, 0, 0] : corMediaTinta(px, gray, n, forte);

  // Redimensiona os tons de cinza antes da binarização para preservar melhor
  // os traços finos e evitar serrilhado quando a saída tiver outro tamanho.
  const cinza = redimensionarCinza(gray, w, h, W, H);

  // Converte parâmetros expressos na resolução de entrada para a escala de saída.
  const k = Math.sqrt(N / n);
  const raioFecho = cfg.raioFecho > 0 ? Math.max(1, Math.round(cfg.raioFecho * k)) : 0;
  const areaMinima = Math.round(cfg.areaMinima * k * k);

  // Cria a máscara binária (255 = tinta, 0 = fundo) e fecha pequenas falhas.
  let mask = histerese(cinza, W, H, forte, fraco);

  if (raioFecho > 0) {
    mask = morfologia(mask, W, H, raioFecho, true);    // dilata
    mask = morfologia(mask, W, H, raioFecho, false);   // erode
  }

  removerManchas(mask, W, H, areaMinima);

  if (cfg.espessura > 0) mask = morfologia(mask, W, H, cfg.espessura, true);
  else if (cfg.espessura < 0) mask = morfologia(mask, W, H, -cfg.espessura, false);

  // Opcionalmente suaviza as bordas da máscara, transforma cobertura em RGBA
  // e atualiza o canvas. Alterar suas dimensões limpa o conteúdo anterior.
  const cobertura = cfg.suavizar ? suavizar(mask, W, H) : mask;
  const saida = new ImageData(W, H);
  escrever(saida.data, cobertura, N, cfg.transparente, corTinta);

  canvas.width = W;     // redimensiona (e limpa) o canvas
  canvas.height = H;
  ctx.putImageData(saida, 0, 0);

  return { largura: W, altura: H, limiar };
}

/* =====================  Opções  ===================== */

/**
 * Combina opções do usuário com os padrões e limita números às faixas válidas.
 * Booleanos são normalizados explicitamente para impedir valores truthy inesperados.
 */
function normalizar(op) {
  // A cópia evita modificar tanto o objeto padrão quanto o objeto recebido.
  const c = { ...PADRAO };
  // Só substitui uma opção padrão quando a chave foi realmente informada.
  for (const chave in op) if (op[chave] !== undefined) c[chave] = op[chave];

  // Conversores locais: num trata valores inválidos e inteiro arredonda e limita.
  const num = (v, padrao) => (Number.isFinite(Number(v)) && v !== "" && v !== null ? Number(v) : padrao);
  const inteiro = (v, min, max, padrao) =>
    Math.min(max, Math.max(min, Math.round(num(v, padrao))));

  // Parâmetros morfológicos e de iluminação são limitados antes de serem usados.
  c.espessura  = inteiro(c.espessura, -10, 10, 0);
  c.raioFecho  = inteiro(c.raioFecho, 0, 10, 1);
  c.areaMinima = inteiro(c.areaMinima, 0, 100000, 20);
  c.fundoLargura = inteiro(c.fundoLargura, 4, 512, 32);
  c.margemForte = num(c.margemForte, -20);
  c.margemFraca = num(c.margemFraca, 15);
  c.percentilBaixo = num(c.percentilBaixo, 0.005);
  c.percentilAlto = num(c.percentilAlto, 0.995);
  c.transparente = !!c.transparente;
  c.pretoPuro = !!c.pretoPuro;
  c.suavizar = !!c.suavizar;
  return c;
}

/**
 * Resolve as dimensões do resultado sem distorcer a proporção quando apenas
 * uma dimensão é configurada; sem dimensões explícitas, preserva o original.
 */
function calcularTamanho(w, h, largura, altura) {
  let W = Number(largura) > 0 ? Math.round(largura) : 0;
  let H = Number(altura) > 0 ? Math.round(altura) : 0;
  if (!W && !H) { W = w; H = h; }
  else if (!H) H = Math.round((h * W) / w);
  else if (!W) W = Math.round((w * H) / h);
  return [Math.max(1, W), Math.max(1, H)];
}

/* =====================  Iluminação  ===================== */

/**
 * Estima a cor/iluminação do fundo reduzindo a imagem até a largura alvo,
 * depois amplia essa estimativa ao tamanho original para normalizar cada pixel.
 */
function estimarFundo(origem, w, h, larguraAlvo) {
  const alvoW = Math.max(1, Math.min(w, larguraAlvo));
  const alvoH = Math.max(1, Math.round((h * alvoW) / w));
  let atual = origem, cw = w, ch = h;

  while (cw > alvoW || ch > alvoH) {
    // Reduz em etapas para a estimativa manter informação local do gradiente.
    cw = Math.max(alvoW, Math.ceil(cw / 2));
    ch = Math.max(alvoH, Math.ceil(ch / 2));
    const c = novoCanvas(cw, ch);
    c.getContext("2d").drawImage(atual, 0, 0, cw, ch);
    atual = c;
  }

  const grande = novoCanvas(w, h);
  const gctx = grande.getContext("2d", { willReadFrequently: true });
  // Alta qualidade reduz artefatos na estimativa ampliada do fundo.
  gctx.imageSmoothingQuality = "high";
  gctx.drawImage(atual, 0, 0, w, h);
  return gctx.getImageData(0, 0, w, h).data;
}

// Cria um canvas temporário com dimensões exatas para operações intermediárias.
function novoCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/* =====================  Contraste e Otsu  ===================== */

/**
 * Cria uma tabela de consulta que estica os valores entre os percentis inferior
 * e superior até a faixa completa de 0 a 255; fora dessa faixa, os bytes saturam.
 */
function criarLutContraste(hist, total, pBaixo, pAlto) {
  // Encontra o primeiro nível de cinza que alcança cada percentil acumulado.
  let acc = 0, lo = 0, hi = 255;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= total * pBaixo) { lo = v; break; } }
  acc = 0;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= total * pAlto) { hi = v; break; } }

  // Calcula uma conversão para cada possível valor de cinza. Se o intervalo
  // for nulo, mantém a imagem como está em vez de dividir por zero.
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) lut[v] = hi > lo ? ((v - lo) * 255) / (hi - lo) : v;
  return lut;
}

/**
 * Calcula o limiar de Otsu maximizando a variância entre as classes
 * (fundo e tinta) para todos os possíveis cortes do histograma.
 */
function otsu(hist, total) {
  // Soma ponderada de todos os níveis, necessária para calcular a média total.
  let somaTotal = 0;
  for (let v = 0; v < 256; v++) somaTotal += v * hist[v];

  // Varre os possíveis limiares mantendo a soma/peso do grupo de fundo;
  // o grupo de primeiro plano corresponde aos pixels que restam.
  let somaB = 0, pesoB = 0, maxVar = 0, limiar = 0;
  for (let v = 0; v < 256; v++) {
    pesoB += hist[v];
    const pesoF = total - pesoB;
    if (pesoB === 0) continue;
    if (pesoF === 0) break;
    somaB += v * hist[v];
    // Não há separação válida se uma das classes estiver vazia.
    const dif = somaB / pesoB - (somaTotal - somaB) / pesoF;
    const varEntre = pesoB * pesoF * dif * dif;
    if (varEntre > maxVar) { maxVar = varEntre; limiar = v; }
  }
  return limiar;
}

/* =====================  Cor da tinta e redimensionamento  ===================== */

/**
 * Obtém a cor RGB média dos pixels originais cuja luminância processada
 * está abaixo do limite de tinta forte; retorna preto se nenhum pixel corresponder.
 */
function corMediaTinta(px, gray, n, limite) {
  let r = 0, g = 0, b = 0, c = 0;
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    if (gray[i] <= limite) { r += px[p]; g += px[p + 1]; b += px[p + 2]; c++; }
  }
  return c ? [Math.round(r / c), Math.round(g / c), Math.round(b / c)] : [0, 0, 0];
}

/**
 * Redimensiona a imagem em tons de cinza por canvas, reduzindo em etapas
 * intermediárias quando necessário para conservar traços estreitos.
 */
function redimensionarCinza(gray, w, h, W, H) {
  // Evita todo o custo de cópia e desenho se o tamanho já for o desejado.
  if (w === W && h === H) return gray;

  // Empacota cada nível de cinza nos canais RGB e define alfa opaco para desenhar.
  let atual = novoCanvas(w, h);
  const actx = atual.getContext("2d");
  const dado = actx.createImageData(w, h);
  const p32 = new Uint32Array(dado.data.buffer);
  for (let i = 0; i < gray.length; i++) p32[i] = (0xFF000000 | (gray[i] * 0x010101)) >>> 0;
  actx.putImageData(dado, 0, 0);

  let cw = w, ch = h;
  while (cw >= 2 * W && ch >= 2 * H) {
    // Reduz gradualmente à metade em vez de fazer uma única redução extrema.
    cw = Math.ceil(cw / 2);
    ch = Math.ceil(ch / 2);
    const c = novoCanvas(cw, ch);
    const cctx = c.getContext("2d");
    cctx.imageSmoothingQuality = "high";
    cctx.drawImage(atual, 0, 0, cw, ch);
    atual = c;
  }

  // Faz o último ajuste para dimensões exatas, inclusive quando o destino é maior.
  const final = novoCanvas(W, H);
  const fctx = final.getContext("2d", { willReadFrequently: true });
  fctx.imageSmoothingQuality = "high";
  fctx.drawImage(atual, 0, 0, W, H);

  const d = fctx.getImageData(0, 0, W, H).data;
  // Extrai somente o canal vermelho, pois R, G e B contêm o mesmo cinza.
  const out = new Uint8ClampedArray(W * H);
  for (let i = 0, p = 0; i < out.length; i++, p += 4) out[i] = d[p];
  return out;
}

/* =====================  Máscara  ===================== */

/**
 * Segmenta os pixels por histerese: pixels abaixo de `forte` iniciam a busca;
 * pixels abaixo de `fraco` são incluídos somente se estiverem conectados a
 * um pixel forte. A vizinhança considera os oito pixels ao redor.
 */
function histerese(gray, w, h, forte, fraco) {
  const n = w * h;
  const mask = new Uint8Array(n);        // 255 = tinta; 0 = fundo/ainda não visitado
  const pilha = new Int32Array(n);
  let topo = 0;

  // Pixels fortes formam as sementes da busca em profundidade.
  for (let i = 0; i < n; i++) {
    if (gray[i] <= forte) { mask[i] = 255; pilha[topo++] = i; }
  }

  // A pilha propaga a máscara pelos vizinhos fracos conectados às sementes.
  while (topo > 0) {
    const i = pilha[--topo];
    const x = i % w, y = (i - x) / w;
    for (let dy = -1; dy <= 1; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= h) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= w) continue;
        const j = ny * w + nx;
        if (!mask[j] && gray[j] <= fraco) { mask[j] = 255; pilha[topo++] = j; }
      }
    }
  }
  return mask;
}

/**
 * Executa dilatação (dilatar=true) ou erosão (false) repetindo o passo
 * morfológico `raio` vezes. Alternar cruz e quadrado aproxima um elemento
 * estruturante arredondado, evitando favorecer traços retos ou diagonais.
 */
function morfologia(src, w, h, raio, dilatar) {
  const alvo = dilatar ? 255 : 0;
  const neutro = 255 - alvo;
  let a = src, b = new Uint8Array(w * h);

  for (let it = 0; it < raio; it++) {
    // Alterna entre quatro vizinhos e oito vizinhos a cada iteração.
    passoMorfologico(a, b, w, h, alvo, neutro, it % 2 === 0);
    [a, b] = [b, a];
  }
  return a;
}

/**
 * Calcula uma iteração morfológica: a dilatação marca tinta se qualquer
 * vizinho for tinta; a erosão remove tinta se qualquer vizinho for fundo.
 * `cruz` escolhe se as diagonais também fazem parte da vizinhança.
 */
function passoMorfologico(src, dst, w, h, alvo, neutro, cruz) {
  // Percorre a imagem e trata bordas verificando a existência de cada vizinho.
  for (let y = 0; y < h; y++) {
    const cima = y > 0, baixo = y < h - 1;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      // O próprio pixel já satisfaz o teste se tiver o valor procurado.
      let achou = src[i] === alvo;

      if (!achou) {
        const esq = x > 0, dir = x < w - 1;
        if (
          (esq && src[i - 1] === alvo) ||
          (dir && src[i + 1] === alvo) ||
          (cima && src[i - w] === alvo) ||
          (baixo && src[i + w] === alvo) ||
          (!cruz && (
            (cima && esq && src[i - w - 1] === alvo) ||
            (cima && dir && src[i - w + 1] === alvo) ||
            (baixo && esq && src[i + w - 1] === alvo) ||
            (baixo && dir && src[i + w + 1] === alvo)
          ))
        ) achou = true;
      }
      dst[i] = achou ? alvo : neutro;
    }
  }
}

/**
 * Encontra componentes de tinta conectados por vizinhança de oito pixels
 * e elimina os que têm área inferior a areaMin.
 */
function removerManchas(mask, w, h, areaMin) {
  // Não há componentes a remover se o limite for zero ou um pixel.
  if (areaMin <= 1) return;
  const n = w * h;
  // visto impede visitar repetidamente o mesmo pixel; fila armazena o componente.
  const visto = new Uint8Array(n);
  const fila = new Int32Array(n);

  // Cada pixel de tinta ainda não visitado inicia uma busca em largura.
  for (let s = 0; s < n; s++) {
    if (!mask[s] || visto[s]) continue;

    let ini = 0, fim = 1;
    fila[0] = s;
    visto[s] = 1;

    // Reúne todos os pixels conectados ao ponto inicial.
    while (ini < fim) {
      const i = fila[ini++];
      const x = i % w, y = (i - x) / w;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          const j = ny * w + nx;
          if (mask[j] && !visto[j]) { visto[j] = 1; fila[fim++] = j; }
        }
      }
    }

    // `fim` é o tamanho do componente; componentes menores são ruído.
    if (fim < areaMin) for (let q = 0; q < fim; q++) mask[fila[q]] = 0;
  }
}

/**
 * Suaviza a máscara com uma média 3x3 separável e aplica uma rampa de contraste.
 * Os valores intermediários nas bordas produzem anti-aliasing sem desfocar
 * excessivamente o interior do traço.
 */
function suavizar(mask, w, h) {
  // Primeira passada: média horizontal. Índices repetidos preservam as bordas.
  const tmp = new Uint8Array(w * h);
  const dst = new Uint8ClampedArray(w * h);

  // Segunda passada: média vertical e remapeamento para recuperar firmeza.
  for (let y = 0; y < h; y++) {
    const l = y * w;
    for (let x = 0; x < w; x++) {
      const e = l + Math.max(0, x - 1), d = l + Math.min(w - 1, x + 1);
      tmp[l + x] = (mask[e] + mask[l + x] + mask[d]) / 3;
    }
  }

  for (let y = 0; y < h; y++) {
    const c = Math.max(0, y - 1) * w, m = y * w, b = Math.min(h - 1, y + 1) * w;
    for (let x = 0; x < w; x++) {
      const media = (tmp[c + x] + tmp[m + x] + tmp[b + x]) / 3;
      dst[m + x] = ((media - 30) * 255) / 90;   // 30 vira 0 e 120 vira 255; o tipo limita outros valores.
    }
  }
  return dst;
}

/* =====================  Saída  ===================== */

/**
 * Converte a máscara de cobertura em pixels RGBA da tinta escolhida.
 * Com transparência, a cobertura vira o alfa; sem transparência,
 * pixels parciais são compostos sobre branco.
 */
function escrever(data, cobertura, n, transparente, [r, g, b]) {
  // Escreve cada pixel como uma palavra de 32 bits; a ordem abaixo considera
  // a disposição little-endian dos navegadores usados pelo canvas (ABGR numérico).
  const out = new Uint32Array(data.buffer);
  const TINTA = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
  const BRANCO = 0xFFFFFFFF;

  // Cada entrada de cobertura controla transparência ou mistura da tinta no branco.
  for (let i = 0; i < n; i++) {
    const a = cobertura[i];

    if (transparente) {
      // Mantém a cor RGB e usa a cobertura como canal alfa.
      out[i] = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
    } else if (a === 0) {
      // Fundo totalmente coberto por branco.
      out[i] = BRANCO;
    } else if (a === 255) {
      // Tinta totalmente opaca: não é necessário misturar canais.
      out[i] = TINTA;
    } else {
      // Pixels de borda são compostos como mistura ponderada entre tinta e branco.
      const t = a / 255;
      const R = Math.round(255 - t * (255 - r));
      const G = Math.round(255 - t * (255 - g));
      const B = Math.round(255 - t * (255 - b));
      out[i] = ((255 << 24) | (B << 16) | (G << 8) | R) >>> 0;
    }
  }
}