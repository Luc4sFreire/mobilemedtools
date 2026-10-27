import { useEffect, useRef, useState } from "react"
import { composeSignature } from "../utils/composeSignature"
import { PADRAO, processImage } from "../utils/processImage"
import {
    addSignaturePhrase,
    buildSignatureDetails,
    moveSignatureDetail,
    removeSignaturePhrase,
    SIGNATURE_DETAIL_ORDER,
    updateSignaturePhrase,
    validateSignatureFile,
} from "../utils/signatureDetails"

const DEFAULT_IMAGE_SCALE = 100
const MAX_IMAGE_PIXELS = 12_000_000

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

export function useSingleSignature(notifyError, { allowReadyImage = false } = {}){
    // Estado de Form

    const [selectedProfessional, setSelectedProfessional] = useState("doctor")
    const [typeP, setTypeP] = useState(professionals.doctor)
    const [professionalName, setProfessionalNameState] = useState("")
    const [credentialValue, setCredentialValueState] = useState("")
    const [formatCredentials, setFormatCredentials] = useState("default")
    const [rqeValue, setRqeValueState] = useState("")
    const [formatCredentialsRQE, setFormatCredentialsRQE] = useState("default")
    const [addRQE, setAddRQE] = useState(false)
    const [addExtraPhrase, setAddExtraPhraseState] = useState(false)
    const [phrases, setPhrases] = useState([]); 
    const [specialty, setSpecialty] = useState(""); 
    const [addSpecialty, setAddSpecialty] = useState(false); 
    const [previewInfo, setPreviewInfo] = useState({
        professionalName: "",
        credentialValue: "",
        rqeValue: "",
        specialty: "",
        phrases: [],
    })

    // Estado de Imagem
    const [file, setFile] = useState(null)
    const [fileUrl, setFileUrl] = useState("")
    const [previewUrl, setPreviewUrl] = useState("")
    const [imageOptions, setImageOptions] = useState(defaultImageOptions)
    const [imageScale, setImageScale] = useState(DEFAULT_IMAGE_SCALE)
    const [textScale, setTextScale] = useState(100)
    const [textLayout, setTextLayout] = useState("lines")
    const [textAlign, setTextAlign] = useState("center")
    const [detailOrder, setDetailOrder] = useState(SIGNATURE_DETAIL_ORDER)
    const [isReadyImage, setIsReadyImage] = useState(false)

    const fileUrlRef = useRef("")
    const previewUrlRef = useRef("")
    const processingIdRef = useRef(0)
    const [sourceRevision, setSourceRevision] = useState(0)
    const [processedImageKey, setProcessedImageKey] = useState("")
    const [previewCompositionKey, setPreviewCompositionKey] = useState("")
    const [processingErrorKey, setProcessingErrorKey] = useState("")
    const [compositionErrorKey, setCompositionErrorKey] = useState("")

    const processingKey = JSON.stringify([
        sourceRevision,
        isReadyImage,
        isReadyImage ? null : imageOptions,
    ])

    // Invalida tarefas em andamento e libera as URLs temporárias ao desmontar o hook.
    useEffect(() => () => {
        processingIdRef.current += 1
        if(fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current)
        if(previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }, [])

    // Reprocessa a fonte quando arquivo ou opções mudam; descarta resultados obsoletos.
    useEffect(() => {
        if (!file) return

        // O identificador e a flag permitem descartar um resultado depois
        // que uma alteração do usuário iniciou uma execução mais recente.
        const processingId = ++processingIdRef.current
        let isCurrent = true
        let sourceUrl = ""
        let includedUrl = ""

        // Decodifica o arquivo, aplica o algoritmo localmente e codifica novamente em PNG.
        async function processSelectedImage() {
            try {
                if (allowReadyImage && isReadyImage) {
                    includedUrl = URL.createObjectURL(file)
                    const image = new Image()
                    await new Promise((resolve, reject) => {
                        image.onload = resolve
                        image.onerror = () => reject(new Error("Não foi possível abrir a imagem pronta selecionada."))
                        image.src = includedUrl
                    })

                    const pixelCount = image.naturalWidth * image.naturalHeight
                    if (!image.naturalWidth || !image.naturalHeight || pixelCount > MAX_IMAGE_PIXELS) {
                        throw new Error("A imagem excede o limite de 12 megapixels. Reduza a resolução e tente novamente.")
                    }
                    if (!isCurrent || processingId !== processingIdRef.current) return

                    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current)
                    const publishedUrl = includedUrl
                    fileUrlRef.current = publishedUrl
                    includedUrl = ""
                    setFileUrl(publishedUrl)
                    setProcessedImageKey(processingKey)
                    setProcessingErrorKey("")
                    return
                }

                sourceUrl = URL.createObjectURL(file)
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
                if (sourceUrl) URL.revokeObjectURL(sourceUrl)
                if (includedUrl) URL.revokeObjectURL(includedUrl)
            }
        }

        void processSelectedImage()

        // Cleanup cancela logicamente a execução se arquivo ou opções forem alterados.
        return () => {
            isCurrent = false
        }
    }, [file, imageOptions, processingKey, isReadyImage, allowReadyImage, notifyError])

    // Chaves/derivados
    const isProcessing = Boolean(
        file && processedImageKey !== processingKey && processingErrorKey !== processingKey
    )

    const compositionKey = JSON.stringify([
        fileUrl,
        processingKey,
        previewInfo.professionalName,
        previewInfo.credentialValue,
        previewInfo.rqeValue,
        previewInfo.specialty,
        previewInfo.phrases.map(p => p.value),
        typeP.credentials,
        formatCredentials,
        addRQE,
        formatCredentialsRQE,
        addSpecialty,
        addExtraPhrase,
        imageScale,
        textScale,
        textLayout,
        textAlign,
        detailOrder,
    ]);

    const isComposing = Boolean(
        fileUrl &&
        processedImageKey === processingKey &&
        previewCompositionKey !== compositionKey &&
        compositionErrorKey !== compositionKey
    );

    const hasCurrentPreview = Boolean(
        previewUrl &&
        processedImageKey === processingKey &&
        previewCompositionKey === compositionKey
    )

    // Compõe a imagem processada com os dados profissionais confirmados.
    useEffect(() => {
        if (!fileUrl || processedImageKey !== processingKey) return

        let isCurrent = true
        const details = allowReadyImage && isReadyImage
            ? []
            : buildSignatureDetails({
                ...previewInfo,
                credentialLabel: typeP.credentials,
                credentialFormat: formatCredentials,
                includeRqe: addRQE,
                rqeFormat: formatCredentialsRQE,
                includeSpecialty: addSpecialty,
                includeExtraPhrases: addExtraPhrase,
                layout: textLayout,
                order: detailOrder,
            })

        composeSignature(fileUrl, details, {
            transparente: imageOptions.transparente,
            escala: imageScale,
            textScale,
            layout: textLayout,
            textAlign,
        })
            .then((blob) => {
                if (!isCurrent) return
                const nextPreviewUrl = URL.createObjectURL(blob)
                if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
                previewUrlRef.current = nextPreviewUrl
                setPreviewUrl(nextPreviewUrl)
                setPreviewCompositionKey(compositionKey)
                setCompositionErrorKey("")
            })
            .catch((error) => {
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
        previewInfo,
        typeP.credentials,
        formatCredentials,
        addRQE,
        formatCredentialsRQE,
        addSpecialty,
        addExtraPhrase,
        imageOptions,
        imageScale,
        textScale,
        textLayout,
        textAlign,
        detailOrder,
        compositionKey,
        allowReadyImage,
        isReadyImage,
        notifyError,
    ])

    function handleFile(event){
        const selectedFile = event.currentTarget.files?.[0]
        if(!selectedFile) return

        const validation = validateSignatureFile(selectedFile)
        if (!validation.valid) {
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
            notifyError(validation.title, validation.message)
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

    function setImageOption(name, value) {
        setImageOptions((currentOptions) => ({
            ...currentOptions,
            [name]: value,
        }))
    }

    function selectFormat(event) {
        setFormatCredentials(event.currentTarget.value)
    }

    function selectFormatRQE(event) {
        setFormatCredentialsRQE(event.currentTarget.value)
    }

    function setAddExtraPhrase(enabled) {
        setAddExtraPhraseState(enabled)
        if (enabled) {
            setPhrases((currentPhrases) => currentPhrases.length > 0
                ? currentPhrases
                : [{ id: 1, value: "" }]
            )
        }
    }

    function resetImageOptions() {
        setImageOptions(defaultImageOptions)
        setImageScale(DEFAULT_IMAGE_SCALE)
        setTextScale(100)
        setTextLayout("lines")
        setTextAlign("center")
        setDetailOrder(SIGNATURE_DETAIL_ORDER)
    }

    function moveDetailOrder(key, direction) {
        setDetailOrder((currentOrder) => moveSignatureDetail(currentOrder, key, direction))
    }

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

    function selectProfessional(event){
        const professional = event.currentTarget.value
        if(!professionals[professional]) return
        setSelectedProfessional(professional)
        setTypeP(professionals[professional])
    }

    function addPhrases(){
        setPhrases((currentPhrases) => addSignaturePhrase(currentPhrases))
    }

    function updatePhrase(id, value){
        setPhrases((currentPhrases) => updateSignaturePhrase(currentPhrases, id, value))
    }

    // Remove a frase indicada, mantendo um campo vazio como mínimo da interface.
    function removePhrase(id){
        const nextPhrases = removeSignaturePhrase(phrases, id)
        setPhrases(nextPhrases)
        setPreviewInfo((currentInfo) => ({
            ...currentInfo,
            phrases: nextPhrases
                .filter((phrase) => phrase.value.trim())
                .map((phrase) => ({ ...phrase, value: phrase.value.trim() })),
        }))
    }

    const setProfessionalName = (value) => setProfessionalNameState(value.slice(0, 100))
    const setCredentialValue = (value) => setCredentialValueState(value.slice(0, 40))
    const setRqeValue = (value) => setRqeValueState(value.slice(0, 40))
    const setSpecialtyValue = (value) => setSpecialty(value.slice(0, 80))

    return {
        // form
        professionalName, setProfessionalName,
        credentialValue, setCredentialValue,
        rqeValue, setRqeValue, formatCredentials, setFormatCredentials,
        selectFormat,
        formatCredentialsRQE, setFormatCredentialsRQE,
        selectFormatRQE,
        addRQE, setAddRQE, addSpecialty, setAddSpecialty,
        specialty, setSpecialty: setSpecialtyValue,
        addExtraPhrase, setAddExtraPhrase: setAddExtraPhrase,
        phrases, addPhrases, updatePhrase, removePhrase,
        selectedProfessional, typeP, selectProfessional,
        commitProfessionalInfo, previewInfo,

        // imagem
        file, fileUrl, previewUrl, hasCurrentPreview,
        imageOptions, setImageOption, resetImageOptions,
        imageScale, setImageScale,
        textScale, setTextScale,
        textLayout, setTextLayout,
        textAlign, setTextAlign,
        detailOrder, moveDetailOrder,
        isReadyImage,
        setIsReadyImage: allowReadyImage ? setIsReadyImage : undefined,
        isProcessing, isComposing,
        handleFile,
    }
}