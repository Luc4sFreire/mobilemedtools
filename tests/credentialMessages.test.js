import test from "node:test";
import assert from "node:assert/strict";
import { formatCredentialList, formatCredentialMessages } from "../src/utils/credentialMessages.js";

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
        "Olá! Seguem os dados do seu acesso:\nE-mail: ana@example.com\nSenha: SenhaAna1"
        + "\n\nOlá! Seguem os dados do seu acesso:\nE-mail: bia@example.com\nSenha: SenhaBia1");
});

test("lista e mensagens aceitam coleção vazia", () => {
    assert.equal(formatCredentialList([]), "");
    assert.equal(formatCredentialMessages([]), "");
});
