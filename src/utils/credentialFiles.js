import { generatePassword } from "./passwordGenerator";

// Limites para manter importação em memória previsível e evitar planilhas enormes.
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ROWS = 10000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Normaliza rótulos de coluna para comparar cabeçalhos com e sem acentos/sinais.
function normalizeHeader(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

// Reconhece nomes comuns usados para identificar uma coluna de e-mail.
function isEmailHeader(value) {
    const header = normalizeHeader(value);
    return ["email", "emailusuario", "emaildo usuario", "emailaddress", "mail", "correioeletronico"]
        .map(normalizeHeader)
        .includes(header);
}

// Aplica uma validação básica de formato antes de gerar credenciais.
function isEmail(value) {
    return EMAIL_PATTERN.test(String(value ?? "").trim());
}

// Converte o índice numérico da coluna em uma identificação amigável (A, B, ...).
function columnLabel(index) {
    let current = index + 1;
    let label = "";
    while (current > 0) {
        const remainder = (current - 1) % 26;
        label = String.fromCharCode(65 + remainder) + label;
        current = Math.floor((current - 1) / 26);
    }
    return `Coluna ${label}`;
}

// Normaliza células vazias e valores numéricos para exibição textual uniforme.
function cellToString(value) {
    return value == null ? "" : String(value).trim();
}

// Identifica cabeçalho e coluna de e-mail, preservando linhas e nomes da origem.
function inspectRows(rows, fileName, sheetName) {
    if (rows.length > MAX_ROWS + 20) {
        throw new Error(`O arquivo excede o limite de ${MAX_ROWS.toLocaleString("pt-BR")} linhas.`);
    }

    const headerRowIndex = rows
        .slice(0, 20)
        .findIndex((row) => row.some(isEmailHeader));
    const hasEmailHeader = headerRowIndex >= 0;
    const firstRowContainsEmail = (rows[0] ?? []).some(isEmail);
    const hasUnlabeledHeader = !hasEmailHeader && rows.length > 1 && !firstRowContainsEmail;
    const columnHeaderRow = hasEmailHeader ? headerRowIndex : hasUnlabeledHeader ? 0 : -1;
    const dataStartIndex = hasEmailHeader ? headerRowIndex + 1 : hasUnlabeledHeader ? 1 : 0;
    if (rows.length - dataStartIndex > MAX_ROWS) {
        throw new Error(`O arquivo excede o limite de ${MAX_ROWS.toLocaleString("pt-BR")} linhas de dados.`);
    }
    const width = Math.max(1, ...rows.slice(0, Math.min(rows.length, MAX_ROWS + 1)).map((row) => row.length));
    const columnCount = Math.min(width, 100);
    const rawHeaders = columnHeaderRow >= 0 ? rows[columnHeaderRow] : [];
    const headers = Array.from({ length: columnCount }, (_, index) =>
        cellToString(rawHeaders[index]) || columnLabel(index)
    );

    let emailColumn = rawHeaders.findIndex(isEmailHeader);
    if (emailColumn < 0) {
        const scores = Array.from({ length: columnCount }, (_, columnIndex) =>
            rows.slice(dataStartIndex, Math.min(rows.length, dataStartIndex + 30))
                .reduce((score, row) => score + Number(isEmail(row[columnIndex])), 0)
        );
        emailColumn = scores.reduce((best, score, index) => score > scores[best] ? index : best, 0);
    }

    const dataRows = rows.slice(dataStartIndex, MAX_ROWS + dataStartIndex).map((row, offset) => ({
        sourceRow: dataStartIndex + offset + 1,
        values: Array.from({ length: columnCount }, (_, index) => cellToString(row[index])),
    }));

    return { fileName, sheetName, headers, rows: dataRows, emailColumn };
}

// Lê CSV ou a primeira aba XLSX após validar extensão, tamanho e quantidade de linhas.
export async function readCredentialFile(file) {
    if (!file) throw new Error("Selecione um arquivo CSV ou XLSX.");
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx"].includes(extension)) {
        throw new Error("Selecione um arquivo CSV ou XLSX.");
    }
    if (file.size > MAX_FILE_SIZE) {
        throw new Error("O arquivo deve ter no máximo 10 MB.");
    }
    if (file.size === 0) {
        throw new Error("O arquivo está vazio.");
    }

    const contents = extension === "csv"
        ? (await file.text()).replace(/^\uFEFF/, "")
        : await file.arrayBuffer();
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(contents, {
        type: extension === "csv" ? "string" : "array",
        codepage: 65001,
        cellDates: false,
        dense: true,
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = sheetName ? workbook.Sheets[sheetName] : null;
    if (!worksheet) throw new Error("Não encontrei uma aba com dados nesse arquivo.");

    const rows = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
        raw: false,
        blankrows: true,
    });
    if (!rows.length) throw new Error("A primeira aba do arquivo não contém linhas.");

    return inspectRows(rows, file.name, sheetName);
}

