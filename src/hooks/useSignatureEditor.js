import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { processSignatureImage } from '../utils/processSignatureImage';

// Define valores padrão usados para novos perfis de assinatura.
function createProfessional() {
  return {
    name: '',
    registration: '',
    type: 'doctor',
    crmType: 'default',
    compactRegistration: false,
    includeRqe: false,
    rqe: '',
    compactRqe: false,
  };
}

// Mantém as opções de processamento centralizadas e reproduz os valores do editor legado.
const initialAdjustments = {
  convertToBlack: false,
  cleanWeakPixels: false,
  autoCrop: false,
  removeBackground: false,
  contrast: 200,
  sharpness: 0,
  applyPythonFilters: false,
};

// Cria as linhas de identificação que aparecem abaixo de cada imagem.
function formatProfessional(professional, phrases, includePhrases, isModel) {
  if (isModel) return [];

  const lines = [professional.name.trim()];
  if (includePhrases && phrases.before.trim()) lines.push(phrases.before.trim());

  const registration = professional.registration.trim().replace(/^\/+/, '');
  if (registration) {
    lines.push(
      professional.compactRegistration
        ? `${professional.registerLabel}/${registration}`
        : `${professional.registerLabel}: ${registration}`,
    );
  }

  const rqe = professional.rqe.trim().replace(/^\/+/, '');
  if (professional.includeRqe && rqe) {
    lines.push(professional.compactRqe ? `RQE/${rqe}` : `RQE: ${rqe}`);
  }

  if (includePhrases && phrases.after.trim()) lines.push(phrases.after.trim());
  return lines.filter(Boolean);
}

