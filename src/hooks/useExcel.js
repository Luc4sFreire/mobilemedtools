import ExcelJS from 'exceljs';
import { useState } from 'react';

export function useExcel() {
    const [worksheet, setWorksheet] = useState(null);

    // Leitura experimental: carrega a primeira aba e inspeciona seus valores no console.
    async function readerExcel(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(await file.arrayBuffer());
        const ws = workbook.getWorksheet(1);
        setWorksheet(ws);

        console.log(ws.getSheetValues());

        // ws.eachRow((row, rowNumber) => {
        //     if(rowNumber === 1) return; // Skip header row
        //     const rowData = row.values.slice(1);
        //     console.log(rowData);
        // })
    }

    return { worksheet, readerExcel };
}