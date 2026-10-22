import test from "node:test";
import assert from "node:assert/strict";
import { buildCredentialRows, credentialFilenameBase, downloadCredentials, readCredentialFile } from "../src/utils/credentialFiles.js";
import { installDeterministicCrypto, installDownloadMocks, makeFile } from "./helpers/browserMocks.js";

const headerAliases = [
    ["email", 0], ["E-mail", 0], ["E_mail", 0], ["Email Usuário", 0],
    ["Email do usuario", 0], ["emailaddress", 0], ["mail", 0],
    ["Correio Eletrônico", 0], ["  E-MAIL  ", 0], ["EMAIL_USUARIO", 0],
];
for (const [header, expectedColumn] of headerAliases) {
    test(`CF-IMPORT-HEADER-${header}: reconhece variação de cabeçalho de e-mail`, async () => {
        const file = makeFile({ text: `${header},Nome\npessoa@example.com,Ana` });
        const sheet = await readCredentialFile(file);
        assert.equal(sheet.emailColumn, expectedColumn);
        assert.deepEqual(sheet.headers, [header.trim(), "Nome"]);
        assert.equal(sheet.rows[0].values[0], "pessoa@example.com");
    });
}

const importCases = [
    {
        id: "CF-IMPORT-01", text: "Nome,Email\nAna,ana@example.com\nBia,bia@example.com",
        check(sheet) { assert.deepEqual(sheet.headers, ["Nome", "Email"]); assert.equal(sheet.emailColumn, 1); assert.equal(sheet.rows.length, 2); },
    },
    {
        id: "CF-IMPORT-02", text: "\uFEFFEmail,Nome\n ana@example.com , Ana ",
        check(sheet) { assert.equal(sheet.emailColumn, 0); assert.equal(sheet.rows[0].values[0], "ana@example.com"); assert.equal(sheet.rows[0].values[1], "Ana"); },
    },
    {
        id: "CF-IMPORT-03", text: "ana@example.com\nbia@example.com",
        check(sheet) { assert.deepEqual(sheet.headers, ["Coluna A"]); assert.equal(sheet.rows.length, 2); assert.equal(sheet.rows[0].values[0], "ana@example.com"); },
    },
    {
        id: "CF-IMPORT-04", text: "Nome,Contato\nAna,ana@example.com\nBia,bia@example.com",
        check(sheet) { assert.equal(sheet.emailColumn, 1); assert.equal(sheet.headers[0], "Nome"); },
    },
    {
        id: "CF-IMPORT-05", text: "Notas,Nome,Email\nEquipe,Ana,ana@example.com",
        check(sheet) { assert.equal(sheet.emailColumn, 2); assert.equal(sheet.headers.length, 3); },
    },
    {
        id: "CF-IMPORT-06", text: "Email,Nome\nana@example.com,Ana\n\n",
        check(sheet) { assert.equal(sheet.rows[0].sourceRow, 2); assert.equal(sheet.rows[0].values[1], "Ana"); },
    },
    {
        id: "CF-IMPORT-07", text: 'Email,Observação\nana@example.com,"texto, com vírgula"',
        check(sheet) { assert.equal(sheet.rows[0].values[1], "texto, com vírgula"); },
    },
    {
        id: "CF-IMPORT-08", text: "Nome,,Email\nAna,,ana@example.com",
        check(sheet) { assert.deepEqual(sheet.headers, ["Nome", "Coluna B", "Email"]); assert.equal(sheet.emailColumn, 2); },
    },
    {
        id: "CF-IMPORT-09", text: `${Array.from({ length: 19 }, (_, index) => `nota${index}`).join("\n")}\nEmail\nana@example.com`,
        check(sheet) { assert.equal(sheet.emailColumn, 0); assert.equal(sheet.rows[0].values[0], "ana@example.com"); assert.equal(sheet.rows[0].sourceRow, 21); },
    },
    {
        id: "CF-IMPORT-10", text: `Email\n${Array.from({ length: 25 }, (_, index) => `u${index}@example.com`).join("\n")}`,
        check(sheet) { assert.equal(sheet.rows.length, 25); assert.equal(sheet.rows.at(-1).sourceRow, 26); },
    },
    {
        id: "CF-IMPORT-11", text: "Nome,Contato\nAna,ana@example.com\nBia,bia@example.com\nCris,cris@example.com",
        check(sheet) { assert.equal(sheet.emailColumn, 1); },
    },
    {
        id: "CF-IMPORT-12", text: `Email,Nome\n${Array.from({ length: 10000 }, (_, index) => `u${index}@example.com,U${index}`).join("\n")}`,
        check(sheet) { assert.equal(sheet.rows.length, 10000); assert.equal(sheet.rows.at(-1).sourceRow, 10001); },
    },
    {
        id: "CF-IMPORT-13", text: "Email,Nome\nana@example.com,Ana", size: 10 * 1024 * 1024,
        check(sheet) { assert.equal(sheet.rows.length, 1); },
    },
];
for (const scenario of importCases) {
    test(`${scenario.id}: importa CSV e classifica a estrutura`, async () => {
        const sheet = await readCredentialFile(makeFile({ text: scenario.text, size: scenario.size }));
        assert.equal(sheet.fileName, "usuarios.csv");
        assert.equal(sheet.sheetName, "Sheet1");
        scenario.check(sheet);
    });
}

