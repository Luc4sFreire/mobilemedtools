import test from "node:test";
import assert from "node:assert/strict";
import { composeSignature } from "../src/utils/composeSignature.js";
import { replaceGlobal } from "./helpers/browserMocks.js";

function installSignatureMocks({ imageWidth = 100, imageHeight = 50, imageError = false, noContext = false, emptyBlob = false } = {}) {
    const draws = [];
    const textDraws = [];
    const fills = [];
    let outputCanvas;

    class FakeImage {
        set src(value) {
            this._src = value;
            queueMicrotask(() => {
                if (imageError) this.onerror?.();
                else {
                    this.naturalWidth = imageWidth;
                    this.naturalHeight = imageHeight;
                    this.onload?.();
                }
            });
        }
        get src() { return this._src; }
    }

    const context = {
        font: "400 11px Arial, sans-serif",
        scale(...args) { this.scaleArgs = args; },
        fillRect(...args) { fills.push({ color: this.fillStyle, args }); },
        drawImage(...args) { draws.push(args); },
        measureText(text) {
            const fontSize = Number(/([\d.]+)px/.exec(this.font)?.[1] ?? 11);
            return { width: String(text).length * fontSize * 0.6 };
        },
        fillText(...args) { textDraws.push({ font: this.font, align: this.textAlign, args }); },
    };
    class FakeCanvas {
        constructor() {
            this.context = noContext ? null : context;
            this.width = 0;
            this.height = 0;
            outputCanvas = this;
        }
        getContext() { return this.context; }
        toBlob(callback, type) {
            this.blobType = type;
            callback(emptyBlob ? null : new Blob(["png"], { type }));
        }
    }

    const restoreImage = replaceGlobal("Image", FakeImage);
    const restoreDocument = replaceGlobal("document", { createElement: () => new FakeCanvas() });
    return {
        draws,
        textDraws,
        fills,
        get canvas() { return outputCanvas; },
        restore() { restoreImage(); restoreDocument(); },
    };
}

function installForTest(t, options) {
    const mocks = installSignatureMocks(options);
    t.after(mocks.restore);
    return mocks;
}

test("CS-01: compõe PNG 3× no tamanho final, com fundo branco por padrão", async (t) => {
    const mocks = installForTest(t);
    const blob = await composeSignature("blob:assinatura", []);
    assert.equal(blob.type, "image/png");
    assert.equal(mocks.canvas.width, 1260);
    assert.equal(mocks.canvas.height, 360);
    assert.deepEqual(mocks.fills[0], { color: "#ffffff", args: [0, 0, 420, 120] });
    assert.equal(mocks.draws.length, 1);
});

test("CS-02: fundo transparente não recebe retângulo opaco", async (t) => {
    const mocks = installForTest(t);
    await composeSignature("blob:assinatura", [], { transparente: true });
    assert.equal(mocks.fills.length, 0);
});

const scaleCases = [[50, 50], [100, 100], [200, 200], [0, 100], [500, 200], [-10, 50]];
for (const [input, normalized] of scaleCases) {
    test(`CS-SCALE-${input}: limita escala de imagem ao intervalo suportado`, async (t) => {
        const mocks = installForTest(t);
        await composeSignature("blob:assinatura", [], { escala: input });
        const [, , , width, height] = mocks.draws[0];
        assert.equal(width, normalized);
        assert.equal(height, normalized / 2);
    });
}

test("CS-03: desenha linhas centralizadas e aplica negrito apenas ao detalhe enfatizado", async (t) => {
    const mocks = installForTest(t);
    await composeSignature("blob:assinatura", [
        { text: "Dra. Ana", emphasis: true },
        { text: "CRM/RS 123" },
    ]);
    assert.equal(mocks.textDraws.length, 2);
    assert.match(mocks.textDraws[0].font, /^700 14px/);
    assert.match(mocks.textDraws[1].font, /^400 11px/);
    assert.equal(mocks.textDraws.every((item) => item.align === "center" && item.args[1] === 210), true);
});

test("CS-04: respeita quebras de parágrafo explícitas e espaços repetidos", async (t) => {
    const mocks = installForTest(t);
    await composeSignature("blob:assinatura", [{ text: "  CRM   123\nCRO 456  " }]);
    assert.deepEqual(mocks.textDraws.map((item) => item.args[0]), ["CRM 123", "CRO 456"]);
});

test("CS-05: fragmenta palavras longas para que cada linha caiba na largura útil", async (t) => {
    const mocks = installForTest(t);
    const word = "X".repeat(120);
    await composeSignature("blob:assinatura", [{ text: word }]);
    const fragments = mocks.textDraws.map((item) => item.args[0]);
    assert.ok(fragments.length > 1);
    assert.equal(fragments.join(""), word);
    assert.equal(fragments.every((fragment) => fragment.length * 11 * 0.6 <= 400), true);
});

test("CS-06: reduz tipografia quando o conteúdo fica alto, preservando todas as linhas", async (t) => {
    const mocks = installForTest(t);
    const details = Array.from({ length: 8 }, (_, index) => ({ text: `Registro profissional ${index + 1}` }));
    await composeSignature("blob:assinatura", details);
    assert.equal(mocks.textDraws.length, 8);
    assert.equal(mocks.textDraws.every((item) => item.font.includes("4.95px")), true);
});

test("CS-07: reporta erro se o texto não couber nem na escala tipográfica mínima", async (t) => {
    installForTest(t);
    await assert.rejects(
        composeSignature("blob:assinatura", Array.from({ length: 100 }, () => ({ text: "Informação extensa" }))),
        /texto demais para caber/i,
    );
});

test("CS-08: não desenha texto quando a lista de detalhes está vazia", async (t) => {
    const mocks = installForTest(t);
    await composeSignature("blob:assinatura", []);
    assert.equal(mocks.textDraws.length, 0);
});

test("CS-09: devolve erro quando a imagem de entrada não carrega", async (t) => {
    installForTest(t, { imageError: true });
    await assert.rejects(composeSignature("blob:quebrado", []), /Não foi possível carregar a assinatura processada/);
});

test("CS-10: devolve erro quando o canvas não oferece contexto 2D", async (t) => {
    installForTest(t, { noContext: true });
    await assert.rejects(composeSignature("blob:assinatura", []), /Não foi possível preparar a imagem final/);
});

test("CS-11: devolve erro quando o navegador não consegue codificar o Blob final", async (t) => {
    installForTest(t, { emptyBlob: true });
    await assert.rejects(composeSignature("blob:assinatura", []), /Não foi possível gerar a imagem final/);
});
