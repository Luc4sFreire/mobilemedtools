// Seletor reaproveitável: o índice identifica qual assinatura recebe o arquivo.
function ImageUploader({ file, onFileChange, signatureIndex = 0 }) {
    const inputId = `signature-file-${signatureIndex + 1}`;

    return (
        // A seção agrupa botão de upload e indicação do arquivo selecionado.
        <section className="upload-section" aria-labelledby={`${inputId}-heading`}>
            <h3 id={`${inputId}-heading`}>{signatureIndex === 0 ? 'Imagem da assinatura' : 'Segunda assinatura ou modelo pronto'}</h3>
            {/* O label aciona o input oculto e mantém um controle visível e acessível. */}
            <label className="upload-control" htmlFor={inputId}>
                <span className="upload-icon" aria-hidden="true">＋</span>
                <span>{file ? 'Trocar imagem' : 'Selecionar imagem'}</span>
            </label>
            {/* Restringe o seletor a formatos de imagem; a validação também ocorre no hook. */}
            <input
                accept="image/*"
                className="file-input"
                id={inputId}
                onChange={onFileChange}
                type="file"
            />
            {/* Mostra o nome atual ou uma indicação dos formatos aceitos. */}
            <p className="file-name">{file ? file.name : 'PNG, JPG ou outro formato de imagem'}</p>
        </section>
    );
}

export default ImageUploader;