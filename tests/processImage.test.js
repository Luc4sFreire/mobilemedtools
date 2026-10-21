import test from "node:test";
import assert from "node:assert/strict";
import { processImage } from "../utils/processImage.js";
import { installCanvasMocks, makeRgbaCanvas, MockCanvas } from "./helpers/browserMocks.js";

function whiteImage(width = 7, height = 7, pixelAt = () => [255, 255, 255, 255]) {
    return makeRgbaCanvas(width, height, pixelAt);
}

function squareInk(size = 3, options = {}) {
    const offset = Math.floor((7 - size) / 2);
    return whiteImage(7, 7, (x, y) => x >= offset && x < offset + size && y >= offset && y < offset + size
        ? [0, 0, 0, 255]
        : [255, 255, 255, 255]);
}

function countNonWhite(canvas) {
    let count = 0;
    for (let index = 0; index < canvas.pixels.length; index += 4) {
        if (canvas.pixels[index] < 250 || canvas.pixels[index + 1] < 250 || canvas.pixels[index + 2] < 250) count += 1;
    }
    return count;
}

function withCanvasMocks(t) {
    const mocks = installCanvasMocks();
    t.after(mocks.restore);
    return mocks;
}

test("IM-01: preserva dimensões originais quando não há redimensionamento", (t) => {
    withCanvasMocks(t);
    const canvas = squareInk();
    const result = processImage(canvas);
    assert.deepEqual([result.largura, result.altura], [7, 7]);
    assert.deepEqual([canvas.width, canvas.height], [7, 7]);
    assert.equal(Number.isInteger(result.limiar), true);
});

test("IM-02: usa largura e altura explícitas sem distorcer opções", (t) => {
    withCanvasMocks(t);
    const canvas = squareInk();
    const result = processImage(canvas, { largura: 14, altura: 9 });
    assert.deepEqual([result.largura, result.altura], [14, 9]);
    assert.equal(canvas.pixels.length, 14 * 9 * 4);
});

test("IM-03: calcula altura proporcional quando somente a largura é informada", (t) => {
    withCanvasMocks(t);
    const canvas = whiteImage(4, 2);
    const result = processImage(canvas, { largura: 10 });
    assert.deepEqual([result.largura, result.altura], [10, 5]);
});

test("IM-04: calcula largura proporcional quando somente a altura é informada", (t) => {
    withCanvasMocks(t);
    const canvas = whiteImage(2, 4);
    const result = processImage(canvas, { altura: 10 });
    assert.deepEqual([result.largura, result.altura], [5, 10]);
});

test("IM-05: arredonda dimensões decimais para pixels inteiros", (t) => {
    withCanvasMocks(t);
    const canvas = whiteImage(3, 2);
    const result = processImage(canvas, { largura: 8.4 });
    assert.deepEqual([result.largura, result.altura], [8, 5]);
});

test("IM-06: fallback de largura ou altura não positiva mantém proporção da origem", (t) => {
    withCanvasMocks(t);
    const canvas = whiteImage(6, 3);
    const result = processImage(canvas, { largura: -10, altura: 4 });
    assert.deepEqual([result.largura, result.altura], [8, 4]);
});

test("IM-07: conserva tinta escura e substitui o fundo por branco", (t) => {
    withCanvasMocks(t);
    const canvas = squareInk(1);
    processImage(canvas);
    const center = (3 * 7 + 3) * 4;
    const corner = 0;
    assert.deepEqual([...canvas.pixels.slice(center, center + 4)], [0, 0, 0, 255]);
    assert.deepEqual([...canvas.pixels.slice(corner, corner + 4)], [255, 255, 255, 255]);
});

test("IM-08: gera fundo transparente quando essa opção está ativada", (t) => {
    withCanvasMocks(t);
    const canvas = squareInk(1);
    processImage(canvas, { transparente: true });
    const center = (3 * 7 + 3) * 4;
    assert.equal(canvas.pixels[3], 0);
    assert.equal(canvas.pixels[center + 3], 255);
});

test("IM-09: compõe pixels de entrada semitransparentes sobre branco antes de segmentar", (t) => {
    withCanvasMocks(t);
    const canvas = whiteImage(3, 3, (x, y) => x === 1 && y === 1 ? [0, 0, 0, 0] : [255, 255, 255, 255]);
    processImage(canvas, { transparente: true });
    const center = (1 * 3 + 1) * 4;
    assert.equal(canvas.pixels[center + 3], 0);
});

test("IM-10: mantém fundo branco opaco quando a imagem de entrada já é toda branca", (t) => {
    withCanvasMocks(t);
    const canvas = whiteImage(2, 2);
    processImage(canvas);
    assert.deepEqual([...canvas.pixels], Array(16).fill(255));
});

test("IM-11: remoção do fundo não apaga uma linha de assinatura isolada", (t) => {
    withCanvasMocks(t);
    const canvas = whiteImage(9, 9, (x, y) => x === y ? [0, 0, 0, 255] : [255, 255, 255, 255]);
    processImage(canvas);
    assert.ok(countNonWhite(canvas) >= 7);
});

test("IM-12: espessura positiva dilata os traços", (t) => {
    withCanvasMocks(t);
    const normal = squareInk(3);
    const thick = squareInk(3);
    processImage(normal, { suavizar: false });
    processImage(thick, { suavizar: false, espessura: 1 });
    assert.ok(countNonWhite(thick) > countNonWhite(normal));
});