const rejectionCases = [
    ["CF-REJECT-01", null, /Selecione um arquivo/],
    ["CF-REJECT-02", makeFile({ name: "usuarios.txt", text: "dados" }), /CSV ou XLSX/],
    ["CF-REJECT-03", makeFile({ name: "usuarios.CSV", size: 0 }), /vazio/],
    ["CF-REJECT-04", makeFile({ name: "usuarios.csv", size: 10 * 1024 * 1024 + 1 }), /10 MB/],
    ["CF-REJECT-05", makeFile({ name: "usuarios.csv", text: `Email\n${Array.from({ length: 10001 }, (_, index) => `u${index}@example.com`).join("\n")}` }), /10\.000 linhas de dados/],
    ["CF-REJECT-06", makeFile({ name: "usuarios.csv", text: `Email\n${Array.from({ length: 10020 }, (_, index) => `u${index}@example.com`).join("\n")}` }), /excede o limite de 10\.000 linhas/],
];
for (const [id, file, expectedError] of rejectionCases.slice(0, 6)) {
    test(`${id}: rejeita arquivo ausente, formato ou limite inválido`, async () => {
        await assert.rejects(readCredentialFile(file), expectedError);
    });
}

test("CF-IMPORT-XLSX-01: lê a primeira aba XLSX e ignora abas posteriores", async () => {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Email", "Nome"], ["ana@example.com", "Ana"]]), "Equipe");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Email"], ["segunda@example.com"]]), "Outra");
    const bytes = new Uint8Array(XLSX.write(workbook, { bookType: "xlsx", type: "array" }));
    const sheet = await readCredentialFile(makeFile({ name: "lista.xlsx", bytes }));
    assert.equal(sheet.sheetName, "Equipe");
    assert.equal(sheet.rows.length, 1);
    assert.equal(sheet.rows[0].values[0], "ana@example.com");
});

test("CF-IMPORT-XLSX-02: identifica a coluna de e-mail de uma planilha sem cabeçalho canônico", async () => {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Funcionário", "Contato"], ["Ana", "ana@example.com"]]), "Dados");
    const bytes = new Uint8Array(XLSX.write(workbook, { bookType: "xlsx", type: "array" }));
    const sheet = await readCredentialFile(makeFile({ name: "lista.xlsx", bytes }));
    assert.equal(sheet.emailColumn, 1);
    assert.equal(sheet.headers[0], "Funcionário");
});

const buildRowsCases = [
    ["CF-ROWS-01", "ana@example.com", "generated"],
    ["CF-ROWS-02", " Ana@Example.com ", "generated"],
    ["CF-ROWS-03", "", "omit"],
    ["CF-ROWS-04", "   ", "omit"],
    ["CF-ROWS-05", "ana.example.com", "invalid"],
    ["CF-ROWS-06", "@example.com", "invalid"],
    ["CF-ROWS-07", "ana@", "invalid"],
    ["CF-ROWS-08", "ana@example", "invalid"],
    ["CF-ROWS-09", "ana@@example.com", "invalid"],
    ["CF-ROWS-10", "ana @example.com", "invalid"],
    ["CF-ROWS-11", "ana@example .com", "invalid"],
    ["CF-ROWS-12", "ana@example.com", "generated"],
];
for (const [id, email, expectedStatus] of buildRowsCases) {
    test(`${id}: valida, omite ou gera senha para ${JSON.stringify(email)}`, (t) => {
        const crypto = installDeterministicCrypto();
        t.after(crypto.restore);
        const result = buildCredentialRows({ rows: [{ sourceRow: 7, values: [email] }] }, 0, { size: 12 });
        if (expectedStatus === "omit") {
            assert.deepEqual(result, []);
            return;
        }
        assert.equal(result[0].status, expectedStatus);
        assert.equal(result[0].sourceRow, 7);
        assert.equal(result[0].email, email.trim());
        if (expectedStatus === "generated") assert.equal(result[0].password.slice("mobile@".length).length, 12);
        else assert.equal(result[0].password, "");
    });
}

