import test from "node:test";
import assert from "node:assert/strict";
import { composeSignature } from "../src/utils/composeSignature.js";
import { buildCredentialRows, downloadCredentials, readCredentialFile } from "../src/utils/credentialFiles.js";
import {
    createAutomaticLogo,
    createLogoZip,
    createManualLogo,
    sanitizeLogoFilename,
} from "../src/utils/logoGenerator.js";
import { generatePassword } from "../src/utils/passwordGenerator.js";
import { processImage } from "../src/utils/processImage.js";
import {
    installCanvasMocks,
    installDeterministicCrypto,
    installDownloadMocks,
    makeFile,
    makeRgbaCanvas,
    MockCanvas,
    replaceGlobal,
} from "./helpers/browserMocks.js";

const characterSets = {
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    numbers: "0123456789",
    special: "!@#$&",
};

const passwordCases = [
    { label: "padrão", options: {}, required: ["uppercase", "lowercase", "numbers"], allowed: ["uppercase", "lowercase", "numbers"] },
    { label: "somente maiúsculas", options: { onlyUpper: true }, required: ["uppercase", "numbers"], allowed: ["uppercase", "numbers"] },
    { label: "caracteres especiais", options: { special: true }, required: ["uppercase", "lowercase", "numbers", "special"], allowed: ["uppercase", "lowercase", "numbers", "special"] },
    { label: "maiúsculas e especiais", options: { onlyUpper: true, special: true }, required: ["uppercase", "numbers", "special"], allowed: ["uppercase", "numbers", "special"] },
];

for (const size of [4, 8, 16, 32]) {
    for (const scenario of passwordCases) {
        test(`senha ${scenario.label}: respeita tamanho e grupos em ${size} caracteres`, (t) => {
            const crypto = installDeterministicCrypto([0, 1, 2, 3, 4, 5, 6]);
            t.after(crypto.restore);
            const password = generatePassword({ prefix: "", size, ...scenario.options });
            assert.equal(password.length, size);
            for (const group of scenario.required) {
                assert.equal([...characterSets[group]].some((character) => password.includes(character)), true);
            }
            for (const character of password) {
                assert.equal(scenario.allowed.some((group) => characterSets[group].includes(character)), true);
            }
        });
    }
}

test("senha mantém o prefixo previsível fora do tamanho aleatório", (t) => {
    const crypto = installDeterministicCrypto();
    t.after(crypto.restore);
    const password = generatePassword({ prefix: "Mobile" });
    assert.equal(password.startsWith("Mobile@"), true);
    assert.equal(password.slice("Mobile@".length).length, 8);
});

test("senha limita o tamanho e o prefixo aos intervalos documentados", (t) => {
    const crypto = installDeterministicCrypto();
    t.after(crypto.restore);
    const password = generatePassword({ prefix: "x".repeat(30), size: 90 });
    assert.equal(password.slice(0, 24), "x".repeat(24));
    assert.equal(password.slice(25).length, 32);
});

test("senha rejeita valores aleatórios fora do intervalo sem viés de módulo", (t) => {
    const crypto = installDeterministicCrypto([0xffffffff, 0]);
    t.after(crypto.restore);
    generatePassword({ prefix: "", size: 4, onlyUpper: true });
    assert.ok(crypto.calls > 4);
});

test("senha falha claramente quando Web Crypto não está disponível", (t) => {
    const restore = replaceGlobal("crypto", undefined);
    t.after(restore);
    assert.throws(() => generatePassword(), /geração aleatória segura não está disponível/i);
});

test("CSV reconhece o cabeçalho e mantém valores e linha de origem", async () => {
    const sheet = await readCredentialFile(makeFile({
        text: "Nome,Correio Eletrônico\nAna,ana@example.com\nBia,bia@example.com",
    }));
    assert.equal(sheet.emailColumn, 1);
    assert.equal(sheet.rows.length, 2);
    assert.equal(sheet.rows[0].sourceRow, 2);
    assert.deepEqual(sheet.rows[0].values.slice(0, 2), ["Ana", "ana@example.com"]);
});

