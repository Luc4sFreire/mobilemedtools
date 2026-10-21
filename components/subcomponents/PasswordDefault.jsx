import "../../style/password.css"
import { usePassword } from "../../hooks/usePassword";
import Toggle from "../ui/Toggle";
import ButtonCopy from "../ui/ButtonCopy";
import { useNotifications } from "../ui/useNotifications";

// Tela de geração individual sem associação de senhas a usuários.
function PasswordDefault(){
    const pass = usePassword({ loadSavedUsersOnMount: false });
    const { notifySuccess, notifyError } = useNotifications();

    function generatePasswords() {
        const result = pass.generatePass();
        if (result.success) notifySuccess(result.title, result.message);
        else notifyError(result.title, result.message);
    }

    return(
        <>
            {/* Opções aplicadas à próxima geração de senhas. */}
            <section className="default">
                <div className="labels password-config-prefix">
                    <label htmlFor="prefix">Prefixo opcional (máximo 24 caracteres)</label>
                    <div className="infoLabel">
                        <input
                            id="prefix"
                            type="text"
                            maxLength={24}
                            autoComplete="off"
                            value={pass.prefix}
                            onChange={pass.handlePrefix}
                        />
                        <button 
                            type="button"
                            aria-label="Limpar prefixo personalizado"
                            onClick={() => pass.setPrefix("")}
                            id="reload"
                        ><div></div></button>
                    </div>
                </div>
                <div className="labels password-config-count">
                    <div className="range-heading">
                        <label htmlFor="numPass">Quantidade de Senhas</label>
                        <output className="range-value" htmlFor="numPass">{pass.qtde}</output>
                    </div>
                    {/* O preenchimento do slider acompanha a proporção entre mínimo e máximo. */}
                    <input 
                        id="numPass"
                        type="range"
                        value={pass.qtde} 
                        min={1}
                        max={50}
                        step={1}
                        onChange={pass.handleNumPass}
                        className="range-slider"
                        style={{ "--range-progress": `${((pass.qtde - 1) / 49) * 100}%` }}
                    />
                </div>
                <div className="labels password-config-length">
                    <div className="range-heading">
                        <label htmlFor="sizePass">Comprimento aleatório</label>
                        <output className="range-value" htmlFor="sizePass">{pass.size}</output>
                    </div>
                    {/* Comprimento da trilha preenchida, calculado para a faixa de 4 a 32. */}
                    <input 
                        id="sizePass"
                        type="range" 
                        value={pass.size}
                        min={4}
                        max={32}
                        step={1}
                        onChange={pass.handleSizePass}
                        className="range-slider"
                        style={{ "--range-progress": `${((pass.size - 4) / 28) * 100}%` }}
                    />
                </div>
                {/* Opções booleanas ativam caracteres especiais ou removem minúsculas. */}
                <div className="labels password-config-special" id="caracPass">
                    <Toggle checked={pass.special} onChange={pass.handleSpecial} label="Incluir Caracteres Especiais" />
                </div>
                <div className="labels password-config-uppercase" id="upperPass">
                    <Toggle checked={pass.onlyUpper} onChange={pass.handleOnlyUpper} label="Apenas Letras Maiúsculas" />
                </div>
                <p className="input-hint password-config-hint">O prefixo padrão é “mobile” e não entra no comprimento aleatório. Prefixos são previsíveis.</p>
                <button className="password-config-generate" type="button" onClick={generatePasswords}>Gerar Novas Senhas</button>
            </section>
            {/* Resultados são atualizados a cada geração e copiados individualmente. */}
            <section className="result">
                <h2>Suas senhas geradas</h2>
                {pass.pass.map((password, index) => (
                    <div className="passwordResult" key={index}>
                        <p>{password}</p>
                        <ButtonCopy text={password} />
                    </div>
                ))}
            </section>
        </>
    )
}

export default PasswordDefault;
