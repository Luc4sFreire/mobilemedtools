// Cada name corresponde a uma opção processada pelo hook; descriptions resumem o efeito na imagem.
const adjustmentOptions = [
  {
    name: 'convertToBlack',
    label: 'Converter para preto puro',
    description: 'Pinta os pixels visíveis em RGB 0, 0, 0.',
  },
  {
    name: 'cleanWeakPixels',
    label: 'Limpar pixels fracos',
    description: 'Remove pixels com transparência alpha menor que 15.',
  },
  {
    name: 'autoCrop',
    label: 'Crop automático',
    description: 'Remove bordas transparentes e preserva margem de 15 px.',
  },
  {
    name: 'removeBackground',
    label: 'Remover fundo',
    description: 'Detecta o tom dominante e ajusta a transparência ao redor da tinta.',
  },
  {
    name: 'applyPythonFilters',
    label: 'Preset de limpeza avançada',
    description: 'Aplica o conjunto legado de contraste, nitidez, threshold e preto.',
  },
];

function ImageAdjustments({ adjustments, backgroundThresholds, showSecondThreshold, onChange, onReset }) {
  return (
    // Agrupa os filtros e associa um nome acessível ao conjunto de controles.
    <fieldset className="image-adjustments">
      <legend>Ajustes da imagem</legend>
      <div className="adjustment-list">
        {adjustmentOptions.map(({ name, label, description }) => (
          // O label permite alternar o filtro clicando no controle ou em sua descrição.
          <label className="adjustment-option" key={name}>
            <input
              type="checkbox"
              name={name}
              // O hook recebe a opção marcada e atualiza a imagem derivada do arquivo original.
              checked={adjustments[name]}
              onChange={onChange}
            />
            <span className="adjustment-copy">
              <span className="adjustment-title">{label}</span>
              <span className="adjustment-description">{description}</span>
            </span>
          </label>
        ))}
      </div>
      {adjustments.removeBackground && (
        [0, ...(showSecondThreshold ? [1] : [])].map((signatureIndex) => (
          // Exibe um controle de sensibilidade para cada imagem sujeita à remoção de fundo.
          <div className="background-threshold" key={`background-threshold-${signatureIndex}`}>
            <label className="threshold-label" htmlFor={`background-threshold-${signatureIndex}`}>
              <span>{signatureIndex === 0 ? 'Sensibilidade do fundo' : 'Sensibilidade do segundo fundo'}</span>
              <output>{backgroundThresholds[signatureIndex] ?? 'Calculando...'}</output>
            </label>
            <input
              aria-label={`Sensibilidade da remoção do fundo ${signatureIndex + 1}`}
              className="threshold-slider"
              data-signature-index={signatureIndex}
              id={`background-threshold-${signatureIndex}`}
              max="100"
              min="0"
              name="backgroundThreshold"
              onChange={onChange}
              step="1"
              type="range"
              value={backgroundThresholds[signatureIndex] ?? 35}
            />
            <p className="threshold-help">Aumente para remover mais tons próximos ao fundo.</p>
          </div>
        ))
      )}
      <div className="manual-image-controls">
        <label className="range-control" htmlFor="contrast-range">
          <span>Contraste</span>
          <output>{adjustments.contrast}%</output>
          <input
            disabled={adjustments.applyPythonFilters}
            id="contrast-range"
            max="400"
            min="0"
            name="contrast"
            onChange={onChange}
            step="1"
            type="range"
            value={adjustments.contrast}
          />
        </label>
        <label className="range-control" htmlFor="sharpness-range">
          <span>Nitidez</span>
          <output>{adjustments.sharpness}</output>
          <input
            disabled={adjustments.applyPythonFilters}
            id="sharpness-range"
            max="15"
            min="0"
            name="sharpness"
            onChange={onChange}
            step="1"
            type="range"
            value={adjustments.sharpness}
          />
        </label>
      </div>
      {adjustments.applyPythonFilters && (
        <p className="preset-note">O preset controla contraste e nitidez enquanto estiver ativo.</p>
      )}
      <button className="reset-adjustments" onClick={onReset} type="button">
        Restaurar ajustes
      </button>
    </fieldset>
  );
}

export default ImageAdjustments;