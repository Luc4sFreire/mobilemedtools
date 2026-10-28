export const DEFAULT_CREDENTIAL_MESSAGE = "Usuário(s) cadastrado(s) com sucesso! Segue abaixo as informações necessárias para o seu primeiro acesso.\n\nPortal: laudos.mobilemed.com.br/login\nLogin: {email}\nSenha Temporária: {password} (Favor alterar senha após o primeiro acesso).\n\nTutorial para alterar senha: https://www.youtube.com/watch?v=gFBuyrhoSoc";

export const CREDENTIAL_MESSAGE_PRESETS = {
    Mobilemed: [
        {
            id: "default",
            label: "Padrão",
            text: DEFAULT_CREDENTIAL_MESSAGE,
        },
        {
            id: "simple",
            label: "Simples",
            text: "Olá! Seu acesso à plataforma MobileMed foi criado com sucesso.\nE-mail: {email}\nSenha: {password}",
        },
        {
            id: "welcome",
            label: "Boas Vindas",
            text: "Seja bem-vindo ao nosso sistema de Telerradiologia MobileMed segue a baixo as informações necessárias para o seu primeiro acesso\n\nPortal: https://laudos.mobilemed.com.br/login\nLogin: {email}\nSenha Temporária: {password} (Favor alterar senha após o primeiro acesso).",
        },
    ],
    MobileVet: [
        {
            id: "default",
            label: "Padrão",
            text: "Usuário(s) cadastrado(s) com sucesso! Segue abaixo as informações necessárias para o seu primeiro acesso.\n\nPortal: https://portal.mobilemedvet.com.br/login\nLogin: {email}\nSenha Temporária: {password} (Favor alterar senha após o primeiro acesso).\n\nTutorial para alterar senha: https://www.youtube.com/watch?v=gFBuyrhoSoc",
        },
        {
            id: "simple",
            label: "Simples",
            text: "Olá! Seu acesso à plataforma MobileVet foi criado com sucesso.\nE-mail: {email}\nSenha: {password}",
        },
        {
            id: "welcome",
            label: "Boas Vindas",
            text: "Seja bem-vindo ao nosso sistema de Telerradiologia MobileMed segue a baixo as informações necessárias para o seu primeiro acesso\n\nPortal: https://portal.mobilemedvet.com.br/login\nLogin: {email}\nSenha Temporária: {password} (Favor alterar senha após o primeiro acesso).",
        },
    ],
    Cuesta: [
        {
            id: "default",
            label: "Padrão",
            text: "Usuário(s) cadastrado(s) com sucesso! Segue abaixo as informações necessárias para o seu primeiro acesso.\n\nPortal: https://portal.cuestainterradiologia.com.br/login\nLogin: {email}\nSenha Temporária: {password} (Favor alterar senha após o primeiro acesso).\n\nTutorial para alterar senha: https://www.youtube.com/watch?v=gFBuyrhoSoc",
        },
        {
            id: "simple",
            label: "Simples",
            text: "Olá! Seu acesso à plataforma MobileMed foi criado com sucesso.\nE-mail: {email}\nSenha: {password}",
        },
        {
            id: "welcome",
            label: "Boas Vindas",
            text: "Seja bem-vindo ao nosso sistema de Telerradiologia MobileMed segue a baixo as informações necessárias para o seu primeiro acesso\n\nPortal: https://portal.cuestainterradiologia.com.br/login\nLogin: {email}\nSenha Temporária: {password} (Favor alterar senha após o primeiro acesso).",
        },
    ],
};

export function formatCredentialList(users) {
    return users
        .map(({ email, password }) => `E-mail: ${email}\nSenha: ${password}`)
        .join("\n\n");
}

export function formatCredentialMessages(users, template = DEFAULT_CREDENTIAL_MESSAGE) {
    const messageTemplate = String(template ?? "");
    const hasEmailPlaceholder = messageTemplate.includes("{email}");
    const hasPasswordPlaceholder = messageTemplate.includes("{password}");

    return users
        .map(({ email, password }) => {
            const message = messageTemplate
                .replace(/{email}/g, String(email ?? ""))
                .replace(/{password}/g, String(password ?? ""))
                .trim();
            const missingFields = [
                ...(!hasEmailPlaceholder ? [`E-mail: ${email}`] : []),
                ...(!hasPasswordPlaceholder ? [`Senha: ${password}`] : []),
            ];
            return [message, ...missingFields].filter(Boolean).join("\n");
        })
        .join("\n\n");
}
