// Configurações padrão do algoritmo. Os valores não informados pelo chamador
// permanecem com estes padrões durante a normalização.
export const PADRAO = {
  /* ---------- Opções principais ---------- */
  espessura: 0,          // pixels graduais na saída processada: >0 engrossa, <0 afina (-10 a 10)
  largura: 0,            // dimensão final opcional; 0 preserva a largura original
  altura: 0,             // dimensão final opcional; 0 preserva a altura original
  transparente: false,   // true = fundo transparente | false = fundo branco
  pretoPuro: true,       // true = tinta #000000 | false = usa a cor média da tinta original
  suavizar: true,        // transição gradual de opacidade nas bordas da tinta

  /* ---------- Avançado ---------- */
  fundoLargura: 32,      // largura do mapa de iluminação; menor = fundo mais suave
  percentilBaixo: 0.005,  // Percentil usado como início do intervalo de contraste (0 a 1)
  percentilAlto: 0.995,   // Percentil usado como fim do intervalo de contraste (0 a 1)
  margemForte: -20,      // tinta opaca: Otsu + margemForte
  margemFraca: 55        // limite superior da transição da tinta para o fundo
};

// Limita o total de pixels de entrada ou saída para evitar alocações de memória excessivas.
const MAX_PIXELS = 36_000_000;
const DENSIDADE_PICOS_MIN_DIRECIONAL = 0.01;
const DENSIDADE_PICOS_MAX_DIRECIONAL = 0.025;

