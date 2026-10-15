import { useEffect, useRef, useState } from "react"
import { composeSignature } from "../utils/composeSignature"
import { PADRAO, processImage } from "../utils/processImage"

// Relaciona cada tipo de profissional com a sigla que será usada no registro.
const professionals = {
    doctor: { credentials: "CRM", placeholder: "Ex: CRM" },
    vet: { credentials: "CRMV", placeholder: "Ex: CRMV" },
    dentist: { credentials: "CRO", placeholder: "Ex: CRO" },
}

// Mantém as opções expostas na interface sincronizadas com o algoritmo de imagem.
const defaultImageOptions = {
    espessura: PADRAO.espessura,
    largura: PADRAO.largura,
    altura: PADRAO.altura,
    transparente: PADRAO.transparente,
    pretoPuro: PADRAO.pretoPuro,
    suavizar: PADRAO.suavizar,
}

const DEFAULT_IMAGE_SCALE = 100

/**
 * Normaliza o texto de um registro e formata-o conforme a apresentação escolhida.
 * O formato compacto acrescenta o estado informado ou usa RS como estado padrão.
 */
function formatCredential(value, label, format) {
    const normalizedValue = value.trim().replace(new RegExp(`^${label}\\s*[:/]?\\s*`, "i"), "")
    if (!normalizedValue) return ""
    if (format === "default") return `${label}: ${normalizedValue}`

    const state = normalizedValue.match(/(?:\/|\s)([A-Z]{2})$/i)?.[1]?.toUpperCase() || "RS"
    const number = normalizedValue.replace(/(?:\/|\s)[A-Z]{2}$/i, "").trim()
    return `${label}/${state} ${number || normalizedValue}`
}

/**
 * Hook que controla seleção e processamento da imagem, formulário profissional,
 * composição da prévia, tratamento de erros e download do PNG final.
 *
 * A fonte é preservada em `file` e reprocessada quando mudam as opções de imagem.
 * Chaves de versão impedem exibir ou baixar uma saída obsoleta.
 */
