export const USERS_STORAGE_KEY = "mobilemedtools.savedUsers";

const LOAD_ERROR_MESSAGE = "Não foi possível carregar os usuários salvos deste navegador.";

function storageOrDefault(storage) {
    return storage ?? globalThis.localStorage;
}

export function loadSavedUsers(storage) {
    try {
        const savedUsers = storageOrDefault(storage).getItem(USERS_STORAGE_KEY);
        if (!savedUsers) return { users: [], errorMessage: "" };

        const parsedUsers = JSON.parse(savedUsers);
        if (!Array.isArray(parsedUsers) || parsedUsers.some(
            (user) => typeof user?.id !== "string"
                || typeof user.email !== "string"
                || typeof user.password !== "string"
        )) {
            throw new Error("O formato dos usuários salvos é inválido.");
        }

        return { users: parsedUsers, errorMessage: "" };
    } catch (error) {
        console.error("Não foi possível carregar os usuários salvos:", error);
        return { users: [], errorMessage: LOAD_ERROR_MESSAGE };
    }
}

export function persistSavedUsers(users, storage) {
    try {
        storageOrDefault(storage).setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        return true;
    } catch (error) {
        console.error("Não foi possível salvar os usuários localmente:", error);
        return false;
    }
}

export function saveSavedCredential(users, emailValue, password, options = {}) {
    const email = String(emailValue ?? "").trim();

    if (!email || !password) {
        return {
            success: false,
            title: "Informe o e-mail do usuário.",
            message: "Adicione um endereço de e-mail antes de salvar a senha.",
        };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return {
            success: false,
            title: "E-mail inválido.",
            message: "Confira o endereço informado e tente salvar novamente.",
        };
    }

    const existingUser = users.find(
        (user) => user.email.toLowerCase() === email.toLowerCase()
    );
    let user;
    try {
        const createId = options.createId ?? (() => globalThis.crypto.randomUUID());
        user = { id: existingUser?.id ?? createId(), email, password };
    } catch (error) {
        console.error("Não foi possível preparar o usuário para salvar:", error);
        return {
            success: false,
            title: "Não foi possível preparar o usuário.",
            message: "Atualize o navegador e tente novamente.",
        };
    }

    const nextUsers = existingUser
        ? users.map((item) => item.id === existingUser.id ? user : item)
        : [...users, user];

    if (!persistSavedUsers(nextUsers, options.storage)) {
        return {
            success: false,
            title: "Não foi possível salvar o usuário.",
            message: "O armazenamento do navegador está indisponível ou cheio.",
        };
    }

    return {
        success: true,
        users: nextUsers,
        title: existingUser ? "Usuário atualizado com sucesso!" : "Usuário salvo com sucesso!",
        message: existingUser
            ? "As credenciais foram atualizadas na lista salva deste navegador."
            : "As credenciais estão disponíveis na lista salva deste navegador.",
    };
}

export function removeSavedUser(users, userId, storage) {
    const nextUsers = users.filter((user) => user.id !== userId);
    return persistSavedUsers(nextUsers, storage)
        ? { success: true, users: nextUsers }
        : { success: false, users };
}

export function clearSavedUsers(storage) {
    return persistSavedUsers([], storage)
        ? { success: true, users: [] }
        : { success: false, users: undefined };
}
