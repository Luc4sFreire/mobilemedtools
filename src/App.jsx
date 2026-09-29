import './style/index.css';
import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import DoctorForm from './components/DoctorForm';
import ImageUploader from './components/ImageUploader';
import SignaturePreview from './components/SignaturePreview';

export default function App(){
  const [image, setImage] = useState(null);
  const [file, setFile] = useState('');
  const [doctor, setDoctor] = useState('');
  const [crm, setCrm] = useState('');
  const saidaRef = useRef(null);
  const [typeDoctor, setTypeDoctor] = useState('');

    function handleFile(e){
      const arquivo = e.target.files;
      if(arquivo && arquivo[0]){
        setFile(arquivo[0]);

        const reader = new FileReader();
        reader.onloadend = () => {
          setImage(reader.result); // dataURL (base 64)
        };

        reader.readAsDataURL(arquivo[0]);
      }
    }

    function handleDoctor(e){
      setDoctor(e.target.value)
    }    

    function handleCrm(e){
      setCrm(e.target.value)
    }    


    async function handleDownload(){
      if(!saidaRef.current) return console.log('caiu aqui');

      try{
        const dataURL = await toPng(saidaRef.current, {
          cacheBust: true, // Adiciona um parâmetro timestamp (?t=1234567) nas URLs de imagens externas para forçar o navegador a não usar cache. Útil quando as imagens podem ser atualizadas com a mesma URL. No seu caso com base64 é redundante, mas não atrapalha.
          pixelRatio: 2, 
          /*
            Renderiza o canvas em 2x a resolução. Se a div.saida tem 400×300 CSS pixels, o PNG sai 800×600. Isso é essencial para assinaturas digitais, porque:
            Ficam nítidas em telas retina.
            Ficam legíveis quando impressas em documentos (receitas, laudos).
            O padrão (1) costuma sair borrado em PDFs.
          */
          backgroundColor: '#ffffff', // O PNG suporta transparência. Sem essa opção, se sua div.saida não tiver fundo definido no CSS, o PNG sai com fundo transparente. Em um documento Word ou PDF, o texto pode ficar ilegível sobre o fundo. Forçar branco garante portabilidade.
        })


        // Gera o link temporário para download
        const link = document.createElement("a");
        link.download = `Assinatura-${doctor}.png`
        link.href = dataURL;
        link.click();

        
      }catch(err){
        console.error('Erro ao gerar PNG: ', err);
      }
    }

    function chooseProfissional(e){
      setTypeDoctor(e.target.value)
    }

    return (
    <>
      <ImageUploader 
        file={file}
        onChangeFile={handleFile}
      />

      <div className="buttonsProfissional">
        <button onClick={chooseProfissional} value="doctor">Médico</button>
        <button onClick={chooseProfissional} value="vet">Veterinário</button>
        <button onClick={chooseProfissional} value="dentist">Dentista</button>
      </div>

      <DoctorForm
        type={typeDoctor} 
        doctor={doctor}
        crm={crm}
        onDoctorChange={handleDoctor}
        onCrmChange={handleCrm}
      />
      

      <div className="contentExit">
        <SignaturePreview 
          image={image}
          file={file}
          doctor={doctor}
          crm={crm}
          saidaRef={saidaRef}
        />
        <button onClick={handleDownload}>Baixar Assinatura (PNG)</button>
      </div>
    </>
  )
}