test("CSV sem cabeçalho retém e sinaliza o primeiro endereço malformado", async (t) => {
    const crypto = installDeterministicCrypto();
    t.after(crypto.restore);
    const sheet = await readCredentialFile(makeFile({ text: "inválido@\nana@example.com" }));
    const rows = buildCredentialRows(sheet, sheet.emailColumn, { prefix: "", size: 8 });
    assert.deepEqual(rows.map((row) => row.status), ["invalid", "generated"]);
    assert.deepEqual(rows.map((row) => row.sourceRow), [1, 2]);
});

test("CSV com coluna de e-mail após o limite de 100 colunas apresenta erro claro", async () => {
    const headers = Array.from({ length: 101 }, (_, index) => index === 100 ? "Email" : `Campo ${index}`);
    const values = Array.from({ length: 101 }, (_, index) => index === 100 ? "ana@example.com" : `valor ${index}`);
    const text = `${headers.join(",")}\n${values.join(",")}`;
    await assert.rejects(readCredentialFile(makeFile({ text })), /após o limite de 100 colunas/i);
});

test("importador rejeita arquivo vazio, formato desconhecido e arquivo acima de 10 MB", async () => {
    await assert.rejects(readCredentialFile(null), /Selecione um arquivo/);
    await assert.rejects(readCredentialFile(makeFile({ name: "lista.txt", text: "dados" })), /CSV ou XLSX/);
    await assert.rejects(readCredentialFile(makeFile({ name: "lista.csv", size: 10 * 1024 * 1024 + 1 })), /10 MB/);
});

test("planilha XLSX lê a primeira aba e encontra a coluna pelo cabeçalho", async () => {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
        ["Nome", "E-mail"], ["Ana", "ana@example.com"],
    ]), "Equipe");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["E-mail"], ["outro@example.com"]]), "Outra");
    const bytes = new Uint8Array(XLSX.write(workbook, { bookType: "xlsx", type: "array" }));
    const sheet = await readCredentialFile(makeFile({ name: "lista.xlsx", bytes }));
    assert.equal(sheet.sheetName, "Equipe");
    assert.equal(sheet.emailColumn, 1);
    assert.equal(sheet.rows[0].values[1], "ana@example.com");
});

test("credenciais marcam todas as ocorrências duplicadas sem diferenciar maiúsculas", (t) => {
    const crypto = installDeterministicCrypto();
    t.after(crypto.restore);
    const rows = buildCredentialRows({ rows: [
        { sourceRow: 2, values: ["ana@example.com"] },
        { sourceRow: 3, values: ["ANA@EXAMPLE.COM"] },
        { sourceRow: 4, values: ["bia@example.com"] },
        { sourceRow: 5, values: ["endereço inválido"] },
    ] }, 0, { prefix: "Equipe", size: 8 });
    assert.deepEqual(rows.map((row) => row.status), ["duplicate", "duplicate", "generated", "invalid"]);
    assert.equal(rows[0].password, "");
    assert.equal(rows[2].password.startsWith("Equipe@"), true);
});

