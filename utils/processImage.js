export function processImage(canvas){
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx || canvas.width === 0 || canvas.height === 0) {
        throw new Error("Não foi possível preparar a imagem para processamento.")
    }

    const CONFIG = {
    fundoLargura: 32,     // largura (px) do mapa de fundo; menor = fundo mais suave
    percentilBaixo: 0.005,
    percentilAlto: 0.995,

    margemForte: -20,     // tinta "certa": limiar de Otsu + margemForte
    margemFraca: 15,      // tinta "provável": limiar de Otsu + margemFraca
    raioFecho: 1,         // fecha lacunas de até ~2*raio px (0 = desliga)
    areaMinima: 20,       // remove manchas menores que isso (em px)
    suavizar: true,       // anti-aliasing nas bordas
    transparente: false
    };

    const { width: w, height: h } = canvas;
    const n = w * h;
    const img = ctx.getImageData(0, 0, w, h);
    const px = img.data;
    const fundo = estimarFundo(canvas, w, h, CONFIG.fundoLargura);

    // 1) Iluminação + 2) Grayscale (uma passada) e histograma
    const gray = new Uint8ClampedArray(n);
    const hist = new Uint32Array(256);
    for (let i = 0, p = 0; i < n; i++, p += 4) {
        const r = (px[p]     * 255) / (fundo[p]     || 1);
        const g = (px[p + 1] * 255) / (fundo[p + 1] || 1);
        const b = (px[p + 2] * 255) / (fundo[p + 2] || 1);
        gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
        hist[gray[i]]++;
    }

    // 1b) Contraste: LUT + histograma esticado (só 256 valores)
    const lut = criarLutContraste(hist, n, CONFIG.percentilBaixo, CONFIG.percentilAlto);
    const histC = new Uint32Array(256);
    for (let v = 0; v < 256; v++) histC[lut[v]] += hist[v];
    for (let i = 0; i < n; i++) gray[i] = lut[gray[i]];   // aplica o contraste

    // 3) Limiarização com ligação de bordas
    const limiar = otsu(histC, n);
    const forte = Math.max(0, limiar + CONFIG.margemForte);
    const fraco = Math.min(254, limiar + CONFIG.margemFraca);

    let mask = histerese(gray, w, h, forte, fraco);

    if (CONFIG.raioFecho > 0) {
        mask = morfologia(mask, w, h, CONFIG.raioFecho, true);   // dilata
        mask = morfologia(mask, w, h, CONFIG.raioFecho, false);  // erode
    }

    removerManchas(mask, w, h, CONFIG.areaMinima);

    // 4) Saída
    const tinta = CONFIG.suavizar ? suavizar(mask, w, h) : mask;
    escrever(px, tinta, n, CONFIG.transparente);

    ctx.putImageData(img, 0, 0);

    /* ---------- Fundo (iluminação) ---------- */
    function estimarFundo(origem, w, h, larguraAlvo) {
    const alvoW = Math.max(1, Math.min(w, larguraAlvo));
    const alvoH = Math.max(1, Math.round((h * alvoW) / w));
    let atual = origem, cw = w, ch = h;

    while (cw > alvoW || ch > alvoH) {
        cw = Math.max(alvoW, Math.ceil(cw / 2));
        ch = Math.max(alvoH, Math.ceil(ch / 2));
        const c = novoCanvas(cw, ch);
        c.getContext("2d").drawImage(atual, 0, 0, cw, ch);
        atual = c;
    }

    const grande = novoCanvas(w, h);
    const gctx = grande.getContext("2d", { willReadFrequently: true });
    gctx.imageSmoothingQuality = "high";
    gctx.drawImage(atual, 0, 0, w, h);
    return gctx.getImageData(0, 0, w, h).data;
    }

    function novoCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
    }

    /* ---------- Contraste ---------- */
    function criarLutContraste(hist, total, pBaixo, pAlto) {
    let acc = 0, lo = 0, hi = 255;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= total * pBaixo) { lo = v; break; } }
    acc = 0;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= total * pAlto) { hi = v; break; } }

    const lut = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) lut[v] = hi > lo ? ((v - lo) * 255) / (hi - lo) : v;
    return lut;
    }

    /* ---------- Otsu ---------- */
    function otsu(hist, total) {
    let somaTotal = 0;
    for (let v = 0; v < 256; v++) somaTotal += v * hist[v];

    let somaB = 0, pesoB = 0, maxVar = 0, limiar = 0;
    for (let v = 0; v < 256; v++) {
        pesoB += hist[v];
        const pesoF = total - pesoB;
        if (pesoB === 0) continue;
        if (pesoF === 0) break;
        somaB += v * hist[v];
        const dif = somaB / pesoB - (somaTotal - somaB) / pesoF;
        const varEntre = pesoB * pesoF * dif * dif;
        if (varEntre > maxVar) { maxVar = varEntre; limiar = v; }
    }
    return limiar;
    }

    /* ---------- Histerese: liga os pixels fracos aos fortes (8 vizinhos) ---------- */
    function histerese(gray, w, h, forte, fraco) {
    const n = w * h;
    const mask = new Uint8Array(n);        // 255 = tinta
    const pilha = new Int32Array(n);       // cada pixel entra no máximo uma vez
    let topo = 0;

    for (let i = 0; i < n; i++) {
        if (gray[i] <= forte) { mask[i] = 255; pilha[topo++] = i; }
    }

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

    /* ---------- Morfologia (janela quadrada, separável) ---------- */
    // dilatar = true: expande a tinta | dilatar = false: erode a tinta
    function morfologia(src, w, h, r, dilatar) {
    const alvo = dilatar ? 255 : 0;
    const neutro = 255 - alvo;             // valor que "não muda nada" (e vale fora da imagem)
    const tmp = new Uint8Array(w * h);
    const dst = new Uint8Array(w * h);

    for (let y = 0; y < h; y++) {
        const l = y * w;
        for (let x = 0; x < w; x++) {
        let v = neutro;
        const a = Math.max(0, x - r), b = Math.min(w - 1, x + r);
        for (let xx = a; xx <= b; xx++) if (src[l + xx] === alvo) { v = alvo; break; }
        tmp[l + x] = v;
        }
    }

    for (let y = 0; y < h; y++) {
        const a = Math.max(0, y - r), b = Math.min(h - 1, y + r);
        for (let x = 0; x < w; x++) {
        let v = neutro;
        for (let yy = a; yy <= b; yy++) if (tmp[yy * w + x] === alvo) { v = alvo; break; }
        dst[y * w + x] = v;
        }
    }
    return dst;
    }

    /* ---------- Remove componentes conexos pequenos (ruído) ---------- */
    function removerManchas(mask, w, h, areaMin) {
    if (areaMin <= 1) return;
    const n = w * h;
    const visto = new Uint8Array(n);
    const fila = new Int32Array(n);        // reaproveitada a cada componente

    for (let s = 0; s < n; s++) {
        if (!mask[s] || visto[s]) continue;

        let ini = 0, fim = 1;
        fila[0] = s;
        visto[s] = 1;

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

        if (fim < areaMin) for (let k = 0; k < fim; k++) mask[fila[k]] = 0;
    }
    }

    /* ---------- Anti-aliasing: blur 3x3 + rampa para manter o traço firme ---------- */
    function suavizar(mask, w, h) {
    const tmp = new Uint8Array(w * h);
    const dst = new Uint8ClampedArray(w * h);

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
        dst[m + x] = ((media - 30) * 255) / 90;   // 30 → 0 e 120 → 255 (clamped)
        }
    }
    return dst;
    }

    /* ---------- Escrita final (1 número de 32 bits por pixel) ---------- */
    function escrever(px, tinta, n, transparente) {
    const out = new Uint32Array(px.buffer);
    for (let i = 0; i < n; i++) {
        const a = tinta[i];                  // 0 = fundo, 255 = tinta
        if (transparente) {
        out[i] = (a << 24) >>> 0;          // preto com alfa = quantidade de tinta
        } else {
        const v = 255 - a;
        out[i] = (0xFF000000 | (v << 16) | (v << 8) | v) >>> 0;
        }
    }
    }
}