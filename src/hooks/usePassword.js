// O estado do formulário e das credenciais pertence ao ciclo de vida do componente.
import { useState } from "react";
import { generatePassword } from "../utils/passwordGenerator";

// Chave compartilhada pelos modos que leem e gravam credenciais neste navegador.
const USERS_STORAGE_KEY = "mobilemedtools.savedUsers";

// Recupera e valida o formato persistido; sinaliza erros para a interface sem mascará-los.
function loadSavedUsers() {
    try {
        const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
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
        return {
            users: [],
            errorMessage: "Não foi possível carregar os usuários salvos deste navegador.",
        };
    }
}

// Hook que concentra opções, geração, validação e persistência de credenciais.
export function usePassword({ loadSavedUsersOnMount = true } = {}) {
    // Prefixo padrão solicitado; pode ser removido ou personalizado.
    const [prefix, setPrefix] = useState("Mobile");
    // Quantidade de senhas a serem geradas de uma vez
    const [qtde, setQtde] = useState(1);
    // Tamanho padrão da parte aleatória; o intervalo permitido vai de 4 a 32.
    const [size, setSize] = useState(8);
    // Lista com as senhas geradas
    const [pass, setPass] = useState([]);
    // Define se os caracteres especiais serão incluídos
    const [special, setSpecial] = useState(false);
    // Define se a senha terá apenas letras maiúsculas (sem minúsculas)
    const [onlyUpper, setOnlyUpper] = useState(false);
    // E-mails são mantidos por posição para corresponder à lista atual de senhas.
    const [emails, setEmails] = useState([]);
    // Usuários salvos persistem no armazenamento local deste navegador.
    const [savedUsersState] = useState(() => loadSavedUsersOnMount
        ? loadSavedUsers()
        : { users: [], errorMessage: "" }
    );
    const [users, setUsers] = useState(savedUsersState.users);

    // Persiste de forma síncrona para só atualizar o estado após confirmar a gravação.
    function persistUsers(nextUsers) {
        try {
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(nextUsers));
            return true;
        } catch (error) {
            console.error("Não foi possível salvar os usuários localmente:", error);
            return false;
        }
    }

    // Gera o lote com as opções atuais e alinha os campos de e-mail por índice.
    function generatePass() {
        try {
            // Sem prefixo, retorna apenas a parte aleatória; prefixos personalizados são opcionais.
            const passwords = Array.from({ length: qtde }, () =>
                generatePassword({ prefix, size, special, onlyUpper })
            );
            // Salva as senhas geradas no estado, o que atualiza a tela
            setPass(passwords);
            // Mantém os e-mails já informados nos índices existentes e ajusta a lista à nova quantidade.
            setEmails((currentEmails) =>
                Array.from({ length: qtde }, (_, index) => currentEmails[index] || "")
            );
            return {
                success: true,
                title: qtde === 1 ? "Senha gerada com sucesso!" : "Senhas geradas com sucesso!",
                message: qtde === 1
                    ? "A senha está pronta para copiar ou associar a um usuário."
                    : "As senhas estão prontas para copiar ou associar a usuários.",
            };
        } catch (error) {
            console.error("Não foi possível gerar as senhas:", error);
            return {
                success: false,
                title: "Não foi possível gerar as senhas.",
                message: "Tente novamente. O navegador precisa permitir geração aleatória segura.",
            };
        }
    }

    // Valida e persiste uma credencial; usado pelos modos manual e de importação em lote.
    function saveCredential(emailValue, password) {
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

        // E-mails são únicos sem diferenciar maiúsculas de minúsculas.
        const existingUser = users.find(
            (user) => user.email.toLowerCase() === email.toLowerCase()
        );
        let user;
        try {
            user = { id: existingUser?.id ?? crypto.randomUUID(), email, password };
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

        if (!persistUsers(nextUsers)) {
            return {
                success: false,
                title: "Não foi possível salvar o usuário.",
                message: "O armazenamento do navegador está indisponível ou cheio.",
            };
        }
        setUsers(nextUsers);

        return {
            success: true,
            title: existingUser ? "Usuário atualizado com sucesso!" : "Usuário salvo com sucesso!",
            message: existingUser
                ? "As credenciais foram atualizadas na lista salva deste navegador."
                : "As credenciais estão disponíveis na lista salva deste navegador.",
        };
    }

    // Mantém o atalho usado pelo modo Implantação baseado nos campos por posição.
    function saveUsers(index) {
        return saveCredential(emails[index], pass[index]);
    }

    // Remove um usuário pelo identificador estável atribuído ao salvá-lo.
    function removeUser(userId) {
        const nextUsers = users.filter((user) => user.id !== userId);
        if (persistUsers(nextUsers)) setUsers(nextUsers);
        else return false;
        return true;
    }

    // Limpa e persiste a coleção inteira antes de atualizar a interface.
    function clearUsers() {
        if (persistUsers([])) setUsers([]);
        else return false;
        return true;
    }

    // Adaptadores dos eventos dos controles para os setters do estado do hook.
    const handlePrefix = (e) => setPrefix(e.target.value.slice(0, 24));
    const handleNumPass = (e) => setQtde(Number(e.target.value));
    const handleSizePass = (e) => setSize(Math.min(32, Math.max(4, Number(e.target.value))));
    // Recebem direto o valor booleano (checked) de um checkbox/switch customizado
    const handleSpecial = (checked) => setSpecial(checked);
    const handleOnlyUpper = (checked) => setOnlyUpper(checked);
    // Atualiza um e-mail sem alterar os valores dos demais campos.
    const handleEmail = (index, value) => {
        setEmails((currentEmails) => {
            const nextEmails = [...currentEmails];
            nextEmails[index] = value.slice(0, 254);
            return nextEmails;
        });
    };

    // Expõe estados, ações e resultados para os componentes de cada modo.
    return {
        prefix, qtde, size, pass, special, onlyUpper, emails, users,
        storageLoadError: savedUsersState.errorMessage,
        setPrefix, generatePass,
        handlePrefix, handleNumPass, handleSizePass,
        handleSpecial, handleOnlyUpper, handleEmail, saveCredential, saveUsers, removeUser, clearUsers,
    };
}
