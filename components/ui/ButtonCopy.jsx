import { useNotifications } from "./useNotifications"
import './style/buttonCopy.css'

// Botão reutilizável de cópia com confirmação visual temporária.
function ButtonCopy({ text }){
    const { notifySuccess, notifyError } = useNotifications()

    // Copia o conteúdo recebido e informa o resultado como notificação global.
    async function copyText(){
        try{
            await navigator.clipboard.writeText(text);
            notifySuccess("Senha copiada!", "O texto já está pronto para colar.")
        }catch(err){
            console.error('Falha ao copiar o texto: ', err);
            notifyError("Não foi possível copiar.", "Verifique a permissão da área de transferência e tente novamente.")
        }
    }

    return(
        <button type="button" className="btn-copy" onClick={copyText} aria-label="Copiar senha">
            <div></div>
        </button>
    )
}

export default ButtonCopy;