/**
 * Processa o conteúdo de um canvas e o substitui por uma imagem com o fundo
 * removido, preservando os traços por meio de uma máscara de opacidade gradual.
 *
 * Etapas: corrige iluminação e contraste, calcula a cobertura da tinta e grava
 * o resultado no canvas sem descartar componentes pequenos ou traços claros.
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
  // Pixels transparentes podem carregar RGB preto sem representar tinta; mistura-os
  // sobre branco antes da correção de iluminação e usa essa versão opaca como fundo.
  let origemOpaca = canvas;
  if (comporTransparenciaSobreBranco(px)) {
    origemOpaca = novoCanvas(w, h);
    origemOpaca.getContext("2d").putImageData(img, 0, 0);
  }
  // Estima o fundo iluminado em baixa resolução e o amplia para o tamanho original.
  const fundo = estimarFundo(origemOpaca, w, h, cfg.fundoLargura);

  // Corrige a iluminação dividindo cada canal pela estimativa do fundo,
  // converte para luminância e constrói um histograma de níveis de cinza.
  const gray = new Uint8ClampedArray(n);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const r = (px[p]     * 255) / (fundo[p]     || 1);
    const g = (px[p + 1] * 255) / (fundo[p + 1] || 1);
    const b = (px[p + 2] * 255) / (fundo[p + 2] || 1);
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // Corrige picos isolados; a mediana direcional só é ativada em uma faixa
  // diagnosticada de ruído denso, para evitar apagar linhas de um pixel em fontes limpas.
  suprimirPicosIsolados(gray, w, h);

  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) hist[gray[i]]++;

  // Expande o intervalo tonal definido pelos percentis e atualiza os níveis
  // de cinza e o histograma para que a detecção da tinta tenha mais contraste.
  const lut = criarLutContraste(hist, n, cfg.percentilBaixo, cfg.percentilAlto);
  const histC = new Uint32Array(256);
  for (let v = 0; v < 256; v++) histC[lut[v]] += hist[v];
  for (let i = 0; i < n; i++) gray[i] = lut[gray[i]];

  // Otsu estima a separação tonal. As margens definem uma faixa gradual, sem
  // exigir conectividade com um pixel escuro para manter uma parte da assinatura.
  const limiar = otsu(histC, n);
  const forte = Math.min(254, Math.max(0, limiar + cfg.margemForte));
  const limiteFundo = Math.min(255, Math.max(forte + 1, limiar + cfg.margemFraca));

  // Escolhe a tinta preta ou calcula a cor média original dos pixels classificados
  // como tinta forte, antes que qualquer redimensionamento altere esses pixels.
  const corTinta = cfg.pretoPuro ? [0, 0, 0] : corMediaTinta(px, gray, n, forte);

  // Redimensiona o plano tonal antes de criar a opacidade para conservar traços
  // estreitos e bordas suaves quando a saída tiver outro tamanho.
  const cinza = redimensionarCinza(gray, w, h, W, H);

  // A cobertura gradual retém traços claros e antialias sem os fundir com o
  // fundo. Não há abertura, fechamento ou remoção por área no fluxo padrão.
  let cobertura = criarCobertura(cinza, N, forte, limiteFundo, cfg.suavizar);

  // Espessura opcional: usa morfologia sobre a cobertura contínua e interpola
  // entre raios inteiros, para que frações pequenas alterem as bordas gradualmente.
  if (cfg.espessura !== 0) {
    const magnitude = Math.abs(cfg.espessura) * Math.sqrt(N / n);
    const passosInteiros = Math.floor(magnitude);
    const fracao = magnitude - passosInteiros;
    const dilatar = cfg.espessura > 0;
    let ajustada = passosInteiros > 0
      ? morfologia(cobertura, W, H, passosInteiros, dilatar)
      : cobertura;

    if (fracao > 0) {
      const proximoPasso = morfologia(ajustada, W, H, 1, dilatar, passosInteiros);
      const gradual = new Uint8ClampedArray(N);
      for (let i = 0; i < N; i++) {
        gradual[i] = ajustada[i] + (proximoPasso[i] - ajustada[i]) * fracao;
      }
      ajustada = gradual;
    }
    // A cobertura já contém antialias; aplicar uma segunda média aqui apagava
    // os incrementos fracionários menores e reintroduzia degraus no controle.
    cobertura = ajustada;
  }

  // Converte a cobertura em RGBA e atualiza o canvas; alterar suas dimensões
  // limpa o conteúdo anterior antes de inserir a imagem processada.
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

  // Parâmetros de espessura, iluminação e contraste são limitados antes do uso.
  c.espessura  = Math.min(10, Math.max(-10, num(c.espessura, 0)));
  c.fundoLargura = inteiro(c.fundoLargura, 4, 512, 32);
  c.margemForte = Math.min(255, Math.max(-255, num(c.margemForte, -20)));
  c.margemFraca = Math.min(255, Math.max(-255, num(c.margemFraca, 55)));
  c.percentilBaixo = Math.min(0.25, Math.max(0, num(c.percentilBaixo, 0.005)));
  c.percentilAlto = Math.min(1, Math.max(0.75, num(c.percentilAlto, 0.995)));
  if (c.percentilAlto <= c.percentilBaixo) {
    c.percentilBaixo = 0.005;
    c.percentilAlto = 0.995;
  }
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

/**
 * Compõe RGBA semitransparente sobre branco nos próprios dados lidos do canvas.
 * Retorna true quando foi necessário gerar uma fonte opaca para estimar o fundo.
 */
function comporTransparenciaSobreBranco(data) {
  let temTransparencia = false;
  for (let p = 3; p < data.length; p += 4) {
    if (data[p] < 255) { temTransparencia = true; break; }
  }
  if (!temTransparencia) return false;

  for (let p = 0; p < data.length; p += 4) {
    const alfa = data[p + 3] / 255;
    if (alfa < 1) {
      data[p]     = data[p]     * alfa + 255 * (1 - alfa);
      data[p + 1] = data[p + 1] * alfa + 255 * (1 - alfa);
      data[p + 2] = data[p + 2] * alfa + 255 * (1 - alfa);
      data[p + 3] = 255;
    }
  }
  return true;
}

/**
 * Substitui valores muito diferentes dos vizinhos quando nenhum vizinho os
 * confirma. O teste evita remover linhas finas: um trecho conectado fornece
 * suporte tonal ao próprio traço, enquanto pontos impulsivos ficam isolados.
 */
