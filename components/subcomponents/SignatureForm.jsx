const professionalOptions = [
    { value: "doctor", label: "🩺 Médico" },
    { value: "vet", label: "🐾 Veterinário" },
    { value: "dentist", label: "🦷 Dentista" },
]

function SignatureForm({ signature, idPrefix = "second-signature" }) {
    const id = (name) => `${idPrefix}-${name}`

    return (
        <section className="signature-person">
            <h2>👨‍⚕️ Assinatura Secundária</h2>
            <div>
                <label className="checkbox-group signature-ready-image-option">
                    <input
                        type="checkbox"
                        checked={signature.isReadyImage}
                        onChange={(event) => signature.setIsReadyImage(event.target.checked)}
                    />
                    Usar imagem já pronta, sem processar
                </label>
                {signature.isReadyImage && (
                    <p className="helper-text">
                        A imagem será incluída como está, sem tratamento de traço nem informações adicionais.
                    </p>
                )}
                <div className="container-file upload-section" id="fileSecond">
                    <div className="file-input-wrapper">
                        <label htmlFor={id("file")}>📁 Selecionar imagem da segunda assinatura</label>
                        <input
                            id={id("file")}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif"
                            onChange={signature.handleFile}
                        />
                    </div>
                    <p>{signature.file?.name}</p>
                    <p className="helper-text">
                        Formatos: PNG, JPEG, WebP, GIF, BMP ou AVIF. Limite: 12 MB e 12 megapixels.
                    </p>
                </div>
            </div>

            {!signature.isReadyImage && (
                <>
            <section className="configSigt">
                <h2>Configurações Avançadas</h2>
                <section className="addInfos">
                    <h3>Informações da Assinatura Secundária</h3>
                    <label className="checkbox-group">
                        <input
                            type="checkbox"
                            checked={signature.addRQE}
                            onChange={(event) => signature.setAddRQE(event.target.checked)}
                        />
                        Adicionar RQE (Registro de Qualificação de Especialista)
                    </label>
                    <label className="checkbox-group">
                        <input
                            type="checkbox"
                            checked={signature.addExtraPhrase}
                            onChange={(event) => signature.setAddExtraPhrase(event.target.checked)}
                        />
                        Adicionar frases extras
                    </label>
                    <label className="checkbox-group">
                        <input
                            type="checkbox"
                            checked={signature.addSpecialty}
                            onChange={(event) => signature.setAddSpecialty(event.target.checked)}
                        />
                        Adicionar Especialidade
                    </label>
                </section>
            </section>

            <div className="controlsProfessional">
                <h3>Tipo de Profissional</h3>
                <div>
                    {professionalOptions.map((professional) => (
                        <button
                            type="button"
                            key={professional.value}
                            className={signature.selectedProfessional === professional.value ? "active" : ""}
                            value={professional.value}
                            onClick={signature.selectProfessional}
                        >
                            {professional.label}
                        </button>
                    ))}
                </div>
            </div>
            <p className="helper-text">
                As informações são aplicadas à prévia quando você sai do campo.
            </p>
            <div className="labels">
                <label htmlFor={id("name")}>Nome do profissional (com título):</label>
                <input
                    id={id("name")}
                    type="text"
                    maxLength={100}
                    placeholder="Ex: Dra. Maria Silva"
                    value={signature.professionalName}
                    onChange={(event) => signature.setProfessionalName(event.target.value)}
                    onBlur={signature.commitProfessionalInfo}
                />
            </div>

            <div className="labels">
                <label htmlFor={id("credential")}>{signature.typeP.credentials} com Estado:</label>
                <input
                    id={id("credential")}
                    type="text"
                    maxLength={40}
                    placeholder={`${signature.typeP.credentials} 12345/SP`}
                    value={signature.credentialValue}
                    onChange={(event) => signature.setCredentialValue(event.target.value)}
                    onBlur={signature.commitProfessionalInfo}
                />
                <div className="typeCrm">
                    <button
                        type="button"
                        value="default"
                        className={signature.formatCredentials === "default" ? "active" : ""}
                        onClick={signature.selectFormat}
                    >
                        Padrão ({signature.typeP.credentials}: valor)
                    </button>
                    <button
                        type="button"
                        value="compact"
                        className={signature.formatCredentials === "compact" ? "active" : ""}
                        onClick={signature.selectFormat}
                    >
                        Compacto ({signature.typeP.credentials}/RS 45534)
                    </button>
                </div>
            </div>

            {signature.addRQE && (
                <div className="labels">
                    <label htmlFor={id("rqe")}>RQE com Estado:</label>
                    <input
                        id={id("rqe")}
                        type="text"
                        maxLength={40}
                        placeholder="RQE 40499/SP"
                        value={signature.rqeValue}
                        onChange={(event) => signature.setRqeValue(event.target.value)}
                        onBlur={signature.commitProfessionalInfo}
                    />
                    <div className="typeRQE">
                        <button
                            type="button"
                            value="default"
                            className={signature.formatCredentialsRQE === "default" ? "active" : ""}
                            onClick={signature.selectFormatRQE}
                        >
                            Padrão (RQE: valor)
                        </button>
                        <button
                            type="button"
                            value="compact"
                            className={signature.formatCredentialsRQE === "compact" ? "active" : ""}
                            onClick={signature.selectFormatRQE}
                        >
                            Compacto (RQE/RS 40499)
                        </button>
                    </div>
                </div>
            )}

            {signature.addSpecialty && (
                <div className="labels">
                    <label htmlFor={id("specialty")}>Especialidade:</label>
                    <input
                        id={id("specialty")}
                        type="text"
                        maxLength={80}
                        placeholder="Ex: Médico Radiologista"
                        value={signature.specialty}
                        onChange={(event) => signature.setSpecialty(event.target.value)}
                        onBlur={signature.commitProfessionalInfo}
                    />
                </div>
            )}

            {signature.addExtraPhrase && (
                <div className="signature-extra-phrases">
                    {signature.phrases.map((phrase, index) => (
                        <div className="labels extra-phrase-field" key={phrase.id}>
                            <div className="extra-phrase-header">
                                <label htmlFor={id(`phrase-${phrase.id}`)}>
                                    Frase adicional {index + 1}:
                                </label>
                                {signature.phrases.length > 1 && (
                                    <button
                                        type="button"
                                        className="remove-phrase-button"
                                        onClick={() => signature.removePhrase(phrase.id)}
                                        aria-label={`Remover frase adicional ${index + 1}`}
                                    >
                                        <div className="icon"></div>
                                    </button>
                                )}
                            </div>
                            <textarea
                                id={id(`phrase-${phrase.id}`)}
                                rows={2}
                                maxLength={120}
                                placeholder="Digite uma frase adicional"
                                value={phrase.value}
                                onChange={(event) => signature.updatePhrase(phrase.id, event.target.value)}
                                onBlur={signature.commitProfessionalInfo}
                            />
                        </div>
                    ))}
                    <button
                        type="button"
                        className="add-phrase-button"
                        onClick={signature.addPhrases}
                        disabled={signature.phrases.length >= 5}
                    >
                        {signature.phrases.length >= 5
                            ? "Limite de 5 frases atingido"
                            : "+ Adicionar outra frase"}
                    </button>
                </div>
            )}
                </>
            )}
        </section>
    )
}

export default SignatureForm
