import test from "node:test";
import assert from "node:assert/strict";
import { formatCredentialList, formatCredentialMessages } from "../utils/credentialMessages.js";

const users = [
    { email: "ana@example.com", password: "SenhaAna1" },
    { email: "bia@example.com", password: "SenhaBia1" },
];

test("CM-01: formata lista de credenciais em ordem, com linha em branco entre usuários", () => {
    assert.equal(formatCredentialList(users),
        "E-mail: ana@example.com\nSenha: SenhaAna1\n\nE-mail: bia@example.com\nSenha: SenhaBia1");
});

test("CM-02: prepara mensagens individuais para cada usuário", () => {
    assert.equal(formatCredentialMessages(users),
        "Olá! Seguem os dados do seu acesso:\nE-mail: ana@example.com\nSenha: SenhaAna1"
        + "\n\nOlá! Seguem os dados do seu acesso:\nE-mail: bia@example.com\nSenha: SenhaBia1");
});

test("CM-03: formatos de lista e mensagem aceitam uma lista vazia", () => {
    assert.equal(formatCredentialList([]), "");
    assert.equal(formatCredentialMessages([]), "");
});
