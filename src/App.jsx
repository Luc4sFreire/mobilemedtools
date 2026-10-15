// Tela principal do módulo de ferramentas médicas.
import SignatureWorkspace from "../components/SignatureWorkspace";

// Mantém o ponto de composição da aplicação disponível para futuras telas/rotas.
function App() {
  return (
    <>
      {/* Renderiza o fluxo completo de criação e exportação da assinatura. */}
      <SignatureWorkspace />
    </>
  );
}

// Componente raiz importado pelo ponto de entrada React.
export default App;
