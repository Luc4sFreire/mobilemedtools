// Carrega o layout global e conecta os componentes ao estado e às ações do editor.
import './style/index.css';
import SignatureWorkspace from './components/SignatureWorkspace';
import { useState } from 'react';
import PasswordWorkspace from './components/PasswordWorkspace';

export default function App() {
  const [signatureStyle, setSignatureStyle] = useState('block');
  const [passwordStyle, setPasswordStyle] = useState('none');
  const [logoStyle, setLogoStyle] = useState('none');

  function handleStyle(e) {
    switch (e.target.id) {
      case 'signature-button':
        setSignatureStyle('block');
        setPasswordStyle('none');
        setLogoStyle('none');
        break;
      case 'password-button':
        setSignatureStyle('none');
        setPasswordStyle('block');
        setLogoStyle('none');
        break;
      case 'logo-button':
        setSignatureStyle('none');
        setPasswordStyle('none');
        setLogoStyle('block');
        break;
      default:
        break;
    }
  }

  return (
    <main className="app-shell">
      {/* Assinatura tem fluxo completo; Senhas está em leitura experimental e Logos segue como placeholder. */}
      <header className="app-header">
        <div>
          <h1>MobilemedTools</h1>
          <p className="eyebrow">FERRAMENTA DE ASSINATURA</p>
        </div>
        <div className="navbar">
          <button id="signature-button" onClick={handleStyle}>
            Assinatura
          </button>
          <button id="password-button" onClick={handleStyle}>
            Senhas
          </button>
          <button id="logo-button" onClick={handleStyle}>
            Logos
          </button>
        </div>
      </header>

      {/* A assinatura é o módulo principal e está pronto para edição e exportação em PNG. */}
      <SignatureWorkspace props={signatureStyle} />
      {/* O painel de senhas está em desenvolvimento e só expõe a leitura inicial da planilha. */}
      <PasswordWorkspace props={passwordStyle} />
      {/* O módulo de logos ainda não foi implementado; o placeholder mantém o estado da navegação consistente. */}
      <div id="logo-workspace" style={{ display: logoStyle }}>
        Módulo de logos em desenvolvimento.
      </div>
    </main>
  );
}
