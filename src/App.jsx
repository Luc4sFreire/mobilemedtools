// Importa os estilos globais, os componentes visuais e o hook que controla as operações do editor.
import './style/index.css';
import DoctorForm from './components/DoctorForm';
import ImageAdjustments from './components/ImageAdjustments';
import ImageUploader from './components/ImageUploader';
import SignaturePreview from './components/SignaturePreview';
import { useSignatureEditor } from './hooks/useSignatureEditor';

export default function App() {
  // O hook mantém a lógica fora da camada visual e fornece estado e eventos para a tela.
  const editor = useSignatureEditor();
  const firstProfessional = editor.professionals[0];
  const secondProfessional = editor.professionals[1];
  const signaturesToPreview = editor.secondEnabled
    ? editor.previewSignatures
    : editor.previewSignatures.slice(0, 1);

  // Adapta os eventos dos subcampos ao atualizador por índice do hook.
  function handleProfessionalChange(signatureIndex, field, value) {
    editor.updateProfessional(signatureIndex, field, value);
  }

  return (
    <main className="app-shell">
      {/* Identidade do produto e resumo curto da ferramenta. */}
      <header className="app-header">
        <div>
          <p className="eyebrow">FERRAMENTA DE ASSINATURA</p>
          <h1>MobilemedTools</h1>
        </div>
        <p className="header-note">Preparação local de imagem e identificação profissional</p>
      </header>

      {/* Organiza os controles à esquerda e o resultado atualizado à direita. */}
      <div className="workspace">
        {/* Área de entrada: imagem, ajustes, dados profissionais e exportação. */}
        <section className="editor-panel" aria-label="Editar assinatura">
          <div className="panel-heading">
            <span className="step-number">01</span>
            <div>
              <h2>Configure sua assinatura</h2>
              <p>As alterações da imagem aparecem na prévia antes do download.</p>
            </div>
          </div>

          {/* A mesma seção de upload atende à assinatura principal e à segunda assinatura. */}
          <ImageUploader
            file={editor.files[0]}
            onFileChange={(event) => editor.handleFileChange(event, 0)}
          />

          {/* Cada opção é controlada pelo estado e dispara novo processamento da imagem. */}
          <ImageAdjustments
            adjustments={editor.adjustments}
            backgroundThresholds={editor.backgroundThresholds}
            showSecondThreshold={editor.secondEnabled && Boolean(editor.files[1])}
            onChange={editor.handleAdjustmentChange}
            onReset={editor.handleResetAdjustments}
          />

          <section className="form-section" aria-labelledby="professional-heading">
            <h3 id="professional-heading">Identificação profissional</h3>
            {/* Os dados do perfil principal são armazenados no hook por índice. */}
            <DoctorForm
              signatureIndex={0}
              professional={firstProfessional}
              onChange={(field, value) => handleProfessionalChange(0, field, value)}
            />
          </section>

          {/* Os textos extras são opcionais e aparecem antes/depois dos dados profissionais. */}
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

          {/* Ativa o segundo conjunto de imagem e dados, como no gerador legado. */}
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

          {/* Fonte e intervalo vertical são aplicados a cada cartão antes da exportação. */}
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

          {/* Erros de upload, processamento e exportação são apresentados junto aos controles. */}
          {editor.error && <p className="error-message" role="alert">{editor.error}</p>}

          {/* Evita exportar sem imagem ou enquanto a prévia ainda está sendo calculada. */}
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

        {/* A mesma composição exibida aqui é rasterizada no download. */}
        <section className="preview-panel" aria-labelledby="preview-heading">
          <div className="preview-heading">
            <div>
              <p className="eyebrow">RESULTADO</p>
              <h2 id="preview-heading">Prévia da assinatura</h2>
            </div>
            {/* Informa que uma alteração de checkbox está sendo aplicada. */}
            {editor.isProcessing && <span className="processing-status" role="status">Atualizando...</span>}
          </div>
          {/* Mantém os comandos de posição próximos ao elemento que eles alteram. */}
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
