import { useCallback, useEffect, useRef, useState } from "react";
import "../../src/style/password.css";
import { usePassword } from "../../src/hooks/usePassword";
import Toggle from "../ui/Toggle";
import ButtonCopy from "../ui/ButtonCopy";
import { useNotifications } from "../../src/hooks/useNotifications";
import ModalUser from "../ui/ModalUser.jsx";
import { formatCredentialMessages } from "../../src/utils/credentialMessages";

// Converte a coleção de usuários em texto legível para cópia ou exportação.
function getCredentialText(users) {
    return users.map(({ email, password }) => `E-mail: ${email}\nSenha: ${password}`).join("\n\n");
}

// Modo de implantação: associa senhas a e-mails e gerencia a lista local persistida.
function PasswordImplantacao() {
    const pass = usePassword();
    const { notifySuccess, notifyError } = useNotifications();
    const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
    const reportedStorageLoadErrorRef = useRef("");
    const closeUsersModal = useCallback(() => setIsUsersModalOpen(false), []);

    useEffect(() => {
        if (pass.storageLoadError && reportedStorageLoadErrorRef.current !== pass.storageLoadError) {
            reportedStorageLoadErrorRef.current = pass.storageLoadError;
            notifyError(
                "Não foi possível abrir os usuários salvos.",
                pass.storageLoadError
            );
        }
    }, [pass.storageLoadError, notifyError]);

    // Copia credenciais ou mensagens e informa sucesso ou falha na interface.
    async function copyText(text, label) {
        try {
            await navigator.clipboard.writeText(text);
            notifySuccess(`${label} copiadas!`, "O conteúdo já está pronto para colar.");
        } catch (error) {
            console.error("Não foi possível copiar o conteúdo:", error);
            notifyError("Não foi possível copiar.", "Verifique a permissão da área de transferência e tente novamente.");
        }
    }

    // Gera um arquivo de texto temporário para baixar o conteúdo selecionado.
    function exportText(text, filename) {
        let url = "";
        let link;
        try {
            const file = new Blob([text], { type: "text/plain;charset=utf-8" });
            url = URL.createObjectURL(file);
            link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            notifySuccess("Arquivo exportado!", `O download de ${filename} foi iniciado.`);
        } catch (error) {
            link?.remove();
            if (url) URL.revokeObjectURL(url);
            console.error("Não foi possível exportar o arquivo:", error);
            notifyError("Não foi possível exportar o arquivo.", "Tente novamente em alguns instantes.");
        }
    }

    // Delega ao hook a validação e a gravação do e-mail com a senha correspondente.
    function saveUser(index) {
        const result = pass.saveUsers(index);
        if (result.success) notifySuccess(result.title, result.message);
        else notifyError(result.title, result.message);
    }

    // Executa a remoção em lote somente após confirmação e reflete falhas de persistência.
    function clearAllUsers() {
        if (pass.clearUsers()) {
            notifySuccess("Usuários removidos!", "A lista deste navegador está vazia.");
            return true;
        } else {
            notifyError("Não foi possível apagar os usuários.", "O armazenamento do navegador não foi atualizado.");
            return false;
        }
    }

    // Remove um registro pelo identificador e avisa se localStorage não foi atualizado.
    function removeSavedUser(user) {
        if (pass.removeUser(user.id)) {
            notifySuccess("Usuário removido!", `O acesso de ${user.email} saiu da lista salva.`);
        } else {
            notifyError("Não foi possível remover o usuário.", "O armazenamento do navegador não foi atualizado.");
        }
    }

    function generatePasswords() {
        const result = pass.generatePass();
        if (result.success) notifySuccess(result.title, result.message);
        else notifyError(result.title, result.message);
    }

    return (
        <>
            <section className="implantacao">
                {/* Abre a lista persistida e mostra quantos usuários estão armazenados. */}
                <button
                    className="saveUsers password-config-saved-users"
                    type="button"
                    onClick={() => setIsUsersModalOpen(true)}
                    aria-haspopup="dialog"
                >
                    <span aria-hidden="true">👤</span>
                    <span>Usuários Salvos ({pass.users.length})</span>
                </button>
                {/* Prefixo editável; o botão adjacente limpa o campo. */}
                <div className="labels password-config-prefix">
                    <label htmlFor="prefix">Prefixo opcional (máximo 24 caracteres)</label>
                    <div className="infoLabel">
                        <input
                            id="prefix"
                            type="text"
                            maxLength={24}
                            autoComplete="off"
                            value={pass.prefix}
                            onChange={pass.handlePrefix}
                        />
                        <button
                            type="button"
                            onClick={() => pass.setPrefix("Mobile")}
                            id="reload"
                            aria-label="Limpar prefixo personalizado"
                        ><div></div></button>
                    </div>
                </div>
                {/* Controla quantas senhas serão geradas em uma única operação. */}
                <div className="labels password-config-count">
                    <div className="range-heading">
                        <label htmlFor="numPass">Quantidade de Senhas</label>
                        <output className="range-value" htmlFor="numPass">{pass.qtde}</output>
                    </div>
                    <input
                        id="numPass"
                        type="range"
                        value={pass.qtde}
                        min={1}
                        max={50}
                        step={1}
                        onChange={pass.handleNumPass}
                        className="range-slider"
                        style={{ "--range-progress": `${((pass.qtde - 1) / 49) * 100}%` }}
                    />
                </div>
                {/* Define o comprimento da parte aleatória, sem contar um prefixo opcional. */}
                <div className="labels password-config-length">
                    <div className="range-heading">
                        <label htmlFor="sizePass">Comprimento aleatório</label>
                        <output className="range-value" htmlFor="sizePass">{pass.size}</output>
                    </div>
                    <input
                        id="sizePass"
                        type="range"
                        value={pass.size}
                        min={4}
                        max={32}
                        step={1}
                        onChange={pass.handleSizePass}
                        className="range-slider"
                        style={{ "--range-progress": `${((pass.size - 4) / 28) * 100}%` }}
                    />
                </div>
                {/* Opções de composição e ação que gera novas senhas com as configurações atuais. */}
                <div className="labels password-config-special" id="caracPass">
                    <Toggle checked={pass.special} onChange={pass.handleSpecial} label="Incluir Caracteres Especiais" />
                </div>
                <div className="labels password-config-uppercase" id="upperPass">
                    <Toggle checked={pass.onlyUpper} onChange={pass.handleOnlyUpper} label="Apenas Letras Maiúsculas" />
                </div>
                <p className="input-hint password-config-hint">O prefixo padrão é “mobile” e não entra no comprimento aleatório. Prefixos são previsíveis.</p>
                <button className="password-config-generate" type="button" onClick={generatePasswords}>Gerar Novas Senhas</button>
            </section>
            {/* Cada senha pode receber um e-mail, ser copiada e salva como usuário. */}
            <section className="result">
                <h2>Suas senhas geradas</h2>
                {pass.pass.map((password, index) => (
                    <div className="resultGen" key={`${index}-${password}`}>
                        <div className="labelEmail">
                            <label htmlFor={`email-${index}`}>E-mail do Usuário {index + 1}</label>
                            <input
                                id={`email-${index}`}
                                type="email"
                                maxLength={254}
                                autoComplete="email"
                                placeholder="usuario@email.com"
                                value={pass.emails[index] || ""}
                                onChange={(event) => pass.handleEmail(index, event.target.value)}
                            />
                        </div>
                        <div className="passwordResult">
                            <p>{password}</p>
                            <ButtonCopy text={password} />
                            <button type="button" onClick={() => saveUser(index)}>Salvar usuário</button>
                        </div>
                    </div>
                ))}
            </section>
            {/* Modal condicional para consultar, excluir, exportar e copiar usuários salvos. */}
            {isUsersModalOpen && (
                <ModalUser
                    users={pass.users}
                    onClose={closeUsersModal}
                    onRemoveUser={removeSavedUser}
                    onClearUsers={clearAllUsers}
                    onExportCredentials={() => exportText(getCredentialText(pass.users), "credenciais.txt")}
                    onCopyCredentials={() => copyText(getCredentialText(pass.users), "Credenciais")}
                    onExportMessages={(template) => exportText(formatCredentialMessages(pass.users, template), "mensagens.txt")}
                    onCopyMessages={(template) => copyText(formatCredentialMessages(pass.users, template), "Mensagens")}
                />
            )}
        </>
    );
}

export default PasswordImplantacao;
