import { useEffect, useRef, useState } from "react";
import "../../src/style/password.css";
import { usePassword } from "../../src/hooks/usePassword";
import Toggle from "../ui/Toggle";
import ButtonCopy from "../ui/ButtonCopy";
import { useNotifications } from "../../src/hooks/useNotifications";
import {
    buildCredentialRows,
    credentialFilenameBase,
    downloadCredentials,
    readCredentialFile,
} from "../../src/utils/credentialFiles";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function getCredentialText(users) {
    return users.map(({ email, password }) => `E-mail: ${email}\nSenha: ${password}`).join("\n\n");
}

function getMessageText(users) {
    return users
        .map(({ email, password }) => `Olá! Seguem os dados do seu acesso:\nE-mail: ${email}\nSenha: ${password}`)
        .join("\n\n");
}

// Importa uma tabela, gera credenciais para endereços únicos e permite exportá-las.
function PasswordAvancado() {
    const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
    const fileInputRef = useRef(null);
    const { notifySuccess, notifyError } = useNotifications();
    const pass = usePassword();
    const [sheet, setSheet] = useState(null);
    const [emailColumn, setEmailColumn] = useState(0);
    const [credentialRows, setCredentialRows] = useState([]);
    const [prefix, setPrefix] = useState("Mobile");
    const [size, setSize] = useState(8);
    const [special, setSpecial] = useState(false);
    const [onlyUpper, setOnlyUpper] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const reportedStorageErrorRef = useRef("");
    const [isClearConfirmationOpen, setIsClearConfirmationOpen] = useState(false);
    const usersModalRef = useRef(null);
    const closeUsersModalRef = useRef(null);

    // Separa os registros que podem ser copiados/exportados dos que precisam de revisão.
    const credentials = credentialRows.filter((row) => row.status === "generated");
    const duplicateCount = credentialRows.filter((row) => row.status === "duplicate").length;
    const invalidCount = credentialRows.filter((row) => row.status === "invalid").length;
    const options = { prefix, size, special, onlyUpper };

    useEffect(() => {
        if (pass.storageLoadError && reportedStorageErrorRef.current !== pass.storageLoadError) {
            reportedStorageErrorRef.current = pass.storageLoadError;
            notifyError("Não foi possível abrir os usuários salvos.", pass.storageLoadError);
        }
    }, [pass.storageLoadError, notifyError]);

    // Recalcula a tabela e guarda a planilha/coluna que servirão de fonte para nova geração.
    function makeCredentials(nextSheet, nextEmailColumn) {
        const generatedRows = buildCredentialRows(nextSheet, nextEmailColumn, options);
        if (!generatedRows.length) {
            throw new Error("Não encontrei endereços de e-mail preenchidos na coluna selecionada.");
        }
        setCredentialRows(generatedRows);
        setSheet(nextSheet);
        setEmailColumn(nextEmailColumn);
        return generatedRows;
    }

    // Lê o arquivo selecionado e expõe contagens de linhas válidas, duplicadas e inválidas.
    async function importFile(file) {
        if (!file) return;
        setIsLoading(true);
        setSheet(null);
        setCredentialRows([]);

        try {
            if (file.size > MAX_FILE_SIZE) throw new Error("O arquivo deve ter no máximo 10 MB.");
            const importedSheet = await readCredentialFile(file);
            const generatedRows = makeCredentials(importedSheet, importedSheet.emailColumn);
            const generatedCount = generatedRows.filter((row) => row.status === "generated").length;
            const duplicates = generatedRows.filter((row) => row.status === "duplicate").length;
            const invalid = generatedRows.filter((row) => row.status === "invalid").length;
            notifySuccess(
                "Arquivo processado.",
                `${generatedCount} senha(s) gerada(s); ${duplicates} duplicata(s) e ${invalid} e-mail(s) inválido(s) ignorados.`
            );
        } catch (error) {
            console.error("Não foi possível processar o arquivo de credenciais:", error);
            notifyError("Não foi possível importar o arquivo.", error.message || "Confira o formato do arquivo e tente novamente.");
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    // Regenera o lote a partir da planilha em memória, usando as opções atuais do formulário.
    function regeneratePasswords() {
        if (!sheet) return;
        try {
            const generatedRows = buildCredentialRows(sheet, emailColumn, options);
            setCredentialRows(generatedRows);
            notifySuccess("Senhas atualizadas.", `${generatedRows.filter((row) => row.status === "generated").length} credencial(is) gerada(s) com as opções atuais.`);
        } catch (error) {
            console.error("Não foi possível gerar as senhas:", error);
            notifyError("Não foi possível gerar as senhas.", "O navegador precisa permitir geração aleatória segura.");
        }
    }

    // Trocar a coluna invalida e reconstrói a classificação das credenciais.
    function changeEmailColumn(event) {
        const nextEmailColumn = Number(event.target.value);
        setEmailColumn(nextEmailColumn);
        if (!sheet) return;
        try {
            setCredentialRows(buildCredentialRows(sheet, nextEmailColumn, options));
        } catch (error) {
            setCredentialRows([]);
            notifyError("Não foi possível ler esta coluna.", error.message || "Selecione uma coluna com e-mails válidos.");
        }
    }

    // Copia apenas as linhas classificadas como válidas em formato tabulado.
    async function copyAllCredentials() {
        try {
            const text = credentials.map(({ email, password }) => `${email}\t${password}`).join("\n");
            await navigator.clipboard.writeText(text);
            notifySuccess("Credenciais copiadas!", `${credentials.length} linha(s) pronta(s) para colar.`);
        } catch (error) {
            console.error("Não foi possível copiar as credenciais:", error);
            notifyError("Não foi possível copiar.", "Verifique a permissão da área de transferência e tente novamente.");
        }
    }

    async function copyText(text, label) {
        try {
            await navigator.clipboard.writeText(text);
            notifySuccess(`${label} copiadas!`, "O conteúdo já está pronto para colar.");
        } catch (error) {
            console.error("Não foi possível copiar o conteúdo:", error);
            notifyError("Não foi possível copiar.", "Verifique a permissão da área de transferência e tente novamente.");
        }
    }

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

    // Persiste uma linha válida na coleção compartilhada com o modo Implantação.
    function saveCredential(row) {
        const result = pass.saveCredential(row.email, row.password);
        if (result.success) notifySuccess(result.title, result.message);
        else notifyError(result.title, result.message);
    }

    // Delega a codificação do arquivo ao utilitário e informa erros de exportação.
    async function exportCredentials(format) {
        try {
            await downloadCredentials(credentials, format, credentialFilenameBase(sheet?.fileName));
            notifySuccess("Arquivo exportado!", `O download em ${format.toUpperCase()} foi iniciado.`);
        } catch (error) {
            console.error("Não foi possível exportar as credenciais:", error);
            notifyError("Não foi possível exportar o arquivo.", "Tente novamente em alguns instantes.");
        }
    }

    // Integra o arrastar-e-soltar ao mesmo caminho de validação do seletor de arquivos.
    function handleDrop(event) {
        event.preventDefault();
        setIsDragging(false);
        importFile(event.dataTransfer.files?.[0]);
    }

    const progressForSize = `${((size - 4) / 28) * 100}%`;

    // Fecha tanto a lista quanto a confirmação aninhada de remoção em lote.
    function closeUsersModal() {
        setIsUsersModalOpen(false);
        setIsClearConfirmationOpen(false);
    }

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

    function removeSavedUser(user) {
        if (pass.removeUser(user.id)) {
            notifySuccess("Usuário removido!", `O acesso de ${user.email} saiu da lista salva.`);
        } else {
            notifyError("Não foi possível remover o usuário.", "O armazenamento do navegador não foi atualizado.");
        }
    }

    return (
        <>
            <section className="advanced" aria-labelledby="advanced-password-title">
                <button
                    className="saveUsers password-config-saved-users"
                    type="button"
                    onClick={() => setIsUsersModalOpen(true)}
                    aria-haspopup="dialog"
                >
                    <span aria-hidden="true">👤</span>
                    <span>Usuários Salvos ({pass.users.length})</span>
                </button>
                <div className="advanced-upload-copy">
                    <span className="advanced-eyebrow">GERAÇÃO EM LOTE</span>
                    <h2 id="advanced-password-title">Importe uma lista de e-mails</h2>
                    <p>Envie um arquivo CSV ou XLSX. As senhas são geradas neste navegador conforme as regras configuradas abaixo.</p>
                </div>
                <label
                    className={`advanced-dropzone${isDragging ? " is-dragging" : ""}`}
                    htmlFor="advanced-file"
                    onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                >
                    <span className="advanced-upload-icon" aria-hidden="true">↑</span>
                    <span><strong>{isLoading ? "Lendo arquivo…" : "Escolha um arquivo ou arraste até aqui"}</strong></span>
                    <small>CSV ou XLSX · até 10 MB · primeira aba do arquivo</small>
                    <input
                        ref={fileInputRef}
                        id="advanced-file"
                        type="file"
                        accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        onChange={(event) => importFile(event.target.files?.[0])}
                        disabled={isLoading}
                    />
                </label>

                <div className="advanced-options">
                    <div className="labels password-config-prefix">
                        <label htmlFor="advanced-prefix">Prefixo opcional (máximo 24 caracteres)</label>
                        <div className="infoLabel">
                            <input
                                id="advanced-prefix"
                                type="text"
                                maxLength={24}
                                autoComplete="off"
                                value={prefix}
                                onChange={(event) => setPrefix(event.target.value.slice(0, 24))}
                            />
                            <button type="button" aria-label="Limpar prefixo personalizado" onClick={() => setPrefix("Mobile")}><div /></button>
                        </div>
                    </div>
                    <div className="labels password-config-length">
                        <div className="range-heading">
                            <label htmlFor="advanced-size">Comprimento aleatório</label>
                            <output className="range-value" htmlFor="advanced-size">{size}</output>
                        </div>
                        <input
                            id="advanced-size"
                            type="range"
                            min={4}
                            max={32}
                            step={1}
                            value={size}
                            onChange={(event) => setSize(Number(event.target.value))}
                            className="range-slider"
                            style={{ "--range-progress": progressForSize }}
                        />
                    </div>
                    <div className="labels password-config-special">
                        <Toggle checked={special} onChange={setSpecial} label="Incluir caracteres especiais" />
                    </div>
                    <div className="labels password-config-uppercase">
                        <Toggle checked={onlyUpper} onChange={setOnlyUpper} label="Apenas letras maiúsculas" />
                    </div>
                    <p className="input-hint">Maiúsculas e números são obrigatórios. O prefixo padrão é “mobile” e fica fora do comprimento aleatório.</p>
                    {/* Só mostra tabela e ações de exportação depois de importar uma fonte válida. */}
                    {sheet && (
                        <div className="advanced-column-select">
                            <label htmlFor="advanced-email-column">Coluna de e-mail em {sheet.fileName}</label>
                            <select id="advanced-email-column" value={emailColumn} onChange={changeEmailColumn}>
                                {sheet.headers.map((header, index) => (
                                    <option key={`${index}-${header}`} value={index}>{header}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <button
                        className="password-config-generate"
                        type="button"
                        onClick={regeneratePasswords}
                        disabled={!sheet || credentials.length === 0}
                    >
                        Gerar senhas novamente
                    </button>
                </div>
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
                                    onClick={() => exportText(getCredentialText(pass.users), "credenciais.txt")}
                                >
                                    <span className="saved-users-action__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v12m-4-4 4 4 4-4M5 17v3h14v-3" /></svg></span>
                                    <span>Exportar credenciais</span>
                                </button>
                                <button
                                    className="saved-users-action"
                                    type="button"
                                    disabled={!pass.users.length}
                                    onClick={() => copyText(getCredentialText(pass.users), "Credenciais")}
                                >
                                    <span className="saved-users-action__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h2" /></svg></span>
                                    <span>Copiar credenciais</span>
                                </button>
                                <button
                                    className="saved-users-action"
                                    type="button"
                                    disabled={!pass.users.length}
                                    onClick={() => exportText(getMessageText(pass.users), "mensagens.txt")}
                                >
                                    <span className="saved-users-action__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 5h16v12H9l-5 4V5Z" /><path d="M8 9h8M8 13h5" /></svg></span>
                                    <span>Exportar mensagens</span>
                                </button>
                                <button
                                    className="saved-users-action"
                                    type="button"
                                    disabled={!pass.users.length}
                                    onClick={() => copyText(getMessageText(pass.users), "Mensagens")}
                                >
                                    <span className="saved-users-action__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h2" /></svg></span>
                                    <span>Copiar mensagens</span>
                                </button>
                            </div>
                        </footer>
                    </section>
                </div>
            )}

            {sheet && (
                <section className="advanced-results" aria-labelledby="advanced-results-title">
                    <div className="advanced-results-heading">
                        <div>
                            <span className="advanced-eyebrow">RESULTADO</span>
                            <h2 id="advanced-results-title">Credenciais geradas</h2>
                            <p>{credentials.length} válida(s) · {duplicateCount} duplicata(s) · {invalidCount} inválida(s)</p>
                        </div>
                        <div className="advanced-export-actions">
                            <button type="button" onClick={copyAllCredentials} disabled={!credentials.length}>Copiar todas</button>
                            <button type="button" onClick={() => exportCredentials("xlsx")} disabled={!credentials.length}>Baixar XLSX</button>
                            <button type="button" onClick={() => exportCredentials("csv")} disabled={!credentials.length}>Baixar CSV</button>
                        </div>
                    </div>

                    <p className="advanced-duplicate-note" role="status">
                        E-mails são comparados sem diferenciar maiúsculas de minúsculas. Todas as linhas com e-mail repetido e os endereços inválidos ficam sem senha e não entram nos downloads. Usuários salvos podem ser consultados e removidos em Implantação → Usuários Salvos.
                    </p>

                    {credentialRows.length ? (
                        <div className="advanced-table-wrap">
                            <table className="advanced-table">
                                <thead>
                                    <tr><th>Linha</th><th>E-mail</th><th>Senha</th><th>Situação</th></tr>
                                </thead>
                                <tbody>
                                    {credentialRows.map((row) => (
                                        <tr key={`${row.sourceRow}-${row.email}`}>
                                            <td>{row.sourceRow}</td>
                                            <td>{row.email}</td>
                                            <td>
                                                {row.password ? (
                                                    <div className="advanced-password-cell">
                                                        <code>{row.password}</code>
                                                        <ButtonCopy text={row.password} />
                                                        <button
                                                            className="advanced-save-button"
                                                            type="button"
                                                            onClick={() => saveCredential(row)}
                                                        >
                                                            {pass.users.some((user) => user.email.toLowerCase() === row.email.toLowerCase()) ? "Atualizar salvo" : "Salvar usuário"}
                                                        </button>
                                                    </div>
                                                ) : <span className="advanced-muted">—</span>}
                                            </td>
                                            <td>
                                                <span className={`advanced-status advanced-status--${row.status}`}>
                                                    {row.status === "generated" ? "Gerada" : row.status === "duplicate" ? "E-mail duplicado" : "E-mail inválido"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="advanced-empty">Nenhum e-mail preenchido na coluna selecionada. Escolha outra coluna da planilha.</p>
                    )}
                </section>
            )}
        </>
    );
}

export default PasswordAvancado;
