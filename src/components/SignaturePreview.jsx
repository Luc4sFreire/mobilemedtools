function SignaturePreview({ image, file, doctor, crm, saidaRef }){
    return(
        <div className="signaturePreview">
            <div className="saida" ref={saidaRef}>
                {image && <img src={image} alt={file && file?.name || ''} width={200} />}
                <p className='doctor'>{doctor}</p>
                <p className='crm'>{crm}</p>
            </div>
        </div>
    )
}

export default SignaturePreview;