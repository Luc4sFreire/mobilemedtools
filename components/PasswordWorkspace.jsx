import { useState } from 'react';
import PasswordDefault from './subcomponents/PasswordDefault';
import "../style/password.css";
import PasswordImplantacao from './subcomponents/PasswordImplantacao';

function PasswordWorspace(){
    const [activeMode, setActiveMode] = useState("padrao");
    const modes = [
        { id: "padrao", label: "Padrão" },
        { id: "implantacao", label: "Implantação" },
        { id: "avancado", label: "Avançado" },
    ];
    const modeComponents = {
        padrao: <PasswordDefault />,
        implantacao: "Em breve",
        avancado: "Em breve",
    };

    return(
        <>
            <main>
                <h1>Gerador de Senha</h1>
                <p>Personalize as opções para gerar suas senhas</p>
                <header className="passwordModes">
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
                </header>

                {modeComponents[activeMode]}
            </main>
        </>
    )
}

export default PasswordWorspace;