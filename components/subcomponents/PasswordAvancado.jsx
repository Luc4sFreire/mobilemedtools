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

// Importa uma tabela, gera credenciais para endereços únicos e permite exportá-las.
function PasswordAvancado() {
    const fileInputRef = useRef(null);
    const { notifySuccess, notifyError } = useNotifications();
    const savedUsers = usePassword();
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

    // Separa os registros que podem ser copiados/exportados dos que precisam de revisão.
    const credentials = credentialRows.filter((row) => row.status === "generated");
    const duplicateCount = credentialRows.filter((row) => row.status === "duplicate").length;
    const invalidCount = credentialRows.filter((row) => row.status === "invalid").length;
    const options = { prefix, size, special, onlyUpper };

    useEffect(() => {
        if (savedUsers.storageLoadError && reportedStorageErrorRef.current !== savedUsers.storageLoadError) {
            reportedStorageErrorRef.current = savedUsers.storageLoadError;
            notifyError("Não foi possível abrir os usuários salvos.", savedUsers.storageLoadError);
        }
    }, [savedUsers.storageLoadError, notifyError]);

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

    // Persiste uma linha válida na coleção compartilhada com o modo Implantação.
    function saveCredential(row) {
        const result = savedUsers.saveCredential(row.email, row.password);
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

    return (
        <>
            <section className="advanced" aria-labelledby="advanced-password-title">
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
                            <button type="button" aria-label="Limpar prefixo personalizado" onClick={() => setPrefix("")}><div /></button>
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
                            <button type="button" onClick={() => exportCredentials("md")} disabled={!credentials.length}>Baixar MD</button>
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
                                                            {savedUsers.users.some((user) => user.email.toLowerCase() === row.email.toLowerCase()) ? "Atualizar salvo" : "Salvar usuário"}
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
