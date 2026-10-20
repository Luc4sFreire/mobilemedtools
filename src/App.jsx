// Tela principal do módulo de ferramentas médicas.
import { useState } from "react";
import Header from "../components/Header";
import PasswordWorspace from "../components/PasswordWorkspace";
import SignatureWorkspace from "../components/SignatureWorkspace";

// Mantém o ponto de composição da aplicação disponível para futuras telas/rotas.
function App() {
  const [activeComponent, setActiveComponent] = useState("signature");

  return (
    <>
      <Header onSelectComponent={setActiveComponent} />
      {/* Renderiza o fluxo completo de criação e exportação da assinatura. */}
      {activeComponent === "signature" ? <SignatureWorkspace /> : <PasswordWorspace />}
    </>
  );
}

// Componente raiz importado pelo ponto de entrada React.
export default App;
