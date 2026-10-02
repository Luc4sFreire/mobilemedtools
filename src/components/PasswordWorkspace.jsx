import { useExcel } from "../hooks/useExcel";

function PasswordWorkspace({ props }) {
  const { readerExcel, getWorksheet, dataClear } = useExcel();
  return (
    <div id="password-workspace" style={{ display: props }}>
      {/* A leitura da primeira planilha está em validação; os dados ainda não são exibidos na tela. */}
      <p>Módulo de senhas em desenvolvimento.</p>
      <input type="file" onChange={readerExcel} accept=".xlsx" />
      <button onClick={getWorksheet}>Exibir dados da planilha</button>
      <button onClick={dataClear}>Limpar dados</button>
    </div>
  );
}

export default PasswordWorkspace;