test("IM-13: espessura negativa afina os traços", (t) => {
    withCanvasMocks(t);
    const normal = squareInk(3);
    const thin = squareInk(3);
    processImage(normal, { suavizar: false });
    processImage(thin, { suavizar: false, espessura: -1 });
    assert.ok(countNonWhite(thin) < countNonWhite(normal));
});

test("IM-14: espessura fracionária produz ajuste gradual sem binarizar novamente", (t) => {
    withCanvasMocks(t);
    const canvas = squareInk(3);
    processImage(canvas, { suavizar: false, espessura: 0.5 });
    let partial = false;
    for (let offset = 0; offset < canvas.pixels.length; offset += 4) {
        const channel = canvas.pixels[offset];
        if (channel > 0 && channel < 255) partial = true;
    }
    assert.equal(partial, true);
});

test("IM-15: suavização mantém tons intermediários de borda em vez de saída binária", (t) => {
    withCanvasMocks(t);
    const levels = [0, 40, 70, 255];
    const edge = (x, y) => y === 39 && x >= 36
        ? [levels[x - 36], levels[x - 36], levels[x - 36], 255]
        : [255, 255, 255, 255];
    const input = whiteImage(40, 40, edge);
    const smoothed = whiteImage(40, 40, edge);
    processImage(input, { suavizar: false });
    processImage(smoothed, { suavizar: true });
    assert.notDeepEqual([...input.pixels], [...smoothed.pixels]);
});

test("IM-16: preto puro substitui a cor original da tinta", (t) => {
    withCanvasMocks(t);
    const canvas = whiteImage(3, 3, (x, y) => x === 1 && y === 1 ? [120, 20, 20, 255] : [255, 255, 255, 255]);
    processImage(canvas, { pretoPuro: true });
    const center = (1 * 3 + 1) * 4;
    assert.deepEqual([...canvas.pixels.slice(center, center + 3)], [0, 0, 0]);
});

test("IM-17: modo de cor original preserva a média tonal da tinta", (t) => {
    withCanvasMocks(t);
    const canvas = whiteImage(3, 3, (x, y) => x === 1 && y === 1 ? [0, 80, 180, 255] : [255, 255, 255, 255]);
    processImage(canvas, { pretoPuro: false });
    const center = (1 * 3 + 1) * 4;
    assert.deepEqual([...canvas.pixels.slice(center, center + 3)], [0, 80, 180]);
});

test("IM-18: normaliza dimensão de saída igual a zero como dimensão automática", (t) => {
    withCanvasMocks(t);
    const canvas = whiteImage(5, 3);
    const result = processImage(canvas, { largura: 0, altura: 6 });
    assert.deepEqual([result.largura, result.altura], [10, 6]);
});

test("IM-19: rejeita canvas sem contexto de desenho", (t) => {
    withCanvasMocks(t);
    const canvas = new MockCanvas(2, 2);
    canvas.contextAvailable = false;
    assert.throws(() => processImage(canvas), /Não foi possível preparar a imagem para processamento/);
});

test("IM-20: rejeita canvas com largura ou altura zero", (t) => {
    withCanvasMocks(t);
    assert.throws(() => processImage(new MockCanvas(0, 2)), /Não foi possível preparar a imagem para processamento/);
    assert.throws(() => processImage(new MockCanvas(2, 0)), /Não foi possível preparar a imagem para processamento/);
});

test("IM-21: rejeita mais de 36 milhões de pixels na origem antes de alocar o bitmap", (t) => {
    withCanvasMocks(t);
    const canvas = { width: 6001, height: 6000, getContext() { return { getImageData() { throw new Error("não deveria ler"); } }; } };
    assert.throws(() => processImage(canvas), /Imagem grande demais para processar/);
});

test("IM-22: rejeita saída acima de 36 milhões de pixels antes do redimensionamento", (t) => {
    withCanvasMocks(t);
    const canvas = { width: 10, height: 10, getContext() { return { getImageData() { throw new Error("não deveria ler"); } }; } };
    assert.throws(() => processImage(canvas, { largura: 6001, altura: 6000 }), /Imagem grande demais para processar/);
});

test("IM-23: limita espessura acima e abaixo do intervalo permitido", (t) => {
    withCanvasMocks(t);
    const positive = squareInk(3);
    const maxPositive = squareInk(3);
    const negative = squareInk(3);
    const maxNegative = squareInk(3);
    processImage(positive, { espessura: 10, suavizar: false });
    processImage(maxPositive, { espessura: 99, suavizar: false });
    processImage(negative, { espessura: -10, suavizar: false });
    processImage(maxNegative, { espessura: -99, suavizar: false });
    assert.deepEqual([...positive.pixels], [...maxPositive.pixels]);
    assert.deepEqual([...negative.pixels], [...maxNegative.pixels]);
});

test("IM-24: fallback de objeto vazio de opções corresponde aos padrões", (t) => {
    withCanvasMocks(t);
    const withoutOptions = squareInk(1);
    const emptyOptions = squareInk(1);
    processImage(withoutOptions);
    processImage(emptyOptions, {});
    assert.deepEqual([...withoutOptions.pixels], [...emptyOptions.pixels]);
});

test("IM-25: opção de fundo transparente normaliza valores booleanos", (t) => {
    withCanvasMocks(t);
    const canvas = squareInk(1);
    processImage(canvas, { transparente: 1 });
    assert.equal(canvas.pixels[3], 0);
});
