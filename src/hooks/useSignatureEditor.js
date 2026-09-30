import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { processSignatureImage } from '../utils/processSignatureImage';

// Inicializa cada perfil sem dados e com os formatos padrão de CRM e RQE.
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

// Define filtros iniciais; contraste 200 e nitidez 0 preservam os pixels sem alteração.
const initialAdjustments = {
  convertToBlack: false,
  cleanWeakPixels: false,
  autoCrop: false,
  removeBackground: false,
  contrast: 200,
  sharpness: 0,
  applyPythonFilters: false,
};

// Monta nome, registro, RQE e frases na ordem em que aparecem no cartão da assinatura.
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
  // Mantém até dois arquivos e dados, associando índice zero ao perfil principal.
  const [files, setFiles] = useState([null, null]);
  const [images, setImages] = useState([null, null]);
  const [professionals, setProfessionals] = useState([createProfessional(), createProfessional()]);

  // Guarda filtros compartilhados, thresholds por imagem e textos opcionais da composição.
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

  // Informa à tela quando imagens estão sendo processadas, o PNG está sendo gerado ou há erro.
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const signatureRef = useRef(null);

  // Reprocessa os arquivos originais para evitar acumular perdas ao alternar filtros.
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

        // Sugere uma sensibilidade uma vez por arquivo e preserva mudanças manuais do usuário.
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
      // Descarta resultados atrasados quando upload ou opções já iniciaram novo processamento.
      isCurrent = false;
    };
  }, [files, adjustments, backgroundThresholds]);

  // Valida e associa o arquivo ao perfil indicado; limpa o input para permitir selecioná-lo de novo.
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

  // Atualiza filtros comuns ou o threshold individual da imagem indicada no elemento.
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

  // Altera somente o campo do perfil indicado e preserva os dados da outra assinatura.
  function updateProfessional(signatureIndex, field, value) {
    setProfessionals((current) => current.map((professional, index) => (
      index === signatureIndex ? { ...professional, [field]: value } : professional
    )));
  }

  // Habilita o segundo perfil ou limpa seus arquivos e dados quando ele é desativado.
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

  // Define a segunda imagem como modelo e limpa dados profissionais incompatíveis com esse modo.
  function handleSecondModelChange(event) {
    const enabled = event.currentTarget.checked;
    setSecondModelMode(enabled);
    if (enabled) {
      setProfessionals((current) => [current[0], createProfessional()]);
    }
  }

  // Armazena as frases antes/depois de cada perfil; includePhrases decide se entram no PNG.
  function handlePhraseChange(event, signatureIndex = 0) {
    const { name, value } = event.currentTarget;
    setPhrases((current) => current.map((phrase, index) => (
      index === signatureIndex ? { ...phrase, [name]: value } : phrase
    )));
  }

  // Restaura todos os filtros e thresholds aos valores padrão definidos em initialAdjustments.
  function handleResetAdjustments() {
    setAdjustments({ ...initialAdjustments });
    setBackgroundThresholds([null, null]);
    if (files.some(Boolean)) setIsProcessing(true);
    setError('');
  }

  // Sincroniza React e referências mutáveis para o arraste, undo e redo.
  function updatePositions(nextPositions) {
    positionsRef.current = nextPositions;
    setPositions(nextPositions);
  }

  // Captura ponteiro e posições iniciais para arrastar apenas a imagem carregada.
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

  // Converte o movimento do ponteiro em percentuais do quadro e limita o cartão às bordas.
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

  // Registra a posição anterior ao arraste e mantém somente vinte estados para desfazer.
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

  // Restaura a posição anterior e guarda a atual para que possa ser refeita.
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

  // Reaplica a posição da pilha futura e devolve a posição atual à pilha de undo.
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

  // Usa os callbacks e históricos atuais sem reinstalar o listener a cada renderização.
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

  // Registra atalhos Ctrl/Cmd para posições sem interceptar undo/redo em campos de texto.
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Exporta um PNG branco de 840 x 400 px com a composição limitada ao quadro de 420 x 200 px.
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
      // Reduz somente cartões cujo conteúdo excede suas dimensões no quadro de composição.
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
      // Restaura dimensões e escalas temporárias para não alterar o preview após o download.
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

  // Entrega aos componentes imagens processadas, linhas formatadas e opções visuais por perfil.
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