export function useSignature(){
    // Estado da imagem fonte, resultado processado, preview e mensagens de erro.
    const [file, setFile] = useState(null)
    const [fileUrl, setFileUrl] = useState("")
    const [previewUrl, setPreviewUrl] = useState("")
    const [errorMessage, setErrorMessage] = useState("")
    const [compositionError, setCompositionError] = useState("")
    const [compositionErrorKey, setCompositionErrorKey] = useState("")
    const [previewCompositionKey, setPreviewCompositionKey] = useState("")
    const [processedImageKey, setProcessedImageKey] = useState("")
    const [processingError, setProcessingError] = useState("")
    const [processingErrorKey, setProcessingErrorKey] = useState("")
    const [sourceRevision, setSourceRevision] = useState(0)
    // Refs guardam URLs temporárias e IDs sem provocar renderizações por si mesmos.
    const fileUrlRef = useRef("")
    const previewUrlRef = useRef("")
    const processingIdRef = useRef(0)
    // Preferências do algoritmo e escala de exibição da assinatura na composição.
    const [imageOptions, setImageOptions] = useState(defaultImageOptions)
    const [imageScale, setImageScale] = useState(DEFAULT_IMAGE_SCALE)
    const [selectedProfessional, setSelectedProfessional] = useState("doctor")
    const [typeP, setTypeP] = useState(professionals.doctor)
    const [professionalName, setProfessionalName] = useState("")
    const [credentialValue, setCredentialValue] = useState("")
    const [formatCredentials, setFormatCredentials] = useState("default")
    const [rqeValue, setRqeValue] = useState("")
    const [formatCredentialsRQE, setFormatCredentialsRQE] = useState("default")
    const [addRQE, setAddRQE] = useState(false)
    const [addExtraPhrase, setAddExtraPhraseState] = useState(false)
    const [extraPhrase, setExtraPhrase] = useState("")
    const [extraPhrase2, setExtraPhrase2] = useState("")
    const [specialty, setSpecialty] = useState("")
    const [addSpecialty, setAddSpecialty] = useState(false)
    const [checkedItems, setCheckedItems] = useState([]);
    const [phrases, setPhrases] = useState([]);
    // Chave identifica se o arquivo foi processado para as opções atuais.
    const processingKey = JSON.stringify([sourceRevision, imageOptions])
    // Indica que o arquivo fonte existe, mas o resultado não está atualizado.
    const isProcessing = Boolean(
        file &&
        processedImageKey !== processingKey &&
        processingErrorKey !== processingKey
    )
    // Chave composta com todas as opções e dados que influenciam a imagem final.
    const compositionKey = JSON.stringify([
        fileUrl,
        processingKey,
        professionalName,
        credentialValue,
        typeP.credentials,
        formatCredentials,
        addRQE,
        rqeValue,
        formatCredentialsRQE,
        addSpecialty,
        specialty,
        addExtraPhrase,
        phrases.map((phrase) => [phrase.id, phrase.value]),
        imageScale,
    ])
    // Indica composição pendente quando os estados de preview ainda estão desatualizados.
    const isComposing = Boolean(
        fileUrl &&
        processedImageKey === processingKey &&
        previewCompositionKey !== compositionKey &&
        compositionErrorKey !== compositionKey
    )
    // O preview só é válido se corresponder simultaneamente ao processamento
    // e aos dados atuais, condição necessária também para liberar o download.
    const hasCurrentPreview = Boolean(
        previewUrl &&
        processedImageKey === processingKey &&
        previewCompositionKey === compositionKey
    )
    // Erros de versões antigas não devem continuar aparecendo após nova configuração.
    const visibleErrorMessage = processingErrorKey === processingKey
        ? processingError
        : compositionErrorKey === compositionKey
            ? compositionError
            : errorMessage

    // Invalida tarefas em andamento e libera as URLs temporárias ao desmontar o hook.
    useEffect(() => () => {
        processingIdRef.current += 1
        if(fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current)
        if(previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }, [])

    // Reprocessa a imagem original sempre que o arquivo ou suas opções mudam.
    useEffect(() => {
        if (!file) return

        // O identificador e a flag permitem descartar um resultado depois
        // que uma alteração do usuário iniciou uma execução mais recente.
        const processingId = ++processingIdRef.current
        let isCurrent = true
        const sourceUrl = URL.createObjectURL(file)

        // Decodifica o arquivo, aplica o algoritmo localmente e codifica novamente em PNG.
        async function processSelectedImage() {
            try {
                const image = new Image()
                await new Promise((resolve, reject) => {
                    image.onload = resolve
                    image.onerror = () => reject(new Error("Não foi possível abrir a imagem selecionada."))
                    image.src = sourceUrl
                })

                const canvas = document.createElement("canvas")
                canvas.width = image.naturalWidth
                canvas.height = image.naturalHeight

                // O contexto lê os pixels necessários ao processamento da imagem.
                const context = canvas.getContext("2d", { willReadFrequently: true })
                if (!context) {
                    throw new Error("Não foi possível preparar a imagem para processamento.")
                }

                context.drawImage(image, 0, 0)
                // O processador altera o canvas conforme as opções atuais.
                processImage(canvas, imageOptions)

                // Converte o canvas em Blob para apresentar a imagem por object URL.
                const processedBlob = await new Promise((resolve, reject) => {
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob)
                        } else {
                            reject(new Error("Não foi possível gerar a imagem processada."))
                        }
                    }, "image/png")
                })

                // Ignora o resultado caso outra configuração tenha iniciado processamento.
                if (!isCurrent || processingId !== processingIdRef.current) return

                // Publica a saída nova somente depois de produzida com sucesso.
                const processedUrl = URL.createObjectURL(processedBlob)
                if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current)
                fileUrlRef.current = processedUrl
                setFileUrl(processedUrl)
                setProcessedImageKey(processingKey)
                setProcessingError("")
                setProcessingErrorKey("")
                setErrorMessage("")
            } catch (error) {
                // Só relata falhas da execução atual, evitando erros atrasados/confusos.
                if (!isCurrent || processingId !== processingIdRef.current) return
                setProcessingError(error instanceof Error
                    ? error.message
                    : "Ocorreu um erro ao processar a imagem.")
                setProcessingErrorKey(processingKey)
            } finally {
                // A URL temporária da fonte deixa de ser necessária após o processamento.
                URL.revokeObjectURL(sourceUrl)
            }
        }

        void processSelectedImage()

        // Cleanup cancela logicamente a execução se arquivo ou opções forem alterados.
        return () => {
            isCurrent = false
        }
    }, [file, imageOptions, processingKey])

    // Recompõe a prévia quando muda a saída processada, dados do profissional ou escala.
    useEffect(() => {
        if (!fileUrl || processedImageKey !== processingKey) return

        let isCurrent = true
        // Esta lista determina a ordem visual das linhas no PNG composto.
        const details = []
        const name = professionalName.trim()
        const credential = formatCredential(credentialValue, typeP.credentials, formatCredentials)

        if (name) details.push({ text: name, emphasis: true })
        if (credential) details.push({ text: credential })
        if (addRQE) {
            const rqe = formatCredential(rqeValue, "RQE", formatCredentialsRQE)
            if (rqe) details.push({ text: rqe })
        }
        if (addSpecialty && specialty.trim()) {
            details.push({ text: specialty.trim() })
        }
        if (addExtraPhrase) {
            phrases.forEach((phrase) => {
                if (phrase.value?.trim()) details.push({ text: phrase.value.trim() })
            })
        }

        // A composição desenha texto e imagem e retorna um Blob PNG local.
        composeSignature(fileUrl, details, {
            transparente: imageOptions.transparente,
            escala: imageScale,
        })
            .then((blob) => {
                // Evita publicar uma composição se o formulário já mudou novamente.
                if (!isCurrent) return
                const nextPreviewUrl = URL.createObjectURL(blob)
                if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
                previewUrlRef.current = nextPreviewUrl
                setPreviewUrl(nextPreviewUrl)
                setPreviewCompositionKey(compositionKey)
                setCompositionError("")
                setCompositionErrorKey("")
            })
            .catch((error) => {
                // Informa a falha atual e invalida o preview que não representa mais o formulário.
                if (!isCurrent) return
                if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
                previewUrlRef.current = ""
                setPreviewUrl("")
                setCompositionError(error instanceof Error
                    ? error.message
                    : "Ocorreu um erro ao montar a imagem final.")
                setCompositionErrorKey(compositionKey)
            })

        return () => {
            isCurrent = false
        }
    }, [
        fileUrl,
        processedImageKey,
        processingKey,
        professionalName,
        credentialValue,
        typeP.credentials,
        formatCredentials,
        addRQE,
        rqeValue,
        formatCredentialsRQE,
        addSpecialty,
        specialty,
        addExtraPhrase,
        phrases,
        imageOptions,
        imageScale,
        compositionKey,
    ])

    /**
     * Valida o arquivo selecionado, libera previews antigos e inicia um novo ciclo.
     * Só aceita arquivos declarados pelo navegador como imagem.
     */
    function handleFile(event){
        const selectedFile = event.currentTarget.files?.[0]
        if(!selectedFile) return
        if(!selectedFile.type.startsWith("image/")){
            setErrorMessage("Selecione um arquivo de imagem.")
            event.currentTarget.value = ""
            return
        }

        if(fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current)
        fileUrlRef.current = ""
        if(previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = ""
        setFile(selectedFile)
        setFileUrl("")
        setPreviewUrl("")
        setProcessedImageKey("")
        setSourceRevision((revision) => revision + 1)
        setErrorMessage("")
    }

    // Atualiza uma opção sem sobrescrever as demais configurações de imagem.
    function setImageOption(name, value) {
        setImageOptions((currentOptions) => ({
            ...currentOptions,
            [name]: value,
        }))
    }

    // Restaura opções do algoritmo e escala de composição aos padrões do módulo.
    function resetImageOptions() {
        setImageOptions(defaultImageOptions)
        setImageScale(DEFAULT_IMAGE_SCALE)
    }

    // Seleciona o tipo profissional e atualiza a sigla de registro relacionada.
    function selectProfessional(event){
        const professional = event.currentTarget.value
        if(!professionals[professional]) return
        setSelectedProfessional(professional)
        setTypeP(professionals[professional])
    }

    // Guarda o formato escolhido para exibir o registro principal.
    function selectFormat(event){
        setFormatCredentials(event.currentTarget.value)
    }

    // Guarda o formato escolhido para exibir o RQE.
    function selectFormatRQE(event){
        setFormatCredentialsRQE(event.currentTarget.value)
    }

    // Ativa/desativa frases extras e garante o primeiro campo ao ativar.
    function setAddExtraPhrase(enabled) {
        setAddExtraPhraseState(enabled)
        if (enabled) {
            setPhrases((currentPhrases) => currentPhrases.length > 0
                ? currentPhrases
                : [{ id: 1, value: "" }]
            )
        }
    }

    // Mantém a seleção de filtros; no momento, ela ainda não altera o algoritmo.
    function checkFilters(e){
        const { value, checked } = e.target;

        if(checked){
            setCheckedItems([...checkedItems, value])
        }else{
            setCheckedItems(checkedItems.filter((item) => item !== value))
        }
    }

    // Intercepta o envio da seleção de filtros; implementação do filtro segue pendente.
    function handleSubmitFilters(e){
        e.preventDefault();
        // A aplicação dos filtros ainda está em desenvolvimento; por enquanto, somente registra a seleção.
        console.log("Itens selecionados: ", checkedItems)
    }

    // Acrescenta campo vazio com ID não reutilizado após remoções.
    function addPhrases(){
        setPhrases((currentPhrases) => {
            const nextId = currentPhrases.length > 0
                ? Math.max(...currentPhrases.map((phrase) => phrase.id)) + 1
                : 1

            return [
                ...currentPhrases,
                { id: nextId, value: "" },
            ]
        })
    }

    // Atualiza o texto da frase identificada sem substituir as outras frases.
    function updatePhrase(id, value){
        setPhrases((currentPhrases) => currentPhrases.map((phrase) =>
            phrase.id === id ? { ...phrase, value } : phrase
        ))
    }

    // Remove a frase indicada, mantendo um campo vazio como mínimo da interface.
    function removePhrase(id){
        setPhrases((currentPhrases) => currentPhrases.length > 1
            ? currentPhrases.filter((phrase) => phrase.id !== id)
            : currentPhrases.map((phrase) => ({ ...phrase, value: "" }))
        )
    }

    // Baixa o PNG final apenas se preview, processamento e opções estiverem atualizados.
    function downloadSignature() {
        if (!hasCurrentPreview || isProcessing || isComposing) return

        const link = document.createElement("a")
        const baseName = file?.name.replace(/\.[^.]+$/, "") || "assinatura"
        link.href = previewUrl
        link.download = `${baseName}-final.png`
        document.body.appendChild(link)
        link.click()
        link.remove()
    }

    // Expõe ao componente os estados necessários e seus manipuladores de eventos.
    return{
        file,
        fileUrl,
        previewUrl,
        hasCurrentPreview,
        imageOptions,
        imageScale,
        setImageScale,
        errorMessage: visibleErrorMessage,
        isProcessing,
        isComposing,
        setImageOption,
        resetImageOptions,
        setErrorMessage,
        typeP,
        selectedProfessional,
        professionalName,
        setProfessionalName,
        credentialValue,
        setCredentialValue,
        formatCredentials,
        rqeValue,
        setRqeValue,
        formatCredentialsRQE,
        addRQE,
        setAddRQE,
        addExtraPhrase,
        setAddExtraPhrase,
        extraPhrase,
        setExtraPhrase,
        extraPhrase2,
        setExtraPhrase2,
        specialty,
        setSpecialty,
        handleFile,
        selectProfessional,
        selectFormat,
        selectFormatRQE,
        handleSubmitFilters,
        checkFilters,
        checkedItems,
        addSpecialty,
        setAddSpecialty,
        addPhrases,
        phrases,
        updatePhrase,
        removePhrase,
        downloadSignature,
    }
}
