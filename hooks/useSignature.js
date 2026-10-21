import { useEffect, useRef, useState } from "react"
import { composeSignature } from "../utils/composeSignature"
import { PADRAO, processImage } from "../utils/processImage"
import { useNotifications } from "../components/ui/useNotifications"

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
const MAX_IMAGE_BYTES = 12 * 1024 * 1024
const MAX_IMAGE_PIXELS = 12_000_000
const MAX_PHRASES = 5

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
    const { notifySuccess, notifyError } = useNotifications()
    // Estado da imagem fonte, resultado processado, preview e mensagens de erro.
    const [file, setFile] = useState(null)
    const [fileUrl, setFileUrl] = useState("")
    const [previewUrl, setPreviewUrl] = useState("")
    const [compositionErrorKey, setCompositionErrorKey] = useState("")
    const [previewCompositionKey, setPreviewCompositionKey] = useState("")
    const [processedImageKey, setProcessedImageKey] = useState("")
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
    const [professionalName, setProfessionalNameState] = useState("")
    const [credentialValue, setCredentialValueState] = useState("")
    const [formatCredentials, setFormatCredentials] = useState("default")
    const [rqeValue, setRqeValueState] = useState("")
    const [formatCredentialsRQE, setFormatCredentialsRQE] = useState("default")
    const [addRQE, setAddRQE] = useState(false)
    const [addExtraPhrase, setAddExtraPhraseState] = useState(false)
    const [extraPhrase, setExtraPhrase] = useState("")
    const [extraPhrase2, setExtraPhrase2] = useState("")
    const [specialty, setSpecialtyState] = useState("")
    const [addSpecialty, setAddSpecialty] = useState(false)
    const [checkedItems, setCheckedItems] = useState([]);
    const [phrases, setPhrases] = useState([]);
    // Os valores digitados só entram na composição depois que um campo perde foco.
    const [previewInfo, setPreviewInfo] = useState({
        professionalName: "",
        credentialValue: "",
        rqeValue: "",
        specialty: "",
        phrases: [],
    })
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
        previewInfo.professionalName,
        previewInfo.credentialValue,
        typeP.credentials,
        formatCredentials,
        addRQE,
        previewInfo.rqeValue,
        formatCredentialsRQE,
        addSpecialty,
        previewInfo.specialty,
        addExtraPhrase,
        previewInfo.phrases.map((phrase) => phrase.value),
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

                const pixelCount = image.naturalWidth * image.naturalHeight
                if (!image.naturalWidth || !image.naturalHeight || pixelCount > MAX_IMAGE_PIXELS) {
                    throw new Error("A imagem excede o limite de 12 megapixels. Reduza a resolução e tente novamente.")
                }

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
                setProcessingErrorKey("")
            } catch (error) {
                // Só relata falhas da execução atual, evitando erros atrasados/confusos.
                if (!isCurrent || processingId !== processingIdRef.current) return
                setProcessingErrorKey(processingKey)
                notifyError(
                    "Falha ao processar a imagem.",
                    error instanceof Error ? error.message : "O navegador não conseguiu processar a imagem selecionada."
                )
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
    }, [file, imageOptions, processingKey, notifyError])

    // Recompõe a prévia quando muda a saída processada, dados do profissional ou escala.
    useEffect(() => {
        if (!fileUrl || processedImageKey !== processingKey) return

        let isCurrent = true
        // Esta lista determina a ordem visual das linhas no PNG composto.
        const details = []
        const name = previewInfo.professionalName.trim()
        const credential = formatCredential(previewInfo.credentialValue, typeP.credentials, formatCredentials)

        if (name) details.push({ text: name, emphasis: true })
        if (credential) details.push({ text: credential })
        if (addRQE) {
            const rqe = formatCredential(previewInfo.rqeValue, "RQE", formatCredentialsRQE)
            if (rqe) details.push({ text: rqe })
        }
        if (addSpecialty && previewInfo.specialty.trim()) {
            details.push({ text: previewInfo.specialty.trim() })
        }
        if (addExtraPhrase) {
            previewInfo.phrases.forEach((phrase) => {
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
                setCompositionErrorKey("")
            })
            .catch((error) => {
                // Informa a falha atual e invalida o preview que não representa mais o formulário.
                if (!isCurrent) return
                if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
                previewUrlRef.current = ""
                setPreviewUrl("")
                setCompositionErrorKey(compositionKey)
                notifyError(
                    "Falha ao montar a prévia.",
                    error instanceof Error ? error.message : "O navegador não conseguiu compor a assinatura."
                )
            })

        return () => {
            isCurrent = false
        }
    }, [
        fileUrl,
        processedImageKey,
        processingKey,
        previewInfo.professionalName,
        previewInfo.credentialValue,
        typeP.credentials,
        formatCredentials,
        addRQE,
        previewInfo.rqeValue,
        formatCredentialsRQE,
        addSpecialty,
        previewInfo.specialty,
        addExtraPhrase,
        previewInfo.phrases,
        imageOptions,
        imageScale,
        compositionKey,
        notifyError,
    ])

    /**
     * Valida o arquivo selecionado, libera previews antigos e inicia um novo ciclo.
     * Só aceita arquivos declarados pelo navegador como imagem.
     */
    function handleFile(event){
        const selectedFile = event.currentTarget.files?.[0]
        if(!selectedFile) return

        const acceptedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp", "image/avif"]
        let validationMessage = ""
        if (!acceptedTypes.includes(selectedFile.type)) {
            validationMessage = "Selecione uma imagem PNG, JPEG, WebP, GIF, BMP ou AVIF válida."
        } else if (selectedFile.size > MAX_IMAGE_BYTES) {
            validationMessage = "O arquivo excede o limite de 12 MB. Escolha uma imagem menor."
        }

        if (validationMessage) {
            // Invalida imediatamente qualquer processamento e prévia anteriores.
            processingIdRef.current += 1
            if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current)
            fileUrlRef.current = ""
            if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
            previewUrlRef.current = ""
            setFile(null)
            setFileUrl("")
            setPreviewUrl("")
            setProcessedImageKey("")
            setPreviewCompositionKey("")
            setProcessingErrorKey("")
            setCompositionErrorKey("")
            notifyError(
                validationMessage.startsWith("O arquivo")
                    ? "Imagem acima do limite."
                    : "Formato de imagem inválido.",
                validationMessage
            )
            event.currentTarget.value = ""
            return
        }

        processingIdRef.current += 1
        if(fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current)
        fileUrlRef.current = ""
        if(previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = ""
        setFile(selectedFile)
        setFileUrl("")
        setPreviewUrl("")
        setProcessedImageKey("")
        setSourceRevision((revision) => revision + 1)
    }

    // Atualiza uma opção sem sobrescrever as demais configurações de imagem.
    function setImageOption(name, value) {
        setImageOptions((currentOptions) => ({
            ...currentOptions,
            [name]: value,
        }))
    }

    // Limites alinhados ao espaço reduzido da imagem final.
    const setProfessionalName = (value) => setProfessionalNameState(value.slice(0, 100))
    const setCredentialValue = (value) => setCredentialValueState(value.slice(0, 40))
    const setRqeValue = (value) => setRqeValueState(value.slice(0, 40))
    const setSpecialty = (value) => setSpecialtyState(value.slice(0, 80))

    // Confirma os dados digitados quando qualquer campo de informação perde o foco.
    function commitProfessionalInfo() {
        const nextPreviewInfo = {
            professionalName,
            credentialValue,
            rqeValue,
            specialty,
            phrases: phrases
                .filter((phrase) => phrase.value.trim())
                .map((phrase) => ({ ...phrase, value: phrase.value.trim() })),
        }
        setPreviewInfo((currentInfo) =>
            JSON.stringify(currentInfo) === JSON.stringify(nextPreviewInfo)
                ? currentInfo
                : nextPreviewInfo
        )
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
            if (currentPhrases.length >= MAX_PHRASES) return currentPhrases
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
            phrase.id === id ? { ...phrase, value: value.slice(0, 120) } : phrase
        ))
    }

    // Remove a frase indicada, mantendo um campo vazio como mínimo da interface.
    function removePhrase(id){
        const nextPhrases = phrases.length > 1
            ? phrases.filter((phrase) => phrase.id !== id)
            : phrases.map((phrase) => ({ ...phrase, value: "" }))
        setPhrases(nextPhrases)
        setPreviewInfo((currentInfo) => ({
            ...currentInfo,
            phrases: nextPhrases
                .filter((phrase) => phrase.value.trim())
                .map((phrase) => ({ ...phrase, value: phrase.value.trim() })),
        }))
    }

    // Baixa o PNG final apenas se preview, processamento e opções estiverem atualizados.
    function downloadSignature() {
        if (!hasCurrentPreview || isProcessing || isComposing) return

        try {
            const link = document.createElement("a")
            const baseName = professionalName || "assinatura"
            link.href = previewUrl
            link.download = `Assinatura-${baseName}.png`
            document.body.appendChild(link)
            link.click()
            link.remove()
            notifySuccess("Download iniciado!", "A assinatura está sendo salva em PNG.")
        } catch (error) {
            console.error("Não foi possível baixar a assinatura:", error)
            notifyError("Não foi possível baixar a assinatura.", "Tente novamente em alguns instantes.")
        }
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
        isProcessing,
        isComposing,
        setImageOption,
        resetImageOptions,
        typeP,
        selectedProfessional,
        professionalName,
        setProfessionalName,
        credentialValue,
        setCredentialValue,
        commitProfessionalInfo,
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
