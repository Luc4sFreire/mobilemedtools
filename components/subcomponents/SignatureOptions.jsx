import { SIGNATURE_DETAIL_LABELS } from "../../src/utils/signatureDetails"

function SignatureOptions({ signature, label, idPrefix }) {
    const thicknessLabel = Number(signature.imageOptions.espessura).toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    })
    const processingDisabled = signature.isReadyImage

    return (
        <section className="configImage signature-image-options">
            <div className="signature-image-options-header">
                <div>
                    <h2>Personalização — {label}</h2>
                    <p className="helper-text">
                        {signature.isReadyImage
                            ? "Ajustes da imagem pronta, que será incluída sem informações adicionais."
                            : "Ajustes independentes. A composição mantém a imagem acima das informações."}
                    </p>
                </div>
                <button type="button" onClick={signature.resetImageOptions}>
                    Restaurar padrão
                </button>
            </div>

            <div className="signature-image-options-grid">
                <div className="signature-option-field">
                    <label htmlFor={`${idPrefix}-image-scale`}>
                        Tamanho da imagem: {signature.imageScale}%
                    </label>
                    <input
                        id={`${idPrefix}-image-scale`}
                        type="range"
                        min="50"
                        max="200"
                        step="1"
                        value={signature.imageScale}
                        onChange={(event) => signature.setImageScale(Number(event.target.value))}
                    />
                    <span className="helper-text">
                        Define o tamanho da imagem dentro da área disponível.
                    </span>
                </div>
                {!signature.isReadyImage && (
                    <div className="signature-option-field">
                        <label htmlFor={`${idPrefix}-text-scale`}>
                            Tamanho do texto: {signature.textScale}%
                        </label>
                        <input
                            id={`${idPrefix}-text-scale`}
                            type="range"
                            min="50"
                            max="150"
                            step="1"
                            value={signature.textScale}
                            onChange={(event) => signature.setTextScale(Number(event.target.value))}
                        />
                        <span className="helper-text">
                            O texto é reduzido automaticamente se precisar caber na composição.
                        </span>
                    </div>
                )}
                <div className="signature-option-field">
                    <label htmlFor={`${idPrefix}-thickness`}>
                        Espessura do traço: {thicknessLabel} px
                    </label>
                    <input
                        id={`${idPrefix}-thickness`}
                        type="range"
                        min="-10"
                        max="10"
                        step="0.1"
                        value={signature.imageOptions.espessura}
                        disabled={processingDisabled}
                        onChange={(event) => signature.setImageOption(
                            "espessura",
                            Number(event.target.value)
                        )}
                    />
                    <span className="helper-text">
                        Valores negativos afinam e positivos engrossam o traço.
                    </span>
                </div>
                {!signature.isReadyImage && (
                    <div className="signature-option-field">
                        <label htmlFor={`${idPrefix}-text-layout`}>Layout das informações</label>
                        <select
                            id={`${idPrefix}-text-layout`}
                            value={signature.textLayout}
                            onChange={(event) => signature.setTextLayout(event.target.value)}
                        >
                            <option value="lines">Informações em linhas</option>
                            <option value="compact">Dados compactos em bloco</option>
                            <option value="grid-2">Grade — 2 colunas</option>
                            <option value="grid-3">Grade — 3 colunas</option>
                        </select>
                        <span className="helper-text">
                            O layout organiza somente os dados preenchidos e habilitados.
                        </span>
                    </div>
                )}
                {!signature.isReadyImage && (
                    <div className="signature-option-field">
                        <label htmlFor={`${idPrefix}-text-align`}>Alinhamento do texto</label>
                        <select
                            id={`${idPrefix}-text-align`}
                            value={signature.textAlign}
                            onChange={(event) => signature.setTextAlign(event.target.value)}
                        >
                            <option value="left">À esquerda</option>
                            <option value="center">Centralizado</option>
                            <option value="right">À direita</option>
                        </select>
                        <span className="helper-text">
                            Aplica-se às informações em linhas e ao conteúdo de cada célula da grade.
                        </span>
                    </div>
                )}
            </div>

            {!signature.isReadyImage && (
                <div className="signature-detail-order">
                    <h3>Ordem das informações</h3>
                    <p className="helper-text">
                        Use as setas para definir a sequência. Campos vazios ou desativados são ignorados.
                    </p>
                    <ol>
                        {signature.detailOrder.map((key, index) => (
                            <li key={key}>
                                <span>{SIGNATURE_DETAIL_LABELS[key]}</span>
                                <div>
                                    <button
                                        type="button"
                                        aria-label={`Mover ${SIGNATURE_DETAIL_LABELS[key]} para cima`}
                                        disabled={index === 0}
                                        onClick={() => signature.moveDetailOrder(key, -1)}
                                    >
                                        ↑
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={`Mover ${SIGNATURE_DETAIL_LABELS[key]} para baixo`}
                                        disabled={index === signature.detailOrder.length - 1}
                                        onClick={() => signature.moveDetailOrder(key, 1)}
                                    >
                                        ↓
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            )}

            <div className="signature-image-checkboxes">
                <label className="checkbox-group">
                    <input
                        type="checkbox"
                        checked={signature.imageOptions.transparente}
                        disabled={processingDisabled}
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
                        disabled={processingDisabled}
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
                        disabled={processingDisabled}
                        onChange={(event) => signature.setImageOption(
                            "suavizar",
                            event.target.checked
                        )}
                    />
                    Suavizar as bordas
                </label>
            </div>
            {processingDisabled && (
                <p className="helper-text">
                    O processamento de imagem está desativado para a imagem pronta.
                </p>
            )}
        </section>
    )
}

export default SignatureOptions