const emailValidationCases = [
    ["CF-EMAIL-01", "a@b.co", "generated"],
    ["CF-EMAIL-02", "first.last@example.com", "generated"],
    ["CF-EMAIL-03", "person+tag@example.com", "generated"],
    ["CF-EMAIL-04", "ana@sub.domain.com", "generated"],
    ["CF-EMAIL-05", "ana@example.c", "generated"],
    ["CF-EMAIL-06", " A@B.COM ", "generated"],
    ["CF-EMAIL-07", "ana@localhost", "invalid"],
    ["CF-EMAIL-08", "ana@example.com.br extra", "invalid"],
    ["CF-EMAIL-09", "ana@.com", "invalid"],
    ["CF-EMAIL-10", "ana@example..com", "generated"],
    ["CF-EMAIL-11", "ana b@example.com", "invalid"],
    ["CF-EMAIL-12", "ana@example.com\n", "generated"],
    ["CF-EMAIL-13", "ana@ex ample.com", "invalid"],
    ["CF-EMAIL-14", "ana@example.com.", "generated"],
    ["CF-EMAIL-15", "-@-.x", "generated"],
    ["CF-EMAIL-16", "ana@example,com", "invalid"],
];
for (const [id, email, expectedStatus] of emailValidationCases) {
    test(`${id}: aplica o formato de e-mail definido para a importação`, (t) => {
        const crypto = installDeterministicCrypto();
        t.after(crypto.restore);
        const [row] = buildCredentialRows({ rows: [{ sourceRow: 2, values: [email] }] }, 0, {});
        assert.equal(row.status, expectedStatus);
    });
}

test("CF-ROWS-13: marca e-mails repetidos ignorando maiúsculas e minúsculas", (t) => {
    const crypto = installDeterministicCrypto();
    t.after(crypto.restore);
    const result = buildCredentialRows({ rows: [
        { sourceRow: 2, values: ["ana@example.com"] },
        { sourceRow: 3, values: ["ANA@EXAMPLE.COM"] },
        { sourceRow: 4, values: ["bia@example.com"] },
    ] }, 0, {});
    assert.deepEqual(result.map((row) => row.status), ["duplicate", "duplicate", "generated"]);
    assert.equal(result[0].password, "");
    assert.equal(result[1].password, "");
});

test("CF-ROWS-14: inválidos não ocupam a chave de deduplicação e linhas válidas seguintes geram senha", (t) => {
    const crypto = installDeterministicCrypto();
    t.after(crypto.restore);
    const result = buildCredentialRows({ rows: [
        { sourceRow: 2, values: ["ana@example"] },
        { sourceRow: 3, values: ["ana@example.com"] },
        { sourceRow: 4, values: ["ana@example.com"] },
    ] }, 0, {});
    assert.deepEqual(result.map((row) => row.status), ["invalid", "duplicate", "duplicate"]);
});

