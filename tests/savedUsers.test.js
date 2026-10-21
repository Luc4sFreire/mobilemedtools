import test from "node:test";
import assert from "node:assert/strict";
import {
    clearSavedUsers,
    loadSavedUsers,
    persistSavedUsers,
    removeSavedUser,
    saveSavedCredential,
    USERS_STORAGE_KEY,
} from "../utils/savedUsers.js";

function createStorage(initialValue = null) {
    const values = new Map(initialValue === null ? [] : [[USERS_STORAGE_KEY, initialValue]]);
    return {
        getItem(key) { return values.get(key) ?? null; },
        setItem(key, value) { values.set(key, String(value)); },
        values,
    };
}

test("SU-01: carrega lista vazia quando ainda não há credenciais salvas", () => {
    assert.deepEqual(loadSavedUsers(createStorage()), { users: [], errorMessage: "" });
});

test("SU-02: carrega credenciais válidas do localStorage", () => {
    const users = [{ id: "u1", email: "ana@example.com", password: "SenhaA1" }];
    assert.deepEqual(loadSavedUsers(createStorage(JSON.stringify(users))), { users, errorMessage: "" });
});

test("SU-03: descarta dados malformados sem impedir o restante da aplicação", () => {
    const originalError = console.error;
    console.error = () => {};
    try {
        for (const value of ["{", JSON.stringify({ id: "u1" }), JSON.stringify([null])]) {
            const result = loadSavedUsers(createStorage(value));
            assert.deepEqual(result, {
                users: [],
                errorMessage: "Não foi possível carregar os usuários salvos deste navegador.",
            });
        }
    } finally {
        console.error = originalError;
    }
});

test("SU-04: informa indisponibilidade do armazenamento ao carregar", () => {
    const originalError = console.error;
    console.error = () => {};
    try {
        assert.match(loadSavedUsers({ getItem() { throw new Error("blocked"); } }).errorMessage, /não foi possível carregar/i);
    } finally {
        console.error = originalError;
    }
});

test("SU-05: salva credencial com e-mail normalizado e ID estável", () => {
    const storage = createStorage();
    const result = saveSavedCredential([], "  Ana@example.com  ", "SenhaA1", {
        storage,
        createId: () => "user-1",
    });
    assert.equal(result.success, true);
    assert.deepEqual(result.users, [{ id: "user-1", email: "Ana@example.com", password: "SenhaA1" }]);
    assert.deepEqual(JSON.parse(storage.getItem(USERS_STORAGE_KEY)), result.users);
});

test("SU-06: atualiza e-mail duplicado sem diferenciar maiúsculas e mantém o ID", () => {
    const current = [
        { id: "user-1", email: "ana@example.com", password: "SenhaAntiga1" },
        { id: "user-2", email: "bia@example.com", password: "SenhaBia1" },
    ];
    const result = saveSavedCredential(current, "ANA@example.com", "SenhaNova1", {
        storage: createStorage(),
        createId: () => assert.fail("não deve criar outro ID ao atualizar"),
    });
    assert.equal(result.success, true);
    assert.deepEqual(result.users, [
        { id: "user-1", email: "ANA@example.com", password: "SenhaNova1" },
        current[1],
    ]);
    assert.match(result.title, /atualizado/i);
});

test("SU-07: rejeita e-mail ausente, senha ausente e endereço inválido", () => {
    const options = { storage: createStorage(), createId: () => "never-used" };
    assert.match(saveSavedCredential([], " ", "SenhaA1", options).title, /informe o e-mail/i);
    assert.match(saveSavedCredential([], "ana@example.com", "", options).title, /informe o e-mail/i);
    assert.match(saveSavedCredential([], "ana.example.com", "SenhaA1", options).title, /e-mail inválido/i);
});

test("SU-08: informa falha se o navegador não consegue gerar um ID", () => {
    const originalError = console.error;
    console.error = () => {};
    try {
        const result = saveSavedCredential([], "ana@example.com", "SenhaA1", {
            storage: createStorage(),
            createId() { throw new Error("crypto unavailable"); },
        });
        assert.equal(result.success, false);
        assert.match(result.title, /preparar o usuário/i);
    } finally {
        console.error = originalError;
    }
});

test("SU-09: não confirma credencial quando o armazenamento falha", () => {
    const originalError = console.error;
    console.error = () => {};
    try {
        const result = saveSavedCredential([], "ana@example.com", "SenhaA1", {
            storage: { setItem() { throw new Error("quota exceeded"); } },
            createId: () => "user-1",
        });
        assert.equal(result.success, false);
        assert.match(result.title, /não foi possível salvar/i);
    } finally {
        console.error = originalError;
    }
});

test("SU-10: remove usuário pelo ID e persiste a lista restante", () => {
    const storage = createStorage();
    const users = [
        { id: "u1", email: "ana@example.com", password: "SenhaA1" },
        { id: "u2", email: "bia@example.com", password: "SenhaB1" },
    ];
    const result = removeSavedUser(users, "u1", storage);
    assert.deepEqual(result, { success: true, users: [users[1]] });
    assert.deepEqual(JSON.parse(storage.getItem(USERS_STORAGE_KEY)), [users[1]]);
});

test("SU-11: mantém a lista em memória quando a remoção não pode ser persistida", () => {
    const users = [{ id: "u1", email: "ana@example.com", password: "SenhaA1" }];
    const originalError = console.error;
    console.error = () => {};
    try {
        assert.deepEqual(removeSavedUser(users, "u1", { setItem() { throw new Error("blocked"); } }), {
            success: false,
            users,
        });
    } finally {
        console.error = originalError;
    }
});

test("SU-12: limpa e persiste a lista vazia", () => {
    const storage = createStorage(JSON.stringify([{ id: "u1", email: "ana@example.com", password: "SenhaA1" }]));
    assert.deepEqual(clearSavedUsers(storage), { success: true, users: [] });
    assert.equal(storage.getItem(USERS_STORAGE_KEY), "[]");
});

test("SU-13: persistSavedUsers serializa a lista e retorna falha de escrita", () => {
    const storage = createStorage();
    const users = [{ id: "u1", email: "ana@example.com", password: "SenhaA1" }];
    assert.equal(persistSavedUsers(users, storage), true);
    assert.deepEqual(JSON.parse(storage.getItem(USERS_STORAGE_KEY)), users);

    const originalError = console.error;
    console.error = () => {};
    try {
        assert.equal(persistSavedUsers(users, { setItem() { throw new Error("blocked"); } }), false);
    } finally {
        console.error = originalError;
    }
});