test("exportação CSV protege fórmulas e escapa aspas e delimitadores", async (t) => {
    const browser = installDownloadMocks();
    t.after(browser.restore);
    await downloadCredentials([
        { email: "=cmd@example.com", password: "senha,\"forte\"" },
        { email: "bia@example.com", password: "+executável" },
    ], "csv", "credenciais");
    const blob = browser.blobs.get(browser.clicks[0].href);
    const text = await blob.text();
    assert.equal(browser.clicks[0].download, "credenciais.csv");
    assert.deepEqual([...new Uint8Array(await blob.arrayBuffer()).slice(0, 3)], [0xef, 0xbb, 0xbf]);
    assert.match(text, /'=cmd@example\.com/);
    assert.match(text, /"senha,""forte"""/);
    assert.match(text, /"'\+executável"/);
});

test("exportação Markdown escapa barras, pipes e quebras de linha", async (t) => {
    const browser = installDownloadMocks();
    t.after(browser.restore);
    await downloadCredentials([
        { email: "ana|bia@example.com", password: "linha\\um\nlinha|dois" },
    ], "md", "credenciais");
    const text = await browser.blobs.get(browser.clicks[0].href).text();
    assert.match(text, /ana\\\|bia@example\.com/);
    assert.match(text, /linha\\\\um linha\\\|dois/);
});

test("exportação XLSX produz uma planilha que pode ser lida novamente", async (t) => {
    const browser = installDownloadMocks();
    t.after(browser.restore);
    await downloadCredentials([{ email: "ana@example.com", password: "SenhaA1" }], "xlsx", "lote");
    const blob = browser.blobs.get(browser.clicks[0].href);
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(await blob.arrayBuffer(), { type: "array" });
    assert.deepEqual(XLSX.utils.sheet_to_json(workbook.Sheets.Credenciais, { header: 1 }), [
        ["E-mail", "Senha"], ["ana@example.com", "SenhaA1"],
    ]);
});

function makeInkCanvas(size = 7) {
    return makeRgbaCanvas(size, size, (x, y) => (
        x >= 2 && x <= 4 && y >= 2 && y <= 4
            ? [0, 0, 0, 255]
            : [255, 255, 255, 255]
    ));
}

test("processador mantém a tinta e remove o papel com fundo transparente", (t) => {
    const mocks = installCanvasMocks();
    t.after(mocks.restore);
    const canvas = makeInkCanvas();
    processImage(canvas, { transparente: true, suavizar: false });
    const centerOffset = (3 * canvas.width + 3) * 4;
    assert.equal(canvas.pixels[centerOffset + 3], 255);
    assert.equal(canvas.pixels[3], 0);
});

test("processador preserva proporção ao definir somente a largura de saída", (t) => {
    const mocks = installCanvasMocks();
    t.after(mocks.restore);
    const canvas = makeRgbaCanvas(4, 2, () => [255, 255, 255, 255]);
    const result = processImage(canvas, { largura: 10 });
    assert.deepEqual([result.largura, result.altura], [10, 5]);
    assert.equal(canvas.pixels.length, 10 * 5 * 4);
});

test("processador rejeita canvas sem contexto 2D", (t) => {
    const mocks = installCanvasMocks();
    t.after(mocks.restore);
    const canvas = new MockCanvas(2, 2);
    canvas.contextAvailable = false;
    assert.throws(() => processImage(canvas), /Não foi possível preparar a imagem/);
});

function installSignatureMocks(t, { imageError = false, noContext = false } = {}) {
    const draws = [];
    const textDraws = [];
    let outputCanvas;
    class FakeImage {
        set src(value) {
            this._src = value;
            Promise.resolve().then(() => {
                if (imageError) this.onerror?.();
                else {
                    this.naturalWidth = 100;
                    this.naturalHeight = 50;
                    this.onload?.();
                }
            });
        }
    }
    const context = {
        font: "400 11px Arial, sans-serif",
        scale() {},
        fillRect() {},
        drawImage(...args) { draws.push(args); },
        measureText(value) {
            const size = Number(/([\d.]+)px/.exec(this.font)?.[1] ?? 11);
            return { width: String(value).length * size * 0.6 };
        },
        fillText(...args) { textDraws.push({ font: this.font, align: this.textAlign, args }); },
    };
    class FakeCanvas {
        constructor() {
            this.width = 0;
            this.height = 0;
            outputCanvas = this;
        }
        getContext() { return noContext ? null : context; }
        toBlob(callback, type) { callback(new Blob(["png"], { type })); }
    }
    const restoreImage = replaceGlobal("Image", FakeImage);
    const restoreDocument = replaceGlobal("document", { createElement: () => new FakeCanvas() });
    t.after(() => { restoreImage(); restoreDocument(); });
    return { draws, textDraws, get canvas() { return outputCanvas; } };
}

test("compositor gera PNG 4× com fundo branco", async (t) => {
    const mocks = installSignatureMocks(t);
    const blob = await composeSignature("blob:assinatura", []);
    assert.equal(blob.type, "image/png");
    assert.deepEqual([mocks.canvas.width, mocks.canvas.height], [1680, 480]);
    assert.equal(mocks.draws.length, 1);
});

test("compositor centraliza texto, destaca o nome e limita o espaço da imagem", async (t) => {
    const mocks = installSignatureMocks(t);
    await composeSignature("blob:assinatura", [
        { text: "Dra. Ana", emphasis: true },
        { text: "CRM 123" },
    ]);
    assert.equal(mocks.textDraws.length, 2);
    assert.match(mocks.textDraws[0].font, /^700 14px/);
    assert.match(mocks.textDraws[1].font, /^400 11px/);
    assert.equal(mocks.textDraws.every((item) => item.align === "center" && item.args[1] === 210), true);
});

test("compositor falha quando a imagem fonte não pode ser carregada", async (t) => {
    installSignatureMocks(t, { imageError: true });
    await assert.rejects(composeSignature("blob:quebrado", []), /Não foi possível carregar a assinatura processada/);
});

test("compositor falha quando a composição excede a altura disponível", async (t) => {
    installSignatureMocks(t);
    const details = Array.from({ length: 100 }, () => ({ text: "Informação extensa" }));
    await assert.rejects(composeSignature("blob:assinatura", details), /texto demais para caber/i);
});

function installLogoCanvasMocks(t, bitmap = null) {
    const canvases = [];
    const textDraws = [];
    const restoreDocument = replaceGlobal("document", {
        createElement(tagName) {
            if (tagName !== "canvas") throw new Error(`Elemento inesperado: ${tagName}`);
            const canvas = new MockCanvas(0, 0);
            canvas.toBlob = (callback, type) => callback(new Blob(["png"], { type }));
            canvas.toDataURL = () => "data:image/png;base64,dGVzdA==";
            canvas.context.fillRect = () => {};
            canvas.context.measureText = (value) => {
                const size = Number(/([\d.]+)px/.exec(canvas.context.font ?? "")?.[1] ?? 17);
                return { width: [...String(value)].length * size * 0.6 };
            };
            canvas.context.fillText = (value) => textDraws.push(String(value));
            canvases.push(canvas);
            return canvas;
        },
    });
    t.after(restoreDocument);
    if (bitmap) {
        const restoreBitmap = replaceGlobal("createImageBitmap", async () => bitmap);
        t.after(restoreBitmap);
    }
    return { canvases, textDraws };
}

test("logo manual cria PNG e mostra as iniciais em modo abreviado", async (t) => {
    const mocks = installLogoCanvasMocks(t);
    const result = await createManualLogo({
        name: "Clínica Móvel Med",
        displayMode: "abbreviation",
        palette: { background: "#123456" },
    });
    assert.equal(result.blob.type, "image/png");
    assert.match(result.previewUrl, /^data:image\/png/);
    assert.deepEqual(mocks.textDraws, ["CMM"]);
    assert.deepEqual([mocks.canvases[0].width, mocks.canvases[0].height], [200, 200]);
});

test("logo automático remove o fundo conectado à borda e fecha a imagem decodificada", async (t) => {
    const pixels = new Uint8ClampedArray(5 * 5 * 4);
    for (let index = 0; index < 25; index += 1) {
        pixels.set([255, 255, 255, 255], index * 4);
    }
    pixels.set([20, 80, 160, 255], (2 * 5 + 2) * 4);
    let closed = false;
    const bitmap = { width: 5, height: 5, pixels, close() { closed = true; } };
    const mocks = installLogoCanvasMocks(t, bitmap);
    const result = await createAutomaticLogo(makeFile({ name: "logo.png", text: "image" }), 42);
    const sourcePixels = mocks.canvases[0].pixels;
    assert.equal(result.blob.type, "image/png");
    assert.equal(sourcePixels[3], 0);
    assert.equal(sourcePixels[(2 * 5 + 2) * 4 + 3], 255);
    assert.equal(closed, true);
});

test("ZIP de logos contém assinatura válida, um arquivo e diretório central", async () => {
    const archive = await createLogoZip([{
        fileName: "clinica.png",
        blob: new Blob(["imagem"], { type: "image/png" }),
    }]);
    const bytes = new Uint8Array(await archive.arrayBuffer());
    const view = new DataView(bytes.buffer);
    assert.equal(archive.type, "application/zip");
    assert.equal(view.getUint32(0, true), 0x04034b50);
    assert.equal(view.getUint32(bytes.length - 22, true), 0x06054b50);
    assert.equal(view.getUint16(bytes.length - 14, true), 1);
});

test("nome de arquivo de logo remove acentos e caracteres de caminho", () => {
    assert.equal(sanitizeLogoFilename("Clínica / São José"), "Clinica-Sao-Jose");
    assert.equal(sanitizeLogoFilename("../"), "logo");
});
