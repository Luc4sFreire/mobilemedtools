import { usePasswordEditor } from '../hooks/usePasswordEditor';

function PasswordWorkspace({ props }) {
  // O módulo ainda funciona como leitor de planilha, exposto para validar o fluxo de importação antes do processamento real das senhas.
  const { error, file, handleFileChange, workbook } = usePasswordEditor();

  return (
    <div id="password-workspace" style={{ display: props }}>
      <label htmlFor="user-input">Selecione uma planilha</label>
      <input accept=".xls,.xlsx,.xlsm,.xlsb,.csv" id="user-input" type="file" onChange={handleFileChange} />
      {file && <p>{file.name}</p>}
      {workbook && <p>Planilha carregada: {workbook.SheetNames?.join(', ') || 'arquivo pronto para processamento'}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

export default PasswordWorkspace;