export function useSignatureEditor() {
  // O índice zero é a assinatura principal; o índice um é opcional.
  const [files, setFiles] = useState([null, null]);
  const [images, setImages] = useState([null, null]);
  const [professionals, setProfessionals] = useState([createProfessional(), createProfessional()]);

  // Ajustes comuns às imagens e textos opcionais que podem acompanhar cada assinatura.
  const [adjustments, setAdjustments] = useState(initialAdjustments);
  const [backgroundThresholds, setBackgroundThresholds] = useState([null, null]);
  const [includePhrases, setIncludePhrases] = useState(false);
  const [phrases, setPhrases] = useState([
    { before: '', after: '' },
    { before: '', after: '' },
  ]);
  const [secondEnabled, setSecondEnabled] = useState(false);
  const [secondModelMode, setSecondModelMode] = useState(false);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [signatureGap, setSignatureGap] = useState(5);
  const [positions, setPositions] = useState([{ x: 50, y: 50 }, { x: 72, y: 50 }]);
  const [history, setHistory] = useState({ past: [], future: [] });
  const positionsRef = useRef(positions);
  const historyRef = useRef(history);
  const dragRef = useRef(null);

  // Estados de processamento, exportação e erro usados pela interface.
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const signatureRef = useRef(null);

  // Recalcula as imagens a partir dos arquivos originais sempre que uma opção muda.
  useEffect(() => {
    if (!files.some(Boolean)) return undefined;

    let isCurrent = true;
    Promise.all(files.map((file, index) => (
      file
        ? processSignatureImage(file, {
          ...adjustments,
          backgroundThreshold: backgroundThresholds[index],
        })
        : Promise.resolve(null)
    )))
      .then((results) => {
        if (!isCurrent) return;
        setImages(results.map((result) => result?.image ?? null));

        // Cada arquivo recebe e guarda sua própria recomendação de sensibilidade.
        if (adjustments.removeBackground) {
          setBackgroundThresholds((current) => current.map((threshold, index) => (
            threshold === null && Number.isFinite(results[index]?.suggestedBackgroundThreshold)
              ? results[index].suggestedBackgroundThreshold
              : threshold
          )));
        }
      })
      .catch((processingError) => {
        if (!isCurrent) return;
        setImages([null, null]);
        setError(processingError.message || 'Não foi possível processar esta imagem.');
      })
      .finally(() => {
        if (isCurrent) setIsProcessing(false);
      });

    return () => {
      // Impede que uma operação antiga sobrescreva o resultado da seleção mais recente.
      isCurrent = false;
    };
  }, [files, adjustments, backgroundThresholds]);

  // Valida e guarda um dos arquivos, permitindo re-selecionar o mesmo arquivo depois.
  function handleFileChange(event, signatureIndex = 0) {
    const selectedFile = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!selectedFile) return;

    if (selectedFile.type && !selectedFile.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem.');
      return;
    }

    setError('');
    setIsProcessing(true);
    setBackgroundThresholds((current) => current.map((threshold, index) => (
      index === signatureIndex ? null : threshold
    )));
    setFiles((current) => current.map((file, index) => (
      index === signatureIndex ? selectedFile : file
    )));
  }

  // Atualiza um checkbox ou slider dentro das opções de imagem.
  function handleAdjustmentChange(event) {
    const { name, type, checked, value, dataset } = event.currentTarget;
    if (name === 'backgroundThreshold') {
      const signatureIndex = Number(dataset.signatureIndex);
      setError('');
      setIsProcessing(true);
      setBackgroundThresholds((current) => current.map((threshold, index) => (
        index === signatureIndex ? Number(value) : threshold
      )));
      return;
    }

    const nextValue = type === 'checkbox' ? checked : Number(value);
    setError('');
    setIsProcessing(true);
    setAdjustments((current) => ({ ...current, [name]: nextValue }));
  }

  // Atualiza um campo de um dos perfis sem modificar o outro perfil.
  function updateProfessional(signatureIndex, field, value) {
    setProfessionals((current) => current.map((professional, index) => (
      index === signatureIndex ? { ...professional, [field]: value } : professional
    )));
  }

  // Liga/desliga a assinatura adicional e restaura seus dados ao desativá-la.
  function handleSecondSignatureChange(event) {
    const enabled = event.currentTarget.checked;
    setSecondEnabled(enabled);
    updatePositions(enabled
      ? [{ x: 28, y: 50 }, { x: 72, y: 50 }]
      : [{ x: 50, y: 50 }, { x: 72, y: 50 }]);
    historyRef.current = { past: [], future: [] };
    setHistory(historyRef.current);
    if (!enabled) {
      setFiles((current) => [current[0], null]);
      setImages((current) => [current[0], null]);
      setBackgroundThresholds((current) => [current[0], null]);
      setProfessionals((current) => [current[0], createProfessional()]);
      setSecondModelMode(false);
    }
  }

  // Controla o preset pronto usado como segunda imagem e remove dados de formulário conflitantes.
  function handleSecondModelChange(event) {
    const enabled = event.currentTarget.checked;
    setSecondModelMode(enabled);
    if (enabled) {
      setProfessionals((current) => [current[0], createProfessional()]);
    }
  }

  // Atualiza frases comuns e ativa/desativa sua inclusão na composição.
  function handlePhraseChange(event, signatureIndex = 0) {
    const { name, value } = event.currentTarget;
    setPhrases((current) => current.map((phrase, index) => (
      index === signatureIndex ? { ...phrase, [name]: value } : phrase
    )));
  }

  // Restaura os filtros ao estado inicial, respeitando a preferência padrão do editor.
  function handleResetAdjustments() {
    setAdjustments({ ...initialAdjustments });
    setBackgroundThresholds([null, null]);
    if (files.some(Boolean)) setIsProcessing(true);
    setError('');
  }

  // Mantém um valor síncrono das posições para o arraste e para o histórico.
  function updatePositions(nextPositions) {
    positionsRef.current = nextPositions;
    setPositions(nextPositions);
  }

  // Inicia o arraste e captura a posição que poderá ser restaurada com undo.
  function handleDragStart(event, signatureIndex) {
    if (!images[signatureIndex]) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      signatureIndex,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPositions: positionsRef.current.map((position) => ({ ...position })),
    };
  }

  // Atualiza a posição em percentuais relativos ao elemento que será exportado.
  function handleDragMove(event) {
    const drag = dragRef.current;
    const stage = signatureRef.current;
    if (!drag || !stage || event.pointerId !== drag.pointerId) return;

    const bounds = stage.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;

    const startPosition = drag.startPositions[drag.signatureIndex];
    const nextPositions = drag.startPositions.map((position) => ({ ...position }));
    const halfWidth = (event.currentTarget.offsetWidth / bounds.width) * 50;
    const halfHeight = (event.currentTarget.offsetHeight / bounds.height) * 50;
    nextPositions[drag.signatureIndex] = {
      x: Math.min(100 - halfWidth, Math.max(halfWidth, startPosition.x + ((event.clientX - drag.startX) / bounds.width) * 100)),
      y: Math.min(100 - halfHeight, Math.max(halfHeight, startPosition.y + ((event.clientY - drag.startY) / bounds.height) * 100)),
    };
    updatePositions(nextPositions);
  }

  // Salva o ponto anterior ao arraste e limita o undo aos vinte movimentos mais recentes.
  function handleDragEnd(event) {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    dragRef.current = null;

    if (JSON.stringify(drag.startPositions) === JSON.stringify(positionsRef.current)) return;
    const nextHistory = {
      past: [...historyRef.current.past, drag.startPositions].slice(-20),
      future: [],
    };
    historyRef.current = nextHistory;
    setHistory(nextHistory);
  }

  // Desfaz um arraste e guarda a posição atual na pilha de redo.
  function handleUndo() {
    const currentHistory = historyRef.current;
    if (!currentHistory.past.length) return;
    const previous = currentHistory.past[currentHistory.past.length - 1];
    const nextHistory = {
      past: currentHistory.past.slice(0, -1),
      future: [...currentHistory.future, positionsRef.current],
    };
    historyRef.current = nextHistory;
    setHistory(nextHistory);
    updatePositions(previous);
  }

  // Refaz o último arraste desfeito e restaura a possibilidade de desfazer novamente.
  function handleRedo() {
    const currentHistory = historyRef.current;
    if (!currentHistory.future.length) return;
    const next = currentHistory.future[currentHistory.future.length - 1];
    const nextHistory = {
      past: [...currentHistory.past, positionsRef.current].slice(-20),
      future: currentHistory.future.slice(0, -1),
    };
    historyRef.current = nextHistory;
    setHistory(nextHistory);
    updatePositions(next);
  }

  // Lê as referências e ações mais recentes dentro do listener sem recriá-lo por render.
  const handleKeyDown = useEffectEvent((event) => {
    const targetTag = event.target?.tagName;
    const isEditingText = ['INPUT', 'TEXTAREA'].includes(targetTag) || event.target?.isContentEditable;
    if (isEditingText || !(event.ctrlKey || event.metaKey)) return;

    const key = event.key.toLowerCase();
    if (key === 'z' && !event.shiftKey) {
      handleUndo();
      event.preventDefault();
    } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
      handleRedo();
      event.preventDefault();
    }
  });

  // Instala atalhos globais sem interferir no undo nativo dentro de campos editáveis.
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Converte a composição HTML em PNG transparente e baixa o arquivo.
  async function handleDownload() {
    const requiredSecondImage = !secondEnabled || Boolean(images[1]);
    const firstProfessional = professionals[0];
    const secondProfessional = professionals[1];
    const hasRequiredDetails = Boolean(firstProfessional.name.trim() && firstProfessional.registration.trim());
    const hasSecondDetails = !secondEnabled || secondModelMode || Boolean(
      secondProfessional.name.trim() && secondProfessional.registration.trim()
    );

    if (!signatureRef.current || !images[0] || !requiredSecondImage || isProcessing || isExporting) return;
    if (!hasRequiredDetails || !hasSecondDetails) {
      setError('Preencha nome e registro de cada assinatura antes de baixar.');
      return;
    }

    setIsExporting(true);
    setError('');

    const exportNode = signatureRef.current;
    const previousWidth = exportNode.style.width;
    const previousHeight = exportNode.style.height;
    const previousMinHeight = exportNode.style.minHeight;
    const previousOverflow = exportNode.style.overflow;
    const exportCards = [...exportNode.querySelectorAll('.signature-card')];
    const previousFitScales = exportCards.map((card) => card.style.getPropertyValue('--export-fit-scale'));

    exportNode.style.width = '840px';
    exportNode.style.height = '400px';
    exportNode.style.minHeight = '400px';
    exportNode.style.overflow = 'hidden';

    try {
      exportCards.forEach((card) => {
        if (!card.clientWidth || !card.clientHeight) return;
        const overflowScale = Math.max(
          1,
          card.scrollWidth / card.clientWidth,
          card.scrollHeight / card.clientHeight,
        );
        card.style.setProperty('--export-fit-scale', String(1 / overflowScale));
      });

      const png = await toPng(exportNode, {
        cacheBust: true,
        width: 840,
        height: 400,
        pixelRatio: 1,
        backgroundColor: '#ffffff',
      });
      const safeName = firstProfessional.name.trim().replace(/[\\/:*?"<>|]/g, '-') || 'Profissional';
      const link = document.createElement('a');
      link.download = `Assinatura-${safeName}.png`;
      link.href = png;
      link.click();
    } catch (exportError) {
      setError(exportError.message || 'Não foi possível gerar o PNG.');
    } finally {
      exportNode.style.width = previousWidth;
      exportNode.style.height = previousHeight;
      exportNode.style.minHeight = previousMinHeight;
      exportNode.style.overflow = previousOverflow;
      exportCards.forEach((card, index) => {
        if (previousFitScales[index]) {
          card.style.setProperty('--export-fit-scale', previousFitScales[index]);
        } else {
          card.style.removeProperty('--export-fit-scale');
        }
      });
      setIsExporting(false);
    }
  }

  // Prepara os dados de apresentação sem misturar formatação com os componentes visuais.
  const previewSignatures = images.map((image, index) => {
    const professional = professionals[index];
    const registerLabel = { doctor: 'CRM', vet: 'CRMV', dentist: 'CRO' }[professional.type];
    return {
      image,
      file: files[index],
      lines: formatProfessional(
        { ...professional, registerLabel },
        phrases[index],
        includePhrases,
        index === 1 && secondModelMode,
      ),
      size: 100,
      fontFamily,
      gap: signatureGap,
      isModel: index === 1 && secondModelMode,
    };
  });

  return {
    adjustments,
    backgroundThresholds,
    error,
    files,
    fontFamily,
    handleAdjustmentChange,
    handleDragEnd,
    handleDragMove,
    handleDragStart,
    handleDownload,
    handleFileChange,
    handlePhraseChange,
    handleResetAdjustments,
    handleSecondModelChange,
    handleSecondSignatureChange,
    handleUndo,
    handleRedo,
    history,
    images,
    includePhrases,
    isExporting,
    isProcessing,
    phrases,
    positions,
    previewSignatures,
    professionals,
    secondEnabled,
    secondModelMode,
    setFontFamily,
    setIncludePhrases,
    setSignatureGap,
    signatureRef,
    signatureGap,
    updateProfessional,
  };
}