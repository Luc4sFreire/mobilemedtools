function ImageUploader({ file, onChangeFile }){
    return(
        <div className="imageUploader">
            <label htmlFor="file">Escolha um arquivo</label>
            <input type="file" onChange={onChangeFile} id='file'/>
            <div>{file && "Arquivo: "+file.name}</div>
        </div>
    )
}

export default ImageUploader;