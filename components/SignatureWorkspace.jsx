import '../style/signature.css'
import { useSignature } from '../hooks/useSignature'

// Rótulos e identificadores válidos usados para montar os botões de profissão.
const professional_options = [
    { value: 'doctor', label: '🩺 Médico' },
    { value: 'vet', label: '🐾 Veterinário' },
    { value: 'dentist', label: '🦷 Dentista' },
]

/**
 * Interface principal do gerador. Conecta os controles do formulário ao hook,
 * apresenta erros/estados de processamento e mostra a prévia baixável atual.
 */
function SignatureWorkspace(){
    // O hook centraliza dados, processamento de imagem e geração do PNG composto.
    const signature = useSignature()
    const thicknessLabel = Number(signature.imageOptions.espessura).toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    })

    return(
        <main id="signature-workspace" className="workspace-main">
            {/* Título e instrução inicial sobre o fluxo de criação da assinatura. */}
            <section className="signatureIntro page-intro">
                <span className="workspace-kicker">FERRAMENTA · GERADOR DE ASSINATURA</span>
                <h1>Crie suas assinaturas profissionais</h1>
                <p>Selecione a imagem e preencha os dados do profissional.</p>
            </section>

            {/* Escolha da imagem fonte; o hook valida, processa e guarda o arquivo. */}
            <section className="container-file upload-section">
                <div className="file-input-wrapper">
                    <label htmlFor="signature-file">📁 Selecionar Imagem da Assinatura</label>
                    <input
                        id="signature-file"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif"
                        onChange={signature.handleFile}
                    />
                </div>
                <p>{signature.file?.name}</p>
                <p className="helper-text">Formatos: PNG, JPEG, WebP, GIF, BMP ou AVIF. Limite: 12 MB e 12 megapixels.</p>
            </section>

            {/* Opções que determinam quais metadados adicionais entram na composição. */}
            <section className="configSigt">
                <h2>Configurações Avançadas</h2>
                <section className="addInfos">
                    <h3>Informações do Profissional</h3>
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

            {/* Controles ligados ao processador e à escala final da assinatura. */}
            <section className="configImage signature-image-options">
                {/* Restaurar padrão redefine opções do processador e escala composta. */}
                <div className="signature-image-options-header">
                    <div>
                        <h2>Personalização da Imagem</h2>
                        <p className="helper-text">
                            As alterações são aplicadas automaticamente à prévia e ao PNG final.
                        </p>
                    </div>
                    <button type="button" onClick={signature.resetImageOptions}>
                        Restaurar padrão
                    </button>
                </div>
                {/* Sliders controlam escala visual e espessura do traço. */}
                <div className="signature-image-options-grid">
                    <div className="signature-option-field">
                        <label htmlFor="signature-scale">
                            Tamanho da assinatura: {signature.imageScale}%
                        </label>
                        <input
                            id="signature-scale"
                            type="range"
                            min="50"
                            max="200"
                            step="1"
                            value={signature.imageScale}
                            onChange={(event) => signature.setImageScale(Number(event.target.value))}
                        />
                        <span className="helper-text">
                            100% é o tamanho padrão; o tamanho é ajustado automaticamente para caber junto com o texto.
                        </span>
                    </div>
                    <div className="signature-option-field">
                        <label htmlFor="signature-thickness">
                            Espessura do traço: {thicknessLabel} px
                        </label>
                        <input
                            id="signature-thickness"
                            type="range"
                            min="-10"
                            max="10"
                            step="0.1"
                            value={signature.imageOptions.espessura}
                            onChange={(event) => signature.setImageOption(
                                "espessura",
                                Number(event.target.value)
                            )}
                        />
                        <span className="helper-text">
                            Ajuste gradual de 0,1 px: valores negativos afinam e positivos engrossam o traço.
                        </span>
                    </div>
                </div>
                {/* Estes booleanos controlam alfa do fundo, cor da tinta e bordas. */}
                <div className="signature-image-checkboxes">
                    <label className="checkbox-group">
                        <input
                            type="checkbox"
                            checked={signature.imageOptions.transparente}
                            onChange={(event) => signature.setImageOption(
                                "transparente",
                                event.target.checked
                            )}
                        />
                        Fundo transparente
                    </label>
                    <label className="checkbox-group">
                        <input
                            type="checkbox"
                            checked={signature.imageOptions.pretoPuro}
                            onChange={(event) => signature.setImageOption(
                                "pretoPuro",
                                event.target.checked
                            )}
                        />
                        Usar preto puro na assinatura
                    </label>
                    <label className="checkbox-group">
                        <input
                            type="checkbox"
                            checked={signature.imageOptions.suavizar}
                            onChange={(event) => signature.setImageOption(
                                "suavizar",
                                event.target.checked
                            )}
                        />
                        Suavizar as bordas
                    </label>
                </div>
            </section>

            {/* Dados do profissional sempre fazem parte do fluxo principal da composição. */}
            <section className="signature-professional">
                <div className="signature-person">
                    <h2>👨‍⚕️ Assinatura Principal</h2>
                    {/* Os botões alteram profissão e, consequentemente, a sigla do registro. */}
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

                    <p className="helper-text">
                        As informações são aplicadas à prévia quando você sai do campo.
                    </p>

                    {/* A prévia confirma os dados de texto apenas quando o campo perde foco. */}
                    <div className="labels">
                        <label htmlFor="professional-name">Nome do Profissional (com título):</label>
                        <input
                            id="professional-name"
                            type="text"
                            maxLength={100}
                            placeholder="Ex: Dr. João Silva"
                            value={signature.professionalName}
                            onChange={(event) => signature.setProfessionalName(event.target.value)}
                            onBlur={signature.commitProfessionalInfo}
                        />
                    </div>

                    <div className="labels">
                        <label htmlFor="professional-credential">{signature.typeP.credentials} com Estado:</label>
                        <input
                            id="professional-credential"
                            type="text"
                            maxLength={40}
                            placeholder={`${signature.typeP.credentials} 12345/SP`}
                            value={signature.credentialValue}
                            onChange={(event) => signature.setCredentialValue(event.target.value)}
                            onBlur={signature.commitProfessionalInfo}
                        />
                        {/* Seleciona a forma textual do CRM/CRMV/CRO na imagem final. */}
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

                    {/* Campos opcionais só entram na imagem quando a opção correspondente está ativa. */}
                    <div className="infoOptions">
                        {signature.addRQE && (
                            <div className="labels">
                                <label htmlFor="professional-rqe">RQE com Estado:</label>
                                <input
                                    id="professional-rqe"
                                    type="text"
                                    maxLength={40}
                                    placeholder="RQE 40499/SP"
                                    value={signature.rqeValue}
                                    onChange={(event) => signature.setRqeValue(event.target.value)}
                                    onBlur={signature.commitProfessionalInfo}
                                />
                                {/* O formato selecionado também compõe o conteúdo final. */}
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
                        {signature.addSpecialty && (
                            <div className="labels">
                                <label htmlFor="specialty">Especialidade:</label>
                                <input
                                    id="specialty"
                                    type="text"
                                    maxLength={80}
                                    placeholder="Ex: Médico Radiologista"
                                    value={signature.specialty}
                                    onChange={(event) => signature.setSpecialty(event.target.value)}
                                    onBlur={signature.commitProfessionalInfo}
                                />
                            </div>
                        )}
                        {/* Frases dinâmicas podem ser editadas, adicionadas ou removidas. */}
                        {signature.addExtraPhrase && (
                            <div className="signature-extra-phrases">
                                {signature.phrases.map((phrase, index) => (
                                    <div className="labels extra-phrase-field" key={phrase.id}>
                                        <div className="extra-phrase-header">
                                            <label htmlFor={`extra-phrase-${phrase.id}`}>
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
                                            id={`extra-phrase-${phrase.id}`}
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
                                    {signature.phrases.length >= 5 ? "Limite de 5 frases atingido" : "+ Adicionar outra frase"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </section>
            {/* A prévia fica oculta/desatualizada durante regeneração; o download só é liberado
                quando a imagem corresponder ao arquivo, dados e opções atualmente escolhidos. */}
            <section className="previewImage">
                {signature.isProcessing && <p role="status">Processando imagem...</p>}
                {signature.isComposing && <p role="status">Atualizando prévia final...</p>}
                {signature.hasCurrentPreview && (
                    <div className="image-preview-container">
                        <h2>Prévia final da assinatura (PNG 1260 × 360 px)</h2>
                        <p className="helper-text">Exibida em 420 × 120 px; arquivo renderizado em resolução 3×.</p>
                        <img
                            src={signature.previewUrl}
                            className="image-preview"
                            alt="Prévia da assinatura composta com os dados do profissional"
                        />
                    </div>
                )}
                <button
                    type="button"
                    className="download-signature-button"
                    onClick={signature.downloadSignature}
                    disabled={!signature.hasCurrentPreview || signature.isProcessing || signature.isComposing}
                >
                    Baixar assinatura em PNG
                </button>
            </section>
        </main>
    )
}

// Exporta a tela para ser montada pelo componente raiz da aplicação.
export default SignatureWorkspace
