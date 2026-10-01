import { useState } from 'react';
import * as XLSX from 'xlsx';

export function usePasswordEditor() {
  // Estado do módulo auxiliar de importação de planilhas: ele valida o arquivo carregado e mantém o workbook do SheetJS para processamento posterior.
  const [file, setFile] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [error, setError] = useState('');

  async function handleFileChange(event) {
    const selectedFile = event.currentTarget.files?.[0] ?? null;
    setFile(selectedFile);
    setWorkbook(null);
    setError('');

    if (!selectedFile) return;

    try {
      const data = await selectedFile.arrayBuffer();
      const workbookData = XLSX.read(data, { type: 'array' });
      setWorkbook(workbookData);
    } catch {
      setError('Não foi possível ler esta planilha. Verifique o arquivo e tente novamente.');
    }
  }

  return { error, file, handleFileChange, workbook };
}