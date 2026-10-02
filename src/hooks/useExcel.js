import ExcelJS from 'exceljs';
import { useState } from 'react';

export function useExcel() {
    const [worksheet, setWorksheet] = useState(null);
    const [values, setValues] = useState([]);

    // Leitura experimental: carrega a primeira aba e inspeciona seus valores no console.
    async function readerExcel(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(await file.arrayBuffer());
        const ws = workbook.getWorksheet();
        setWorksheet(ws);

        // console.log(ws.getSheetValues());
    }
    

    function getWorksheet() {
        if (worksheet !== null) {
            worksheet.eachRow((row, rowNumber) => {
                if(rowNumber === 1) return; // Ignora a primeira linha (cabeçalho)
                setValues(prev => [...prev, row.values.slice(1)]); // Remove o primeiro elemento (índice 0) que é undefined
            });
        }
    }

    function dataClear() {
        for(let i = 0; i < values.length; i++) {
            for(let j = 0; j < values[i].length; j++) {
                if(j == 1){
                    console.log(values[i][j]);
                }
            }
        }
    }

    return { worksheet, readerExcel, getWorksheet, dataClear };
}