// Raiz da interface: mantém a ferramenta selecionada, o tema e os provedores globais.
import { useEffect, useState } from "react";
import Header from "../components/Header";
import PasswordWorspace from "../components/PasswordWorkspace";
import SignatureWorkspace from "../components/SignatureWorkspace";
import { NotificationProvider } from "../components/ui/NotificationProvider";

// Mantém o ponto de composição da aplicação disponível para futuras telas/rotas.
function App() {
  // A seleção vive apenas nesta sessão; a primeira ferramenta aberta é Assinatura.
  const [activeComponent, setActiveComponent] = useState("signature");
  // Inicializa o tema a partir da preferência local e usa claro se o acesso falhar.
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = window.localStorage.getItem("mobilemedtools.theme");
      return savedTheme === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  // Persiste alterações do tema sem impedir o uso quando localStorage está bloqueado.
  useEffect(() => {
    try {
      window.localStorage.setItem("mobilemedtools.theme", theme);
    } catch {
      // A interface continua utilizável mesmo quando o navegador bloqueia o armazenamento local.
    }
  }, [theme]);

  // Mantém o título do breadcrumb alinhado à ferramenta atualmente exibida.
  const activeToolLabel = activeComponent === "signature" ? "Gerador de assinatura" : "Gerador de senhas";

  return (
    <div className="app-shell" data-theme={theme}>
      {/* O provedor envolve toda a interface para disponibilizar notificações globais. */}
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
            {/* <div className="app-local-status">
              <span aria-hidden="true" />
              Processamento no navegador
            </div> */}
          </div>
          <div className="app-content">
            {/* Renderiza o fluxo completo de criação e exportação da assinatura. */}
            {/* Neste ponto apenas assinatura e senhas estão conectadas à navegação. */}
            {activeComponent === "signature" ? <SignatureWorkspace /> : <PasswordWorspace />}
          </div>
        </div>
      </NotificationProvider>
    </div>
  );
}

// Componente raiz importado pelo ponto de entrada React.
export default App;