function suprimirPicosIsolados(gray, w, h, permitirFiltroDirecional = true) {
  if (w < 3 || h < 3) return 0;
  const desvioMinimo = 120;
  const toleranciaSuporte = 90;
  let totalPicos = 0;

  // Conta primeiro para evitar alocar outra imagem quando a entrada está limpa.
  for (let y = 1; y < h - 1; y++) {
    const linha = y * w;
    for (let x = 1; x < w - 1; x++) {
      const i = linha + x;
      const centro = gray[i];
      let soma = 0, suporta = false;

      for (let dy = -1; dy <= 1; dy++) {
        const vizinho = (y + dy) * w + x - 1;
        for (let dx = 0; dx < 3; dx++) {
          if (dy === 0 && dx === 1) continue;
          const valor = gray[vizinho + dx];
          soma += valor;
          if (Math.abs(valor - centro) <= toleranciaSuporte) suporta = true;
        }
      }

      const mediaVizinhos = soma / 8;
      if (!suporta && Math.abs(centro - mediaVizinhos) >= desvioMinimo) {
        totalPicos++;
      }
    }
  }
  const densidade = totalPicos / gray.length;
  // A quantidade não invalida um pico: um ou dois pontos isolados também podem
  // ser ruído. A regra de suporte tonal acima protege pixels ligados ao traço.
  if (totalPicos === 0) return 0;

  // A mediana direcional ajuda quando há ruído impulsivo relevante, mas deixa
  // de ser confiável quando os candidatos ocupam uma parte extrema da imagem.
  if (
    permitirFiltroDirecional &&
    densidade >= DENSIDADE_PICOS_MIN_DIRECIONAL &&
    densidade <= DENSIDADE_PICOS_MAX_DIRECIONAL
  ) {
    filtrarPicosDirecional(gray, w, h);
    return suprimirPicosIsolados(gray, w, h, false);
  }

  const corrigido = new Uint8ClampedArray(gray);
  for (let y = 1; y < h - 1; y++) {
    const linha = y * w;
    for (let x = 1; x < w - 1; x++) {
      const i = linha + x;
      const centro = gray[i];
      let soma = 0, suporta = false;

      for (let dy = -1; dy <= 1; dy++) {
        const vizinho = (y + dy) * w + x - 1;
        for (let dx = 0; dx < 3; dx++) {
          if (dy === 0 && dx === 1) continue;
          const valor = gray[vizinho + dx];
          soma += valor;
          if (Math.abs(valor - centro) <= toleranciaSuporte) suporta = true;
        }
      }

      const mediaVizinhos = soma / 8;
      if (!suporta && Math.abs(centro - mediaVizinhos) >= desvioMinimo) {
        corrigido[i] = mediaVizinhos;
      }
    }
  }
  gray.set(corrigido);
  return densidade;
}

/**
 * Em ruído impulsivo denso, escolhe a direção com vizinhos mais coerentes e
 * substitui extremos locais pela mediana daquele eixo. A mediana direcional
 * remove pontos que interrompem o traço sem aplicar um desfoque isotrópico.
 */
