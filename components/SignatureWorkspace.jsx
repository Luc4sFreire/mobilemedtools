import '../style/signature.css'
import { useSignature } from '../hooks/useSignature'

const professional_options = [
    { value: 'doctor', label: '🩺 Médico' },
    { value: 'vet', label: '🐾 Veterinário' },
    { value: 'dentist', label: '🦷 Dentista' },
]

function SignatureWorkspace(){
    const signature = useSignature()

    return(
        <main id="signature-workspace">
            <section className="signatureIntro">
                <h1>👨‍⚕️ Gerador de Assinatura</h1>
                <p>Selecione a imagem e preencha os dados do profissional.</p>
            </section>

            {/* A imagem é processada localmente para a prévia; a montagem e o download da assinatura final estão em desenvolvimento. */}
            <section className="container-file upload-section">
                <div className="file-input-wrapper">
                    <label htmlFor="signature-file">📁 Selecionar Imagem da Assinatura</label>
                    <input
                        id="signature-file"
                        type="file"
                        accept="image/*"
                        onChange={signature.handleFile}
                    />
                </div>
                <p>{signature.file?.name}</p>
            </section>

            {signature.errorMessage && (
                <p className="signature-message" role="alert">{signature.errorMessage}</p>
            )}

            <section className="addInfos">
                <label className="checkbox-group">
                    <input
                        type="checkbox"
                        checked={signature.addRQE}
                        onChange={(event) => signature.setAddRQE(event.target.checked)}
                    />
                    Adicionar RQE (Registro de Qualificação de Especialista)
                </label>
            </section>

            {/* Esta etapa reúne os dados que compõem a assinatura; campos opcionais são exibidos conforme as escolhas do usuário. */}
            <section className="signature-professional">
                <div className="signature-person">
                    <h2>👨‍⚕️ Assinatura Principal</h2>
                    <div className="controlsProfessional">
                        <h3>Tipo de Profissional</h3>
                        <div>
                            {professional_options.map((professional) => (
                                <button
                                    type="button"
                                    key={professional.value}
                                    className={signature.selectedProfessional === professional.value ? 'active' : ''}
                                    value={professional.value}
                                    onClick={signature.selectProfessional}
                                >
                                    {professional.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="labels">
                        <label htmlFor="professional-name">Nome do Profissional (com título):</label>
                        <input
                            id="professional-name"
                            type="text"
                            placeholder="Ex: Dr. João Silva"
                            value={signature.professionalName}
                            onChange={(event) => signature.setProfessionalName(event.target.value)}
                        />
                    </div>

                    <div className="labels">
                        <label htmlFor="professional-credential">{signature.typeP.credentials} com Estado:</label>
                        <input
                            id="professional-credential"
                            type="text"
                            placeholder={`${signature.typeP.credentials} 12345/SP`}
                            value={signature.credentialValue}
                            onChange={(event) => signature.setCredentialValue(event.target.value)}
                        />
                        <div className="typeCrm">
                            <button
                                type="button"
                                value="default"
                                className={signature.formatCredentials === 'default' ? 'active' : ''}
                                onClick={signature.selectFormat}
                            >
                                Padrão ({signature.typeP.credentials}: valor)
                            </button>
                            <button
                                type="button"
                                value="compact"
                                className={signature.formatCredentials === 'compact' ? 'active' : ''}
                                onClick={signature.selectFormat}
                            >
                                Compacto ({signature.typeP.credentials}/RS 45534)
                            </button>
                        </div>
                    </div>

                    {signature.addRQE && (
                        <div className="labels">
                            <label htmlFor="professional-rqe">RQE com Estado:</label>
                            <input
                                id="professional-rqe"
                                type="text"
                                placeholder="RQE 40499/SP"
                                value={signature.rqeValue}
                                onChange={(event) => signature.setRqeValue(event.target.value)}
                            />
                            <div className="typeRQE">
                                <button
                                    type="button"
                                    value="default"
                                    className={signature.formatCredentialsRQE === 'default' ? 'active' : ''}
                                    onClick={signature.selectFormatRQE}
                                >
                                    Padrão (RQE: valor)
                                </button>
                                <button
                                    type="button"
                                    value="compact"
                                    className={signature.formatCredentialsRQE === 'compact' ? 'active' : ''}
                                    onClick={signature.selectFormatRQE}
                                >
                                    Compacto (RQE/RS 40499)
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="labels">
                        <label htmlFor="specialty">Especialidade:</label>
                        <input
                            id="specialty"
                            type="text"
                            placeholder="Ex: Médico Radiologista"
                            value={signature.specialty}
                            onChange={(event) => signature.setSpecialty(event.target.value)}
                        />
                    </div>

                    <label className="checkbox-group">
                        <input
                            type="checkbox"
                            checked={signature.addExtraPhrase}
                            onChange={(event) => signature.setAddExtraPhrase(event.target.checked)}
                        />
                        Adicionar frases extras
                    </label>

                    {signature.addExtraPhrase && (
                        <div className="signature-extra-phrases">
                            <div className="labels">
                                <label htmlFor="extra-phrase-1">Frase adicional:</label>
                                <textarea
                                    id="extra-phrase-1"
                                    rows="2"
                                    placeholder="Digite uma frase extra"
                                    value={signature.extraPhrase}
                                    onChange={(event) => signature.setExtraPhrase(event.target.value)}
                                />
                            </div>
                            <div className="labels">
                                <label htmlFor="extra-phrase-2">Frase adicional que aparece entre o nome e o registro:</label>
                                <textarea
                                    id="extra-phrase-2"
                                    rows="2"
                                    placeholder="Ex: Médico Radiologista"
                                    value={signature.extraPhrase2}
                                    onChange={(event) => signature.setExtraPhrase2(event.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </section>
            <section className="previewImage">
                {signature.isProcessing && <p role="status">Processando imagem...</p>}
                {signature.fileUrl && (
                    <div className="image-preview-container">
                        <img
                            src={signature.fileUrl}
                            className="image-preview"
                            alt="Prévia da imagem processada"
                        />
                    </div>
                )}
            </section>
        </main>
    )
}

export default SignatureWorkspace
