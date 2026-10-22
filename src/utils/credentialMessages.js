export function formatCredentialList(users) {
    return users
        .map(({ email, password }) => `E-mail: ${email}\nSenha: ${password}`)
        .join("\n\n");
}

export function formatCredentialMessages(users) {
    return users
        .map(({ email, password }) => `Olá! Seguem os dados do seu acesso:\nE-mail: ${email}\nSenha: ${password}`)
        .join("\n\n");
}
