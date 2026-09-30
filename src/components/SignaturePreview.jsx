import '../style/preview.css';

// Exibe as mesmas imagens e linhas de identificação que serão exportadas.
function SignaturePreview({
  signatures,
  positions,
  signatureRef,
  onDragStart,
  onDragMove,
  onDragEnd,
}) {
  return (
    // O padrão quadriculado representa transparência e fica fora da composição exportada.
    <div className="preview-stage">
      <div className="signature-output" ref={signatureRef}>
        <div className="signature-content">
          {signatures.map((signature, index) => (
            // Cada cartão tem posição e escala próprias, controladas pelo hook.
            <article
              className="signature-card"
              key={`signature-${index + 1}`}
              onPointerCancel={onDragEnd}
              onPointerDown={(event) => onDragStart(event, index)}
              onPointerMove={onDragMove}
              onPointerUp={onDragEnd}
              style={{
                left: `${positions[index]?.x ?? 50}%`,
                top: `${positions[index]?.y ?? 50}%`,
                transform: `translate(-50%, -50%) scale(${signature.size / 100}) scale(var(--export-fit-scale, 1))`,
                width: signatures.length > 1 ? '44%' : '100%',
                maxWidth: '100%',
                height: '100%',
                fontFamily: signature.fontFamily,
              }}
            >
              {signature.image ? (
                <img
                  alt={`Imagem da assinatura ${index + 1}: ${signature.file?.name || ''}`}
                  className="signature-image"
                  src={signature.image}
                />
              ) : (
                <p className="preview-placeholder">
                  {index === 0 ? 'Selecione uma imagem para iniciar' : 'Selecione a segunda imagem'}
                </p>
              )}

              {/* O modo modelo preserva somente a imagem, sem acrescentar identificação. */}
              {signature.lines.length > 0 && (
                <div className="signature-details" style={{ marginTop: `${signature.gap}px` }}>
                  {signature.lines.map((line, lineIndex) => (
                    <p
                      className={lineIndex === 0 ? 'doctor-name' : 'doctor-registration'}
                      key={`${index}-${lineIndex}`}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SignaturePreview;