import { useEffect, useRef, useState } from "react"

const PROFESSIONALS = {
    doctor: { credentials: "CRM", placeholder: "Ex: CRM" },
    vet: { credentials: "CRMV", placeholder: "Ex: CRMV" },
    dentist: { credentials: "CRO", placeholder: "Ex: CRO" },
}

export function useSignature(){
    const [file, setFile] = useState(null)
    const [fileUrl, setFileUrl] = useState("")
    const [errorMessage, setErrorMessage] = useState("")
    const fileUrlRef = useRef("")
    const [selectedProfessional, setSelectedProfessional] = useState("doctor")
    const [typeP, setTypeP] = useState(PROFESSIONALS.doctor)
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

    useEffect(() => () => {
        if(fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current)
    }, [])

    function handleFile(event){
        const selectedFile = event.currentTarget.files?.[0]
        if(!selectedFile) return
        if(!selectedFile.type.startsWith("image/")){
            setErrorMessage("Selecione um arquivo de imagem.")
            event.currentTarget.value = ""
            return
        }

        if(fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current)
        const url = URL.createObjectURL(selectedFile)
        fileUrlRef.current = url
        setFile(selectedFile)
        setFileUrl(url)
        setErrorMessage("")
    }

    function selectProfessional(event){
        const professional = event.currentTarget.value
        if(!PROFESSIONALS[professional]) return
        setSelectedProfessional(professional)
        setTypeP(PROFESSIONALS[professional])
    }

    function selectFormat(event){
        setFormatCredentials(event.currentTarget.value)
    }

    function selectFormatRQE(event){
        setFormatCredentialsRQE(event.currentTarget.value)
    }

    return{
        file,
        fileUrl,
        errorMessage,
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
    }
}