// Classifica e-mails antes de gerar: todas as ocorrências repetidas são bloqueadas.
export function buildCredentialRows(sheet, emailColumn, options) {
    const sourceRows = sheet.rows.map(({ sourceRow, values }) => ({
        sourceRow,
        email: cellToString(values[emailColumn]),
    })).filter(({ email }) => email);
    const emailCounts = new Map();

    for (const { email } of sourceRows) {
        if (!isEmail(email)) continue;
        const normalizedEmail = email.toLowerCase();
        emailCounts.set(normalizedEmail, (emailCounts.get(normalizedEmail) ?? 0) + 1);
    }

    return sourceRows.map(({ sourceRow, email }) => {
        if (!isEmail(email)) {
            return { sourceRow, email, password: "", status: "invalid" };
        }

        const normalizedEmail = email.toLowerCase();
        if (emailCounts.get(normalizedEmail) > 1) {
            return { sourceRow, email, password: "", status: "duplicate" };
        }

        return {
            sourceRow,
            email,
            password: generatePassword(options),
            status: "generated",
        };
    });
}

// Converte um Blob em download do navegador e libera a URL temporária depois.
function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Protege células CSV contra fórmulas e escapa aspas no formato CSV.
function escapeCsvCell(value) {
    const text = String(value ?? "");
    const safeText = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
    return `"${safeText.replace(/"/g, '""')}"`;
}

// Escapa separadores e quebras de linha para preservar a estrutura de tabela Markdown.
function escapeMarkdownCell(value) {
    return String(value ?? "").replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
}

// Exporta as credenciais válidas para XLSX, CSV ou Markdown.
export async function downloadCredentials(credentials, format, filenameBase) {
    const rows = credentials.map(({ email, password }) => [email, password]);
    const filename = `${filenameBase}.${format}`;

    if (format === "xlsx") {
        const XLSX = await import("xlsx");
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet([["E-mail", "Senha"], ...rows]);
        worksheet["!cols"] = [{ wch: 34 }, { wch: 38 }];
        XLSX.utils.book_append_sheet(workbook, worksheet, "Credenciais");
        const content = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        triggerDownload(new Blob([content], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }), filename);
        return;
    }

    if (format === "csv") {
        const csv = [["E-mail", "Senha"], ...rows]
            .map((row) => row.map(escapeCsvCell).join(","))
            .join("\r\n");
        triggerDownload(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }), filename);
        return;
    }

    const markdown = [
        "| E-mail | Senha |",
        "| --- | --- |",
        ...rows.map(([email, password]) => `| ${escapeMarkdownCell(email)} | ${escapeMarkdownCell(password)} |`),
        "",
    ].join("\n");
    triggerDownload(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), filename);
}

// Gera um prefixo de nome de arquivo seguro e legível a partir do arquivo importado.
export function credentialFilenameBase(fileName) {
    const base = String(fileName ?? "credenciais")
        .replace(/\.[^.]+$/, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
    return base ? `credenciais-${base}` : "credenciais-geradas";
}