function filtrarPicosDirecional(gray, w, h) {
  if (w < 3 || h < 3) return;

  const original = new Uint8ClampedArray(gray);
  const filtrado = new Uint8ClampedArray(gray);
  const diferencaMinima = 80;
  const diagonal = w + 1;

  for (let y = 1; y < h - 1; y++) {
    const linha = y * w;
    for (let x = 1; x < w - 1; x++) {
      const i = linha + x;
      const centro = original[i];
      let menorVariacao = Infinity;
      let mediana = centro;

      // Pares opostos aproximam a tangente local; o par mais parecido guia a
      // mediana para não misturar lados distintos de uma borda.
      const a = original[i - 1], b = original[i + 1];
      let variacao = Math.abs(a - b);
      if (variacao < menorVariacao) {
        menorVariacao = variacao;
        mediana = a + centro + b - Math.min(a, centro, b) - Math.max(a, centro, b);
      }

      const c = original[i - w], d = original[i + w];
      variacao = Math.abs(c - d);
      if (variacao < menorVariacao) {
        menorVariacao = variacao;
        mediana = c + centro + d - Math.min(c, centro, d) - Math.max(c, centro, d);
      }

      const e = original[i - diagonal], f = original[i + diagonal];
      variacao = Math.abs(e - f);
      if (variacao < menorVariacao) {
        menorVariacao = variacao;
        mediana = e + centro + f - Math.min(e, centro, f) - Math.max(e, centro, f);
      }

      const g = original[i - w + 1], hVizinho = original[i + w - 1];
      variacao = Math.abs(g - hVizinho);
      if (variacao < menorVariacao) {
        mediana = g + centro + hVizinho - Math.min(g, centro, hVizinho) - Math.max(g, centro, hVizinho);
      }

      if (Math.abs(centro - mediana) >= diferencaMinima) filtrado[i] = mediana;
    }
  }

  gray.set(filtrado);
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

/* =====================  Opacidade da tinta  ===================== */

/**
 * Mapeia a faixa entre tinta forte e fundo para uma opacidade contínua.
 * Assim, marcas claras não dependem de conexão com os trechos escuros e os
 * pixels próximos ao papel viram fundo transparente sem um corte abrupto.
 */
function criarCobertura(gray, n, limiteTinta, limiteFundo, suavizarBordas) {
  const cobertura = new Uint8ClampedArray(n);
  const intervalo = Math.max(1, limiteFundo - limiteTinta);

  for (let i = 0; i < n; i++) {
    const t = Math.min(1, Math.max(0, (limiteFundo - gray[i]) / intervalo));
    // Smootherstep deixa derivadas e curvatura contínuas nos extremos da borda;
    // pixels muito próximos do papel perdem menos ruído sem enfraquecer o núcleo.
    const opacidade = suavizarBordas
      ? t * t * t * (t * (t * 6 - 15) + 10)
      : (t >= 0.5 ? 1 : 0);
    cobertura[i] = opacidade * 255;
  }
  return cobertura;
}

/**
 * Executa dilatação (dilatar=true) ou erosão (false) repetindo o passo
 * morfológico `raio` vezes sobre a cobertura, sem binarizar o antialias.
 * Alternar cruz e quadrado aproxima um elemento estruturante arredondado.
 */
function morfologia(src, w, h, raio, dilatar, inicio = 0) {
  let a = src, b = new Uint8ClampedArray(w * h);

  for (let it = 0; it < raio; it++) {
    // Alterna entre quatro vizinhos e oito vizinhos a cada iteração.
    passoMorfologico(a, b, w, h, dilatar, (inicio + it) % 2 === 0);
    [a, b] = [b, a];
  }
  return a;
}

/**
 * Calcula o máximo (dilatação) ou mínimo (erosão) da cobertura na vizinhança.
 * `cruz` escolhe se as diagonais também fazem parte da vizinhança.
 */
function passoMorfologico(src, dst, w, h, dilatar, cruz) {
  // Percorre a imagem e trata bordas verificando a existência de cada vizinho.
  for (let y = 0; y < h; y++) {
    const cima = y > 0, baixo = y < h - 1;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const esq = x > 0, dir = x < w - 1;
      let valor = src[i];
      if (esq) valor = dilatar ? Math.max(valor, src[i - 1]) : Math.min(valor, src[i - 1]);
      if (dir) valor = dilatar ? Math.max(valor, src[i + 1]) : Math.min(valor, src[i + 1]);
      if (cima) valor = dilatar ? Math.max(valor, src[i - w]) : Math.min(valor, src[i - w]);
      if (baixo) valor = dilatar ? Math.max(valor, src[i + w]) : Math.min(valor, src[i + w]);
      if (!cruz && cima && esq) valor = dilatar ? Math.max(valor, src[i - w - 1]) : Math.min(valor, src[i - w - 1]);
      if (!cruz && cima && dir) valor = dilatar ? Math.max(valor, src[i - w + 1]) : Math.min(valor, src[i - w + 1]);
      if (!cruz && baixo && esq) valor = dilatar ? Math.max(valor, src[i + w - 1]) : Math.min(valor, src[i + w - 1]);
      if (!cruz && baixo && dir) valor = dilatar ? Math.max(valor, src[i + w + 1]) : Math.min(valor, src[i + w + 1]);
      dst[i] = valor;
    }
  }
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
