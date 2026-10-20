import { useEffect, useRef, useState } from "react";
import './style/buttonCopy.css'

function ButtonCopy({ text }){
    const [copy, setCopy] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const timeoutRef = useRef(null);

    useEffect(() => {
        return () => clearTimeout(timeoutRef.current);
    }, []);

    async function copyText(){
        try{
            await navigator.clipboard.writeText(text);
            clearTimeout(timeoutRef.current);
            setIsExiting(false);
            setCopy(true);

            timeoutRef.current = setTimeout(() => {
                setIsExiting(true);
                timeoutRef.current = setTimeout(() => {
                    setCopy(false);
                    setIsExiting(false);
                }, 250);
            }, 2000);
        }catch(err){
            console.error('Falha ao copiar o texto: ', err);
        }
    }

    return(
        <>
            <button id="btnCopy" onClick={copyText}><div></div></button>
            {copy ? <span id="success" className={isExiting ? "exiting" : ""}>Senha copiada com sucesso!</span>:''}
        </>
    )
}

export default ButtonCopy;