test("CF-ROWS-15: lê a coluna selecionada e preserva linhas de origem", (t) => {
    const crypto = installDeterministicCrypto();
    t.after(crypto.restore);
    const result = buildCredentialRows({ rows: [
        { sourceRow: 5, values: ["Ana", "ana@example.com"] },
        { sourceRow: 6, values: ["Bia", "bia@example.com"] },
    ] }, 1, { prefix: "Batch", onlyUpper: true, special: true, size: 16 });
    assert.deepEqual(result.map((row) => row.sourceRow), [5, 6]);
    assert.equal(result.every((row) => row.status === "generated" && row.password.startsWith("Batch@")), true);
    assert.equal(result.every((row) => /[A-Z]/.test(row.password) && /\d/.test(row.password) && /[!@#$&]/.test(row.password)), true);
});

const filenameCases = [
    ["Usuários Médicos.xlsx", "credenciais-usuarios-medicos"],
    ["dados.csv", "credenciais-dados"],
    ["Equipe Final 2026.CSV", "credenciais-equipe-final-2026"],
    ["relatório_01.xlsx", "credenciais-relatorio_01"],
    ["a.b.csv", "credenciais-a-b"],
    ["---.csv", "credenciais-geradas"],
    ["", "credenciais-geradas"],
    [null, "credenciais-credenciais"],
    ["../../Segredo.csv", "credenciais-segredo"],
    ["nome com espaços.xlsx", "credenciais-nome-com-espacos"],
];
filenameCases.forEach(([input, expected], index) => {
    test(`CF-FILENAME-${index + 1}: sanitiza nome de exportação`, () => {
        assert.equal(credentialFilenameBase(input), expected);
    });
});

test("CF-EXPORT-CSV-01: exporta UTF-8 com BOM, aspas, vírgulas e proteção de fórmulas", async (t) => {
    const browser = installDownloadMocks();
    t.after(browser.restore);
    await downloadCredentials([
        { email: '=cmd@example.com', password: '+pass,"1"' },
        { email: "ana@example.com", password: "-começo" },
        { email: "bia@example.com", password: "@comando" },
    ], "csv", "credenciais-equipe");
    assert.deepEqual(browser.clicks.map((click) => click.download), ["credenciais-equipe.csv"]);
    const blob = browser.blobs.get(browser.clicks[0].href);
    assert.equal(blob.type, "text/csv;charset=utf-8");
    assert.deepEqual([...new Uint8Array(await blob.arrayBuffer()).slice(0, 3)], [0xef, 0xbb, 0xbf]);
    assert.match(await blob.text(), /'=cmd@example\.com/);
    assert.match(await blob.text(), /"'\+pass,""1"""/);
    assert.match(await blob.text(), /"'-começo"/);
    assert.match(await blob.text(), /"'@comando"/);
});

test("CF-EXPORT-MD-01: escapa barra, pipe e quebra de linha em células Markdown", async (t) => {
    const browser = installDownloadMocks();
    t.after(browser.restore);
    await downloadCredentials([{ email: "ana|bia@example.com", password: "linha\\um\nlinha|dois" }], "md", "credenciais");
    const blob = browser.blobs.get(browser.clicks[0].href);
    assert.equal(blob.type, "text/markdown;charset=utf-8");
    assert.match(await blob.text(), /ana\\\|bia@example\.com/);
    assert.match(await blob.text(), /linha\\\\um linha\\\|dois/);
});

test("CF-EXPORT-XLSX-01: exporta XLSX com cabeçalho, aba e credenciais legíveis", async (t) => {
    const browser = installDownloadMocks();
    t.after(browser.restore);
    await downloadCredentials([{ email: "ana@example.com", password: "SenhaA1" }], "xlsx", "lote");
    assert.equal(browser.clicks[0].download, "lote.xlsx");
    const blob = browser.blobs.get(browser.clicks[0].href);
    assert.match(blob.type, /spreadsheetml/);
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(await blob.arrayBuffer(), { type: "array" });
    assert.deepEqual(XLSX.utils.sheet_to_json(workbook.Sheets.Credenciais, { header: 1 }), [
        ["E-mail", "Senha"], ["ana@example.com", "SenhaA1"],
    ]);
});

test("CF-EXPORT-EMPTY-01: CSV, Markdown e XLSX aceitam lista vazia com cabeçalhos", async (t) => {
    const browser = installDownloadMocks();
    t.after(browser.restore);
    await downloadCredentials([], "csv", "vazio");
    await downloadCredentials([], "md", "vazio");
    await downloadCredentials([], "xlsx", "vazio");
    assert.deepEqual(browser.clicks.map(({ download }) => download), ["vazio.csv", "vazio.md", "vazio.xlsx"]);
    assert.match(await browser.blobs.get(browser.clicks[0].href).text(), /E-mail/);
    assert.match(await browser.blobs.get(browser.clicks[1].href).text(), /\| --- \| --- \|/);
});
