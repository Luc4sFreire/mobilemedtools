// O estado do formulário e das credenciais pertence ao ciclo de vida do componente.
import { useState } from "react";
import { generatePassword } from "../utils/passwordGenerator.js";
import {
    clearSavedUsers,
    loadSavedUsers,
    removeSavedUser,
    saveSavedCredential,
} from "../utils/savedUsers.js";

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
        const result = saveSavedCredential(users, emailValue, password);
        if (result.success) setUsers(result.users);
        return result;
    }

    // Mantém o atalho usado pelo modo Implantação baseado nos campos por posição.
    function saveUsers(index) {
        return saveCredential(emails[index], pass[index]);
    }

    // Remove um usuário pelo identificador estável atribuído ao salvá-lo.
    function removeUser(userId) {
        const result = removeSavedUser(users, userId);
        if (result.success) setUsers(result.users);
        return result.success;
    }

    // Limpa e persiste a coleção inteira antes de atualizar a interface.
    function clearUsers() {
        const result = clearSavedUsers();
        if (result.success) setUsers(result.users);
        return result.success;
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
