import { useCallback, useEffect, useRef, useState } from "react";
import "../../src/style/password.css";
import { usePassword } from "../../src/hooks/usePassword";
import Toggle from "../ui/Toggle";
import ButtonCopy from "../ui/ButtonCopy";
import { useNotifications } from "../../src/hooks/useNotifications";
import ModalUsers from "../ui/ModalUsers.jsx";
import { formatCredentialMessages } from "../../src/utils/credentialMessages";
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

// Importa uma tabela, gera credenciais para endereços únicos e permite exportá-las.
function PasswordAvancado() {
    const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
    const closeUsersModal = useCallback(() => setIsUsersModalOpen(false), []);
    const fileInputRef = useRef(null);
    const { notifySuccess, notifyError } = useNotifications();
    const pass = usePassword();
    const [sheet, setSheet] = useState(null);
    const [sourceFile, setSourceFile] = useState(null);
    const [selectedExportColumns, setSelectedExportColumns] = useState([]);
    const [credentialRows, setCredentialRows] = useState([]);
    const [prefix, setPrefix] = useState("Mobile");
    const [size, setSize] = useState(8);
    const [special, setSpecial] = useState(false);
    const [onlyUpper, setOnlyUpper] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const reportedStorageErrorRef = useRef("");

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

    // Recalcula a tabela usando a coluna de e-mail identificada durante a leitura.
    function makeCredentials(nextSheet) {
        const generatedRows = buildCredentialRows(nextSheet, options);
        if (!generatedRows.length) {
            throw new Error("Não encontrei endereços de e-mail na coluna identificada automaticamente.");
        }
        setCredentialRows(generatedRows);
        setSheet(nextSheet);
        return generatedRows;
    }

    // Lê o arquivo selecionado e expõe contagens de linhas válidas, duplicadas e inválidas.
    async function importFile(file) {
        if (!file) return;
        setIsLoading(true);
        setSheet(null);
        setSourceFile(null);
        setSelectedExportColumns([]);
        setCredentialRows([]);

        try {
            if (file.size > MAX_FILE_SIZE) throw new Error("O arquivo deve ter no máximo 10 MB.");
            const importedSheet = await readCredentialFile(file);
            const generatedRows = makeCredentials(importedSheet);
            setSourceFile(file);
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

    // Lê a aba escolhida no arquivo original e reclassifica suas linhas.
    async function changeSheet(event) {
        const nextSheetName = event.target.value;
        if (!sourceFile) return;
        setIsLoading(true);
        try {
            const importedSheet = await readCredentialFile(sourceFile, nextSheetName);
            const generatedRows = buildCredentialRows(importedSheet, options);
            setSheet(importedSheet);
            setSelectedExportColumns([]);
            setCredentialRows(generatedRows);
            if (!generatedRows.length) {
                notifyError("Aba selecionada sem e-mails.", "Escolha outra aba ou verifique se ela contém endereços de e-mail.");
            }
        } catch (error) {
            console.error("Não foi possível ler a aba selecionada:", error);
            notifyError("Não foi possível selecionar a aba.", error.message || "Confira o conteúdo da aba e tente novamente.");
        } finally {
            setIsLoading(false);
        }
    }

    // Regenera o lote a partir da planilha em memória, usando as opções atuais do formulário.
    function regeneratePasswords() {
        if (!sheet) return;
        try {
            const generatedRows = buildCredentialRows(sheet, options);
            setCredentialRows(generatedRows);
            notifySuccess("Senhas atualizadas.", `${generatedRows.filter((row) => row.status === "generated").length} credencial(is) gerada(s) com as opções atuais.`);
        } catch (error) {
            console.error("Não foi possível gerar as senhas:", error);
            notifyError("Não foi possível gerar as senhas.", "O navegador precisa permitir geração aleatória segura.");
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
            const sourceRows = new Map(sheet.rows.map(({ sourceRow, values }) => [sourceRow, values]));
            const exportColumnIndexes = sheet.headers
                .map((_, index) => index)
                .filter((index) => selectedExportColumns.includes(index));
            const additionalHeaders = exportColumnIndexes.map((columnIndex) => sheet.headers[columnIndex]);
            const exportRows = credentials.map((row) => ({
                ...row,
                additionalValues: exportColumnIndexes.map((columnIndex) =>
                    sourceRows.get(row.sourceRow)?.[columnIndex] ?? ""
                ),
            }));
            await downloadCredentials(
                exportRows,
                format,
                credentialFilenameBase(sheet?.fileName),
                additionalHeaders
            );
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
    const exportableColumns = sheet
        ? sheet.headers
            .map((header, index) => ({ header, index }))
            .filter(({ header, index }) => index !== sheet.emailColumn && !header.toLowerCase().includes("coluna"))
        : [];

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
                    <small>CSV ou XLSX · até 10 MB · escolha a aba e os dados adicionais para exportar</small>
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
                            {sheet.sheetNames.length > 1 && (
                                <>
                                    <label htmlFor="advanced-sheet">Aba da planilha</label>
                                    <select id="advanced-sheet" value={sheet.sheetName} onChange={changeSheet} disabled={isLoading}>
                                        {sheet.sheetNames.map((sheetName) => (
                                            <option key={sheetName} value={sheetName}>{sheetName}</option>
                                        ))}
                                    </select>
                                </>
                            )}
                            {exportableColumns.length > 0 && (
                                <fieldset className="advanced-export-columns">
                                    <legend>Informações adicionais para exportar (opcional)</legend>
                                    <p>E-mail e senha sempre são incluídos. Selecione outras colunas da planilha:</p>
                                    {exportableColumns.map(({ header, index }) => (
                                        <label className="advanced-export-column-option" key={`${index}-${header}`} htmlFor={`advanced-export-column-${index}`}>
                                            <input
                                                id={`advanced-export-column-${index}`}
                                                type="checkbox"
                                                checked={selectedExportColumns.includes(index)}
                                                onChange={(event) => {
                                                    const isChecked = event.target.checked;
                                                    setSelectedExportColumns((currentColumns) => isChecked
                                                        ? [...currentColumns, index]
                                                        : currentColumns.filter((columnIndex) => columnIndex !== index)
                                                    );
                                                }}
                                                disabled={isLoading}
                                            />
                                            <span>{header}</span>
                                        </label>
                                    ))}
                                </fieldset>
                            )}
                        </div>
                    )}
                    <button
                        className="password-config-generate"
                        type="button"
                        onClick={regeneratePasswords}
                        disabled={!sheet || credentials.length === 0 || isLoading}
                    >
                        Gerar senhas novamente
                    </button>
                </div>
            </section>

            {/* Modal condicional para consultar, excluir, exportar e copiar usuários salvos. */}
            {isUsersModalOpen && (
                <ModalUsers
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
                        <p className="advanced-empty">Nenhum e-mail preenchido na coluna identificada automaticamente.</p>
                    )}
                </section>
            )}
        </>
    );
}

export default PasswordAvancado;
