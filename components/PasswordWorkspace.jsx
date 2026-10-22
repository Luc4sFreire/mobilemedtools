import { useState } from 'react';
import PasswordDefault from './subcomponents/PasswordDefault';
import "../src/style/password.css";
import PasswordImplantacao from './subcomponents/PasswordImplantacao';
import PasswordAvancado from './subcomponents/PasswordAvancado';

// Controla a seleção entre os três fluxos e apresenta somente o modo ativo.
function PasswordWorspace(){
    const [activeMode, setActiveMode] = useState("padrao");
    // Os identificadores também são usados como chaves de seleção e renderização.
    const modes = [
        { id: "padrao", label: "Padrão" },
        { id: "implantacao", label: "Implantação" },
        { id: "avancado", label: "Avançado" },
    ];
    // Relaciona cada identificador de modo ao componente que implementa seu fluxo.
    const modeComponents = {
        padrao: <PasswordDefault />,
        implantacao: <PasswordImplantacao />,
        avancado: <PasswordAvancado />,
    };

    return(
        <>
            <main className="workspace-main password-workspace">
                <section className="page-intro">
                    <span className="workspace-kicker">FERRAMENTA 02 · ACESSOS</span>
                    <h1>Gerador de senhas</h1>
                    <p>Configure e gere acessos com as opções necessárias para cada equipe.</p>
                </section>
                {/* Botões de modo informam visualmente e via aria-pressed a seleção atual. */}
                <nav className="passwordModes" aria-label="Modo do gerador de senhas">
                    {modes.map((mode) => (
                        <button
                            key={mode.id}
                            type="button"
                            className={activeMode === mode.id ? "active" : ""}
                            aria-pressed={activeMode === mode.id}
                            onClick={() => setActiveMode(mode.id)}
                        >
                            {mode.label}
                        </button>
                    ))}
                </nav>

                {/* Exibe o componente associado ao modo ativo. */}
                {modeComponents[activeMode]}
            </main>
        </>
    )
}

export default PasswordWorspace;
