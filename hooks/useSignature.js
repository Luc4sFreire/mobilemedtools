import { useEffect, useRef, useState } from "react"
import { processImage } from "../utils/processImage"

const professionals = {
    doctor: { credentials: "CRM", placeholder: "Ex: CRM" },
    vet: { credentials: "CRMV", placeholder: "Ex: CRMV" },
    dentist: { credentials: "CRO", placeholder: "Ex: CRO" },
}

export function useSignature(){
    const [file, setFile] = useState(null)
    const [fileUrl, setFileUrl] = useState("")
    const [errorMessage, setErrorMessage] = useState("")
    const [isProcessing, setIsProcessing] = useState(false)
    const fileUrlRef = useRef("")
    const processingIdRef = useRef(0)
    const [selectedProfessional, setSelectedProfessional] = useState("doctor")
    const [typeP, setTypeP] = useState(professionals.doctor)
    const [professionalName, setProfessionalName] = useState("")
    const [credentialValue, setCredentialValue] = useState("")
    const [formatCredentials, setFormatCredentials] = useState("default")
    const [rqeValue, setRqeValue] = useState("")
    const [formatCredentialsRQE, setFormatCredentialsRQE] = useState("default")
    const [addRQE, setAddRQE] = useState(true)
    const [addExtraPhrase, setAddExtraPhrase] = useState(false)
    const [extraPhrase, setExtraPhrase] = useState("")
    const [extraPhrase2, setExtraPhrase2] = useState("")
    const [specialty, setSpecialty] = useState("")
    const [checkedItems, setCheckedItems] = useState([]);

    useEffect(() => () => {
        processingIdRef.current += 1
        if(fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current)
    }, [])

    // Carrega a imagem local, executa o algoritmo no canvas e publica a prévia PNG mais recente.
    async function tratamentFile(selectedFile) {
        const processingId = ++processingIdRef.current
        const sourceUrl = URL.createObjectURL(selectedFile)

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

            const context = canvas.getContext("2d", { willReadFrequently: true })
            if (!context) {
                throw new Error("Não foi possível preparar a imagem para processamento.")
            }

            context.drawImage(image, 0, 0)
            processImage(canvas)

            const processedBlob = await new Promise((resolve, reject) => {
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob)
                    } else {
                        reject(new Error("Não foi possível gerar a imagem processada."))
                    }
                }, "image/png")
            })

            if (processingId !== processingIdRef.current) return

            const baseName = selectedFile.name.replace(/\.[^.]+$/, "") || "assinatura"
            const processedFile = new File([processedBlob], `${baseName}.png`, {
                type: "image/png",
            })
            const processedUrl = URL.createObjectURL(processedBlob)

            if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current)
            fileUrlRef.current = processedUrl
            setFile(processedFile)
            setFileUrl(processedUrl)
            setErrorMessage("")
        } catch (error) {
            if (processingId === processingIdRef.current) {
                setErrorMessage(error instanceof Error
                    ? error.message
                    : "Ocorreu um erro ao processar a imagem.")
            }
        } finally {
            URL.revokeObjectURL(sourceUrl)
            if (processingId === processingIdRef.current) setIsProcessing(false)
        }
    }

    function handleFile(event){
        const selectedFile = event.currentTarget.files?.[0]
        if(!selectedFile) return
        if(!selectedFile.type.startsWith("image/")){
            processingIdRef.current += 1
            setIsProcessing(false)
            setErrorMessage("Selecione um arquivo de imagem.")
            event.currentTarget.value = ""
            return
        }

        if(fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current)
        fileUrlRef.current = ""
        setFile(selectedFile)
        setFileUrl("")
        setIsProcessing(true)
        setErrorMessage("")
        void tratamentFile(selectedFile)
    }

    function selectProfessional(event){
        const professional = event.currentTarget.value
        if(!professionals[professional]) return
        setSelectedProfessional(professional)
        setTypeP(professionals[professional])
    }

    function selectFormat(event){
        setFormatCredentials(event.currentTarget.value)
    }

    function selectFormatRQE(event){
        setFormatCredentialsRQE(event.currentTarget.value)
    }

    function checkFilters(e){
        const { value, checked } = e.target;

        if(checked){
            setCheckedItems([...checkedItems, value])
        }else{
            setCheckedItems(checkedItems.filter((item) => item !== value))
        }
    }

    function handleSubmitFilters(e){
        e.preventDefault();
        // A aplicação dos filtros ainda está em desenvolvimento; por enquanto, somente registra a seleção.
        console.log("Itens selecionados: ", checkedItems)
    }

    return{
        file,
        fileUrl,
        errorMessage,
        isProcessing,
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
    }
}
