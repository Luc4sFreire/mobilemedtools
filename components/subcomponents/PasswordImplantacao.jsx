import "../../style/password.css"
import { usePassword } from "../../hooks/usePassword";
import Toggle from "../ui/Toggle";
import ButtonCopy from "../ui/ButtonCopy";

function PasswordImplantacao(){
    const pass = usePassword();
    // console.log(pass.pass)
    return(
        <>
            <section className="default">
                <div className="labels">
                    <label htmlFor="prefix">Prefixo da Senha</label>
                    <div className="infoLabel">
                        <input
                            id="prefix"
                            type="text"
                            value={pass.prefix}
                            onChange={pass.handlePrefix}
                        />
                        <button 
                            onClick={() => pass.setPrefix("Mobile")}
                            id="reload"
                        ><div></div></button>
                    </div>
                </div>
                <div className="labels">
                    <div className="range-heading">
                        <label htmlFor="numPass">Quantidade de Senhas</label>
                        <output className="range-value" htmlFor="numPass">{pass.qtde}</output>
                    </div>
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
                <div className="labels">
                    <div className="range-heading">
                        <label htmlFor="sizePass">Comprimento (depois do @)</label>
                        <output className="range-value" htmlFor="sizePass">{pass.size}</output>
                    </div>
                    <input 
                        id="sizePass"
                        type="range" 
                        value={pass.size}
                        min={4}
                        max={20}
                        step={1}
                        onChange={pass.handleSizePass}
                        className="range-slider"
                        style={{ "--range-progress": `${((pass.size - 4) / 16) * 100}%` }}
                    />
                </div>
                <div className="labels" id="caracPass">
                    <label htmlFor="caracPass">Incluir Caracteres Especiais</label>
                    <Toggle checked={pass.special} onChange={pass.handleSpecial} />
                </div>
                <div className="labels" id="upperPass">
                    <label htmlFor="upperPass">Apenas Letras Maiúsculas</label>
                    <Toggle checked={pass.onlyUpper} onChange={pass.handleOnlyUpper} />
                </div>
                <button onClick={pass.generatePass}>Gerar Novas Senhas</button>
            </section>
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

export default PasswordImplantacao;