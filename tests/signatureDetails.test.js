import test from "node:test";
import assert from "node:assert/strict";
import {
    addSignaturePhrase,
    buildSignatureDetails,
    formatCredential,
    removeSignaturePhrase,
    updateSignaturePhrase,
    validateSignatureFile,
} from "../utils/signatureDetails.js";

test("SD-01: aceita cada formato de imagem documentado", () => {
    for (const type of ["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp", "image/avif"]) {
        assert.equal(validateSignatureFile({ type, size: 1 }).valid, true, type);
    }
});

test("SD-02: aceita arquivo exatamente no limite de 12 MB", () => {
    assert.equal(validateSignatureFile({ type: "image/png", size: 12 * 1024 * 1024 }).valid, true);
});

test("SD-03: rejeita tipo não suportado e arquivo acima de 12 MB", () => {
    assert.deepEqual(validateSignatureFile({ type: "image/svg+xml", size: 1 }), {
        valid: false,
        title: "Formato de imagem inválido.",
        message: "Selecione uma imagem PNG, JPEG, WebP, GIF, BMP ou AVIF válida.",
    });
    assert.match(validateSignatureFile({ type: "image/png", size: 12 * 1024 * 1024 + 1 }).message, /12 MB/);
});

test("SD-04: formata registro padrão e remove sigla repetida", () => {
    assert.equal(formatCredential(" CRM: 12345 ", "CRM", "default"), "CRM: 12345");
    assert.equal(formatCredential("", "CRM", "default"), "");
});

test("SD-05: formato compacto usa estado informado ou RS como padrão", () => {
    assert.equal(formatCredential("CRM 12345/SC", "CRM", "compact"), "CRM/SC 12345");
    assert.equal(formatCredential("12345", "CRM", "compact"), "CRM/RS 12345");
});

test("SD-06: monta linhas na ordem de nome, registro, RQE, especialidade e frases", () => {
    const details = buildSignatureDetails({
        professionalName: "  Dra. Ana  ",
        credentialValue: "CRM 12345/RS",
        credentialLabel: "CRM",
        credentialFormat: "compact",
        includeRqe: true,
        rqeValue: "9988",
        rqeFormat: "default",
        includeSpecialty: true,
        specialty: "  Cardiologia  ",
        includeExtraPhrases: true,
        phrases: [{ value: "  Atendimento  " }, { value: "  " }, { value: "Retorno" }],
    });
    assert.deepEqual(details, [
        { text: "Dra. Ana", emphasis: true },
        { text: "CRM/RS 12345" },
        { text: "RQE: 9988" },
        { text: "Cardiologia" },
        { text: "Atendimento" },
        { text: "Retorno" },
    ]);
});

test("SD-07: omite campos desativados, vazios e frases extras não habilitadas", () => {
    assert.deepEqual(buildSignatureDetails({
        professionalName: " ",
        credentialValue: "",
        credentialLabel: "CRO",
        includeRqe: false,
        rqeValue: "123",
        includeSpecialty: false,
        specialty: "Odontologia",
        includeExtraPhrases: false,
        phrases: [{ value: "não exibir" }],
    }), []);
});

test("SD-08: adiciona frases com IDs crescentes e limita a cinco", () => {
    const first = addSignaturePhrase([]);
    const second = addSignaturePhrase(first);
    const afterRemoval = addSignaturePhrase([{ id: 1, value: "A" }, { id: 3, value: "C" }]);
    const full = Array.from({ length: 5 }, (_, index) => ({ id: index + 1, value: "" }));
    assert.deepEqual([first, second], [[{ id: 1, value: "" }], [{ id: 1, value: "" }, { id: 2, value: "" }]]);
    assert.equal(afterRemoval.at(-1).id, 4);
    assert.equal(addSignaturePhrase(full), full);
});

test("SD-09: atualiza só a frase escolhida e limita o texto a 120 caracteres", () => {
    const phrases = [{ id: 1, value: "A" }, { id: 2, value: "B" }];
    const updated = updateSignaturePhrase(phrases, 2, "X".repeat(140));
    assert.equal(updated[0], phrases[0]);
    assert.equal(updated[1].value.length, 120);
});

test("SD-10: remover uma frase mantém as demais; remover a última deixa campo vazio", () => {
    assert.deepEqual(removeSignaturePhrase([
        { id: 1, value: "A" },
        { id: 2, value: "B" },
    ], 1), [{ id: 2, value: "B" }]);
    assert.deepEqual(removeSignaturePhrase([{ id: 4, value: "Texto" }], 4), [{ id: 4, value: "" }]);
});
