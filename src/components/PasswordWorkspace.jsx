import { useExcel } from "../hooks/useExcel";

function PasswordWorkspace({ props }) {
  const { readerExcel } = useExcel();
  return (
    <div id="password-workspace" style={{ display: props }}>
      {/* A leitura da primeira planilha está em validação; os dados ainda não são exibidos na tela. */}
      <p>Módulo de senhas em desenvolvimento.</p>
      <input type="file" onChange={readerExcel} accept=".xlsx" />
    </div>
  );
}

export default PasswordWorkspace;