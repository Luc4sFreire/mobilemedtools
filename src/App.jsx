// Tela principal do módulo de ferramentas médicas.
import { useEffect, useState } from "react";
import Header from "../components/Header";
import PasswordWorspace from "../components/PasswordWorkspace";
import SignatureWorkspace from "../components/SignatureWorkspace";
import { NotificationProvider } from "../components/ui/NotificationProvider";

// Mantém o ponto de composição da aplicação disponível para futuras telas/rotas.
function App() {
  const [activeComponent, setActiveComponent] = useState("signature");
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = window.localStorage.getItem("mobilemedtools.theme");
      return savedTheme === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem("mobilemedtools.theme", theme);
    } catch {
      // A interface continua utilizável mesmo quando o navegador bloqueia o armazenamento local.
    }
  }, [theme]);

  const activeToolLabel = activeComponent === "signature" ? "Gerador de assinatura" : "Gerador de senhas";

  return (
    <div className="app-shell" data-theme={theme}>
      <NotificationProvider>
        <Header
          activeComponent={activeComponent}
          onSelectComponent={setActiveComponent}
          theme={theme}
          onToggleTheme={() => setTheme((currentTheme) => currentTheme === "dark" ? "light" : "dark")}
        />
        <div className="app-main">
          <div className="app-topbar">
            <div className="app-breadcrumb" aria-live="polite">
              <span>Ferramentas</span>
              <span className="app-breadcrumb__separator" aria-hidden="true">/</span>
              <strong>{activeToolLabel}</strong>
            </div>
            <div className="app-local-status">
              <span aria-hidden="true" />
              Processamento no navegador
            </div>
          </div>
          <div className="app-content">
            {/* Renderiza o fluxo completo de criação e exportação da assinatura. */}
            {activeComponent === "signature" ? <SignatureWorkspace /> : <PasswordWorspace />}
          </div>
        </div>
      </NotificationProvider>
    </div>
  );
}

// Componente raiz importado pelo ponto de entrada React.
export default App;
