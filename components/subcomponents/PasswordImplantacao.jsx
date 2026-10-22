import { useEffect, useRef, useState } from "react";
import "../../src/style/password.css";
import { usePassword } from "../../src/hooks/usePassword";
import Toggle from "../ui/Toggle";
import ButtonCopy from "../ui/ButtonCopy";
import { useNotifications } from "../../src/hooks/useNotifications";
import { formatCredentialList, formatCredentialMessages } from "../../src/utils/credentialMessages.js";

// Modo de implantação: associa senhas a e-mails e gerencia a lista local persistida.
function PasswordImplantacao() {
    const pass = usePassword();
    const { notifySuccess, notifyError } = useNotifications();
    const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
    const [isClearConfirmationOpen, setIsClearConfirmationOpen] = useState(false);
    const usersModalRef = useRef(null);
    const closeUsersModalRef = useRef(null);
    const reportedStorageLoadErrorRef = useRef("");

    // Fecha tanto a lista quanto a confirmação aninhada de remoção em lote.
    function closeUsersModal() {
        setIsUsersModalOpen(false);
        setIsClearConfirmationOpen(false);
    }

    useEffect(() => {
        if (pass.storageLoadError && reportedStorageLoadErrorRef.current !== pass.storageLoadError) {
            reportedStorageLoadErrorRef.current = pass.storageLoadError;
            notifyError(
                "Não foi possível abrir os usuários salvos.",
                pass.storageLoadError
            );
        }
    }, [pass.storageLoadError, notifyError]);

    // Mantém o teclado dentro do diálogo e fecha a janela com Escape.
    useEffect(() => {
        if (!isUsersModalOpen) return undefined;

        const previouslyFocusedElement = document.activeElement;
        closeUsersModalRef.current?.focus();

        function handleModalKeyDown(event) {
            if (event.key === "Escape") {
                setIsUsersModalOpen(false);
                setIsClearConfirmationOpen(false);
                return;
            }

            if (event.key !== "Tab") return;

            const focusableElements = usersModalRef.current?.querySelectorAll(
                'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (!focusableElements?.length) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        }

        document.addEventListener("keydown", handleModalKeyDown);
        return () => {
            document.removeEventListener("keydown", handleModalKeyDown);
            previouslyFocusedElement?.focus?.();
        };
    }, [isUsersModalOpen]);

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

    // Abre uma confirmação dentro da interface antes de apagar todos os usuários.
    function resetUsers() {
        if (pass.users.length) setIsClearConfirmationOpen(true);
    }

    // Executa a remoção em lote somente após confirmação e reflete falhas de persistência.
    function clearAllUsers() {
        if (pass.clearUsers()) {
            setIsClearConfirmationOpen(false);
            notifySuccess("Usuários removidos!", "A lista deste navegador está vazia.");
        } else {
            notifyError("Não foi possível apagar os usuários.", "O armazenamento do navegador não foi atualizado.");
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
                        ><div /></button>
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
                // Fecha ao clicar fora do diálogo, sem fechar quando o conteúdo interno é clicado.
                <div
                    className="saved-users-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closeUsersModal();
                    }}
                >
                    <section
                        className="saved-users-modal"
                        ref={usersModalRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="saved-users-title"
                        aria-describedby="saved-users-description"
                    >
                        <header className="saved-users-header">
                            <div className="saved-users-title-group">
                                <span className="saved-users-modal-icon" aria-hidden="true">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M16 4.2a4 4 0 0 1 0 7.6M22 20v-1.5a4 4 0 0 0-3-3.87" />
                                    </svg>
                                </span>
                                <div>
                                    <span className="saved-users-eyebrow">GESTÃO DE ACESSOS</span>
                                    <h2 id="saved-users-title">Usuários salvos</h2>
                                    <p id="saved-users-description">Credenciais armazenadas neste navegador.</p>
                                </div>
                            </div>
                            <div className="saved-users-header-actions">
                                <span className="saved-users-count">
                                    {pass.users.length} {pass.users.length === 1 ? "usuário" : "usuários"}
                                </span>
                            <button
                                ref={closeUsersModalRef}
                                type="button"
                                onClick={closeUsersModal}
                                aria-label="Fechar usuários salvos"
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
                            </button>
                            </div>
                        </header>
                        <div className="saved-users-list-heading">
                            <h3>Credenciais</h3>
                            <span>E-mail e senha</span>
                        </div>
                        <div className="saved-users-list">
                            {pass.users.length === 0 ? (
                                <div className="saved-users-empty">
                                    <span aria-hidden="true">
                                        <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20v-1a6.5 6.5 0 0 1 13 0v1M17 8h5m-2.5-2.5v5" /></svg>
                                    </span>
                                    <p>Nenhum usuário salvo ainda.</p>
                                    <small>Depois de salvar um acesso, ele aparecerá nesta lista.</small>
                                </div>
                            ) : pass.users.map((user) => (
                                <article className="saved-user" key={user.id}>
                                    <span className="saved-user-avatar" aria-hidden="true">{user.email.slice(0, 1).toUpperCase()}</span>
                                    <div className="saved-user-info">
                                        <p>{user.email}</p>
                                        <code>{user.password}</code>
                                    </div>
                                    <button
                                        type="button"
                                        className="delete-saved-user"
                                        onClick={() => removeSavedUser(user)}
                                        aria-label={`Excluir usuário ${user.email}`}
                                    >
                                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" /></svg>
                                        <span>Excluir</span>
                                    </button>
                                </article>
                            ))}
                        </div>
                        {isClearConfirmationOpen && (
                            <div
                                className="saved-users-confirmation"
                                role="group"
                                aria-labelledby="clear-users-confirmation"
                                aria-live="polite"
                            >
                                <p id="clear-users-confirmation">Deseja remover todos os usuários salvos?</p>
                                <div>
                                    <button type="button" onClick={() => setIsClearConfirmationOpen(false)}>
                                        Cancelar
                                    </button>
                                    <button type="button" className="saved-users-confirmation__confirm" onClick={clearAllUsers}>
                                        Apagar usuários
                                    </button>
                                </div>
                            </div>
                        )}
                        <footer className="saved-users-actions">
                            <div className="saved-users-actions__intro">
                                <span className="saved-users-eyebrow">AÇÕES EM LOTE</span>
                                <p>Exporte ou copie os dados para compartilhar com segurança.</p>
                                <button
                                    type="button"
                                    className="reset-users"
                                    onClick={resetUsers}
                                    disabled={!pass.users.length}
                                >
                                    Apagar todos
                                </button>
                            </div>
                            <div className="saved-users-export-actions">
                                <button
                                    className="saved-users-action"
                                    type="button"
                                    disabled={!pass.users.length}
                                    onClick={() => exportText(formatCredentialList(pass.users), "credenciais.txt")}
                                >
                                    <span className="saved-users-action__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v12m-4-4 4 4 4-4M5 17v3h14v-3" /></svg></span>
                                    <span>Exportar credenciais</span>
                                </button>
                                <button
                                    className="saved-users-action"
                                    type="button"
                                    disabled={!pass.users.length}
                                    onClick={() => copyText(formatCredentialList(pass.users), "Credenciais")}
                                >
                                    <span className="saved-users-action__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h2" /></svg></span>
                                    <span>Copiar credenciais</span>
                                </button>
                                <button
                                    className="saved-users-action"
                                    type="button"
                                    disabled={!pass.users.length}
                                    onClick={() => exportText(formatCredentialMessages(pass.users), "mensagens.txt")}
                                >
                                    <span className="saved-users-action__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 5h16v12H9l-5 4V5Z" /><path d="M8 9h8M8 13h5" /></svg></span>
                                    <span>Exportar mensagens</span>
                                </button>
                                <button
                                    className="saved-users-action"
                                    type="button"
                                    disabled={!pass.users.length}
                                    onClick={() => copyText(formatCredentialMessages(pass.users), "Mensagens")}
                                >
                                    <span className="saved-users-action__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h2" /></svg></span>
                                    <span>Copiar mensagens</span>
                                </button>
                            </div>
                        </footer>
                    </section>
                </div>
            )}
        </>
    );
}

export default PasswordImplantacao;
