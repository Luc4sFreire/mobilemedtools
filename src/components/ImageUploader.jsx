// Reutiliza o seletor para ambos os perfis; signatureIndex define o destino do arquivo.
function ImageUploader({ file, onFileChange, signatureIndex = 0 }) {
    const inputId = `signature-file-${signatureIndex + 1}`;

    return (
        // Agrupa o seletor visível e o nome do arquivo associado a este perfil.
        <section className="upload-section" aria-labelledby={`${inputId}-heading`}>
            <h3 id={`${inputId}-heading`}>{signatureIndex === 0 ? 'Imagem da assinatura' : 'Segunda assinatura ou modelo pronto'}</h3>
            {/* O label abre o seletor nativo oculto sem remover o controle acessível. */}
            <label className="upload-control" htmlFor={inputId}>
                <span className="upload-icon" aria-hidden="true">＋</span>
                <span>{file ? 'Trocar imagem' : 'Selecionar imagem'}</span>
            </label>
            {/* Filtra arquivos de imagem no diálogo; o hook valida o tipo após a seleção. */}
            <input
                accept="image/*"
                className="file-input"
                id={inputId}
                onChange={onFileChange}
                type="file"
            />
            {/* Identifica o arquivo selecionado ou informa os formatos aceitos pelo upload. */}
            <p className="file-name">{file ? file.name : 'PNG, JPG ou outro formato de imagem'}</p>
        </section>
    );
}

export default ImageUploader;