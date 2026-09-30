// Carrega o layout global e conecta os componentes ao estado e às ações do editor.
import './style/index.css';
import DoctorForm from './components/DoctorForm';
import ImageAdjustments from './components/ImageAdjustments';
import ImageUploader from './components/ImageUploader';
import SignaturePreview from './components/SignaturePreview';
import { useSignatureEditor } from './hooks/useSignatureEditor';

export default function App() {
  // Centraliza dados, processamento de imagem, histórico e exportação usados pela tela.
  const editor = useSignatureEditor();
  const firstProfessional = editor.professionals[0];
  const secondProfessional = editor.professionals[1];
  const signaturesToPreview = editor.secondEnabled
    ? editor.previewSignatures
    : editor.previewSignatures.slice(0, 1);

  // Encaminha cada alteração do formulário ao perfil principal ou secundário correto.
  function handleProfessionalChange(signatureIndex, field, value) {
    editor.updateProfessional(signatureIndex, field, value);
  }

  return (
    <main className="app-shell">
      {/* Identifica a ferramenta e resume o processamento local da assinatura. */}
      <header className="app-header">
        <div>
          <p className="eyebrow">FERRAMENTA DE ASSINATURA</p>
          <h1>MobilemedTools</h1>
        </div>
        <p className="header-note">Preparação local de imagem e identificação profissional</p>
      </header>

      {/* Separa o formulário de edição do preview atualizado em tempo real. */}
      <div className="workspace">
        {/* Reúne uploads, ajustes, dados profissionais e o comando de download. */}
        <section className="editor-panel" aria-label="Editar assinatura">
          <div className="panel-heading">
            <span className="step-number">01</span>
            <div>
              <h2>Configure sua assinatura</h2>
              <p>As alterações da imagem aparecem na prévia antes do download.</p>
            </div>
          </div>

          {/* O índice zero associa este arquivo à imagem e aos dados do perfil principal. */}
          <ImageUploader
            file={editor.files[0]}
            onFileChange={(event) => editor.handleFileChange(event, 0)}
          />

          {/* Os controles atualizam os filtros e reprocessam os arquivos originais no hook. */}
          <ImageAdjustments
            adjustments={editor.adjustments}
            backgroundThresholds={editor.backgroundThresholds}
            showSecondThreshold={editor.secondEnabled && Boolean(editor.files[1])}
            onChange={editor.handleAdjustmentChange}
            onReset={editor.handleResetAdjustments}
          />

          <section className="form-section" aria-labelledby="professional-heading">
            <h3 id="professional-heading">Identificação profissional</h3>
            {/* O índice zero mantém nome, registro e opções vinculados ao perfil principal. */}
            <DoctorForm
              signatureIndex={0}
              professional={firstProfessional}
              onChange={(field, value) => handleProfessionalChange(0, field, value)}
            />
          </section>

          {/* Habilita frases opcionais antes e depois dos registros de cada assinatura. */}
          <section className="form-section phrase-section" aria-labelledby="phrases-heading">
            <h3 id="phrases-heading">Texto adicional</h3>
            <label className="inline-option">
              <input
                checked={editor.includePhrases}
                onChange={(event) => editor.setIncludePhrases(event.target.checked)}
                type="checkbox"
              />
              <span>Adicionar frases à assinatura</span>
            </label>
            {editor.includePhrases && (
              [0, ...(editor.secondEnabled && !editor.secondModelMode ? [1] : [])].map((signatureIndex) => (
                <div className="phrase-fields" key={`phrase-fields-${signatureIndex}`}>
                  <h4>{signatureIndex === 0 ? 'Assinatura principal' : 'Segunda assinatura'}</h4>
                  <label className="form-field">
                    <span>Frase acima do registro</span>
                    <input
                      name="before"
                      onChange={(event) => editor.handlePhraseChange(event, signatureIndex)}
                      placeholder="Ex: Atendimento especializado"
                      value={editor.phrases[signatureIndex].before}
                    />
                  </label>
                  <label className="form-field">
                    <span>Frase abaixo do registro</span>
                    <input
                      name="after"
                      onChange={(event) => editor.handlePhraseChange(event, signatureIndex)}
                      placeholder="Ex: RQE / especialidade"
                      value={editor.phrases[signatureIndex].after}
                    />
                  </label>
                </div>
              ))
            )}
          </section>

          {/* Habilita um segundo perfil ou uma imagem-modelo sem identificação profissional. */}
          <section className="form-section second-signature-section">
            <label className="inline-option second-signature-toggle">
              <input
                checked={editor.secondEnabled}
                onChange={editor.handleSecondSignatureChange}
                type="checkbox"
              />
              <span>Adicionar segunda assinatura</span>
            </label>
            {editor.secondEnabled && (
              <div className="second-signature-fields">
                <ImageUploader
                  file={editor.files[1]}
                  onFileChange={(event) => editor.handleFileChange(event, 1)}
                  signatureIndex={1}
                />
                <label className="inline-option">
                  <input
                    checked={editor.secondModelMode}
                    onChange={editor.handleSecondModelChange}
                    type="checkbox"
                  />
                  <span>Usar como modelo pronto (sem dados profissionais)</span>
                </label>
                {!editor.secondModelMode && (
                  <section className="form-section secondary-professional" aria-label="Dados da segunda assinatura">
                    <DoctorForm
                      signatureIndex={1}
                      professional={secondProfessional}
                      onChange={(field, value) => handleProfessionalChange(1, field, value)}
                    />
                  </section>
                )}
              </div>
            )}
          </section>

          {/* Define a fonte dos dados e o espaço entre a imagem e o texto de cada cartão. */}
          <section className="form-section size-controls" aria-label="Fonte e espaçamento da assinatura">
            <label className="form-field" htmlFor="signature-font">
              <span>Fonte do texto profissional</span>
              <select
                id="signature-font"
                onChange={(event) => editor.setFontFamily(event.target.value)}
                value={editor.fontFamily}
              >
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
              </select>
            </label>
            <label className="range-control" htmlFor="signature-gap">
              <span>Espaço entre imagem e texto</span>
              <output>{editor.signatureGap}px</output>
              <input
                id="signature-gap"
                max="30"
                min="0"
                onChange={(event) => editor.setSignatureGap(Number(event.target.value))}
                step="1"
                type="range"
                value={editor.signatureGap}
              />
            </label>
          </section>

          {/* Exibe junto ao formulário erros de arquivo, processamento ou exportação. */}
          {editor.error && <p className="error-message" role="alert">{editor.error}</p>}

          {/* Só permite baixar quando as imagens necessárias estão prontas e sem processamento. */}
          <button
            className="download-button"
            disabled={
              !editor.images[0] ||
              (editor.secondEnabled && !editor.images[1]) ||
              editor.isProcessing ||
              editor.isExporting
            }
            onClick={editor.handleDownload}
            type="button"
          >
            {editor.isExporting ? 'Gerando PNG...' : 'Baixar assinatura PNG'}
          </button>
        </section>

        {/* Mostra os cartões que serão rasterizados no PNG de 840 x 400 px. */}
        <section className="preview-panel" aria-labelledby="preview-heading">
          <div className="preview-heading">
            <div>
              <p className="eyebrow">RESULTADO</p>
              <h2 id="preview-heading">Prévia da assinatura</h2>
            </div>
            {/* Sinaliza o reprocessamento iniciado por um ajuste de imagem. */}
            {editor.isProcessing && <span className="processing-status" role="status">Atualizando...</span>}
          </div>
          {/* Desfaz ou refaz os últimos movimentos de posição dos cartões. */}
          <div className="position-history" aria-label="Histórico de posição das assinaturas">
            <button
              aria-label="Desfazer posição"
              disabled={!editor.history.past.length}
              onClick={editor.handleUndo}
              title="Desfazer posição (Ctrl/Cmd+Z)"
              type="button"
            >
              Desfazer
            </button>
            <button
              aria-label="Refazer posição"
              disabled={!editor.history.future.length}
              onClick={editor.handleRedo}
              title="Refazer posição (Ctrl/Cmd+Y)"
              type="button"
            >
              Refazer
            </button>
          </div>
          <SignaturePreview
            signatures={signaturesToPreview}
            positions={editor.positions}
            signatureRef={editor.signatureRef}
            onDragStart={editor.handleDragStart}
            onDragMove={editor.handleDragMove}
            onDragEnd={editor.handleDragEnd}
          />
          <p className="preview-footnote">PNG com fundo transparente · processamento feito neste dispositivo</p>
        </section>
      </div>
    </main>
  );
}
