import test from "node:test";
import assert from "node:assert/strict";
import { generatePassword } from "../utils/passwordGenerator.js";
import { installDeterministicCrypto, replaceGlobal } from "./helpers/browserMocks.js";

const characterSets = {
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    numbers: "0123456789",
    special: "!@#$&",
};

const groupCases = [
    { label: "padrão", options: {}, required: ["uppercase", "lowercase", "numbers"], allowed: ["uppercase", "lowercase", "numbers"] },
    { label: "somente maiúsculas", options: { onlyUpper: true }, required: ["uppercase", "numbers"], allowed: ["uppercase", "numbers"] },
    { label: "com especiais", options: { special: true }, required: ["uppercase", "lowercase", "numbers"], allowed: ["uppercase", "lowercase", "numbers", "special"] },
    { label: "maiúsculas e especiais", options: { onlyUpper: true, special: true }, required: ["uppercase", "numbers"], allowed: ["uppercase", "numbers", "special"] },
];

function includesGroup(value, group) {
    return [...characterSets[group]].some((character) => value.includes(character));
}

for (const size of [12, 13, 16, 24, 31, 32]) {
    for (const groupCase of groupCases) {
        test(`PW-MATRIX-${size}-${groupCase.label}: cumpre tamanho e grupos`, (t) => {
            const crypto = installDeterministicCrypto([0, 1, 2, 3, 4, 5, 6]);
            t.after(crypto.restore);
            const password = generatePassword({ size, ...groupCase.options });
            assert.equal(password.length, size);
            for (const required of groupCase.required) assert.equal(includesGroup(password, required), true);
            for (const character of password) {
                assert.equal(groupCase.allowed.some((group) => characterSets[group].includes(character)), true);
            }
        });
    }
}

const sizeCases = [
    [0, 16], [-10, 12], [11, 12], [12, 12], [32, 32], [33, 32], [65, 32],
    [NaN, 16], [Infinity, 32], ["inválido", 16], ["", 16], [null, 16], [14.5, 15], ["24", 24],
];
for (const [input, expected] of sizeCases) {
    test(`PW-SIZE-${String(input)}: limita ou normaliza a entrada para ${expected}`, (t) => {
        const crypto = installDeterministicCrypto();
        t.after(crypto.restore);
        assert.equal(generatePassword({ size: input }).length, expected);
    });
}

const prefixCases = [
    ["", "", 12],
    ["Equipe", "Equipe", 12],
    ["x".repeat(24), "x".repeat(24), 32],
    ["x".repeat(25), "x".repeat(24), 16],
    ["@time", "@time", 12],
    ["Equipe 1!", "Equipe 1!", 13],
    ["ç".repeat(12), "ç".repeat(12), 12],
    ["P", "P", 20],
];
prefixCases.forEach(([input, expectedPrefix, size], index) => {
    test(`PW-PREFIX-${index + 1}: mantém prefixo previsível limitado e separa o trecho aleatório`, (t) => {
        const crypto = installDeterministicCrypto();
        t.after(crypto.restore);
        const password = generatePassword({ prefix: input, size });
        const expected = expectedPrefix ? `${expectedPrefix}@` : "";
        assert.equal(password.startsWith(expected), true);
        assert.equal(password.slice(expected.length).length, size);
    });
});

for (const size of [12, 20, 32]) {
    for (const prefix of ["", "Time", "x".repeat(24)]) {
        for (const groupCase of groupCases) {
            test(`PW-CROSS-${size}-${prefix.length}-${groupCase.label}: combina prefixo, tamanho e grupos`, (t) => {
                const crypto = installDeterministicCrypto([3, 1, 4, 1, 5, 9]);
                t.after(crypto.restore);
                const password = generatePassword({ prefix, size, ...groupCase.options });
                const randomPart = prefix ? password.slice(Math.min(prefix.length, 24) + 1) : password;
                assert.equal(randomPart.length, size);
                assert.equal(password.startsWith(prefix ? `${prefix.slice(0, 24)}@` : ""), true);
                for (const required of groupCase.required) assert.equal(includesGroup(randomPart, required), true);
            });
        }
    }
}

test("PW-ERROR-01: falha claramente quando Web Crypto não existe", (t) => {
    const restore = replaceGlobal("crypto", undefined);
    t.after(restore);
    assert.throws(() => generatePassword(), /geração aleatória segura não está disponível/i);
});

test("PW-ERROR-02: propaga falha da API segura do navegador", (t) => {
    const restore = replaceGlobal("crypto", { getRandomValues() { throw new Error("bloqueado"); } });
    t.after(restore);
    assert.throws(() => generatePassword(), /bloqueado/);
});

test("PW-RANDOM-01: descarta valores fora da faixa para evitar viés de módulo", (t) => {
    const values = [0xffffffff, 0];
    let calls = 0;
    const restore = replaceGlobal("crypto", {
        getRandomValues(buffer) {
            buffer[0] = values[Math.min(calls, values.length - 1)];
            calls += 1;
            return buffer;
        },
    });
    t.after(restore);
    const password = generatePassword({ size: 12, onlyUpper: true });
    assert.equal(password.length, 12);
    assert.ok(calls > 12, "o valor rejeitado deve causar uma nova chamada aleatória");
});

test("PW-DEFAULT-01: sem argumentos usa tamanho padrão e regras padrão", (t) => {
    const crypto = installDeterministicCrypto();
    t.after(crypto.restore);
    const password = generatePassword();
    assert.equal(password.length, 16);
    for (const group of ["uppercase", "lowercase", "numbers"]) assert.equal(includesGroup(password, group), true);
    assert.equal(includesGroup(password, "special"), false);
});
