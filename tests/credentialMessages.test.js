import test from "node:test";
import assert from "node:assert/strict";
import {
    CREDENTIAL_MESSAGE_PRESETS,
    DEFAULT_CREDENTIAL_MESSAGE,
    formatCredentialList,
    formatCredentialMessages,
} from "../src/utils/credentialMessages.js";

const users = [
    { email: "ana@example.com", password: "SenhaAna1" },
    { email: "bia@example.com", password: "SenhaBia1" },
];

test("lista de credenciais preserva a ordem e separa usuários", () => {
    assert.equal(formatCredentialList(users),
        "E-mail: ana@example.com\nSenha: SenhaAna1\n\nE-mail: bia@example.com\nSenha: SenhaBia1");
});

test("mensagens de entrega incluem credenciais individuais e preservam a ordem", () => {
    assert.equal(formatCredentialMessages(users),
        DEFAULT_CREDENTIAL_MESSAGE
            .replace("{email}", "ana@example.com")
            .replace("{password}", "SenhaAna1")
        + "\n\n"
        + DEFAULT_CREDENTIAL_MESSAGE
            .replace("{email}", "bia@example.com")
            .replace("{password}", "SenhaBia1"));
});

test("mensagens personalizadas posicionam e-mail e senha pelos marcadores", () => {
    assert.equal(formatCredentialMessages(users, "Senha: {password}\nOlá, {email}!"),
        "Senha: SenhaAna1\nOlá, ana@example.com!"
        + "\n\nSenha: SenhaBia1\nOlá, bia@example.com!");
});

test("mensagens sem marcadores acrescentam credenciais para não omitir os dados", () => {
    assert.equal(formatCredentialMessages(users, "Bem-vindo à equipe!"),
        "Bem-vindo à equipe!\nE-mail: ana@example.com\nSenha: SenhaAna1"
        + "\n\nBem-vindo à equipe!\nE-mail: bia@example.com\nSenha: SenhaBia1");
});

test("mensagens prontas são centralizadas por marca e incluem os marcadores", () => {
    assert.deepEqual(Object.keys(CREDENTIAL_MESSAGE_PRESETS), ["Mobilemed", "MobileVet", "Cuesta"]);
    for (const presets of Object.values(CREDENTIAL_MESSAGE_PRESETS)) {
        assert.ok(presets.length > 0);
        assert.ok(presets.every(({ text }) => text.includes("{email}") && text.includes("{password}")));
    }
});

test("lista e mensagens aceitam coleção vazia", () => {
    assert.equal(formatCredentialList([]), "");
    assert.equal(formatCredentialMessages([]), "");
});
