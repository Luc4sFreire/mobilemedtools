/**
 * Processa uma cópia em Canvas sem modificar o arquivo original.
 * Retorna a imagem PNG em Data URL e a sugestão de threshold, se houver remoção de fundo.
 */
export async function processSignatureImage(file, adjustments) {
  // Decodifica com ImageBitmap quando possível e usa Image.decode como alternativa.
  const bitmap = await decodeImageFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  try {
    // Mantém a resolução original enquanto os filtros de pixels são aplicados.
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Não foi possível preparar o canvas da imagem.');

    context.drawImage(bitmap.source, 0, 0);

    // Evita ler todos os pixels quando nenhum filtro ativo precisa alterar ou medir o conteúdo.
    let bounds = null;
    let suggestedBackgroundThreshold = null;
    if (
      adjustments.convertToBlack ||
      adjustments.cleanWeakPixels ||
      adjustments.autoCrop ||
      adjustments.removeBackground ||
      adjustments.contrast !== 200 ||
      adjustments.sharpness > 0 ||
      adjustments.applyPythonFilters
    ) {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const { data, width, height } = imageData;

      // Torna transparente o fundo dominante antes da limpeza, do crop e dos demais filtros.
      if (adjustments.removeBackground) {
        suggestedBackgroundThreshold = removeBackground(
          imageData,
          adjustments.backgroundThreshold,
        );
      }
      
        // O preset torna opacos os pixels restantes antes de aplicar contraste e nitidez.
        if (adjustments.applyPythonFilters) {
          for (let index = 3; index < data.length; index += 4) {
            if (data[index] > 0) data[index] = 255;
          }
        }

      // Aplica contraste antes da nitidez para manter a ordem de processamento definida.
      const contrast = adjustments.applyPythonFilters ? 400 : adjustments.contrast;
      if (contrast !== 200) applyContrast(imageData, contrast);

      // Usa nitidez 15 no preset; fora dele respeita o valor do controle manual.
      const sharpness = adjustments.applyPythonFilters ? 15 : adjustments.sharpness;
      if (sharpness > 0) applySharpness(imageData, sharpness);

      // O preset avançado remove pixels claros a partir do threshold 160.
      if (adjustments.applyPythonFilters) {
        applyBrightnessThreshold(imageData, 160);
      }

      // Inicializa a caixa delimitadora que será preenchida pelo crop automático.
      bounds = { left: width, top: height, right: -1, bottom: -1 };

      // Lê e altera cada pixel RGBA para aplicar filtros, limpeza e conversão de cor.
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = (y * width + x) * 4;
          const alpha = data[index + 3];

          // Descarta pixels fracos antes de decidir quais limites entram no recorte.
          if (adjustments.cleanWeakPixels && alpha < 15) {
            data[index + 3] = 0;
            continue;
          }

          if (alpha === 0) continue;

          // Converte pixels visíveis para preto e preserva o alpha calculado anteriormente.
          if (adjustments.convertToBlack || adjustments.applyPythonFilters) {
            data[index] = 0;
            data[index + 1] = 0;
            data[index + 2] = 0;
          }

          // Expande a caixa do crop para incluir cada pixel que continua visível.
          if (adjustments.autoCrop) {
            bounds.left = Math.min(bounds.left, x);
            bounds.top = Math.min(bounds.top, y);
            bounds.right = Math.max(bounds.right, x);
            bounds.bottom = Math.max(bounds.bottom, y);
          }
        }
      }

      // Grava no Canvas as alterações RGBA feitas no buffer de pixels.
      context.putImageData(imageData, 0, 0);
    }

    // Recorta somente a caixa visível e adiciona margem transparente quando solicitado.
    if (adjustments.autoCrop && bounds) {
      if (bounds.right < 0) {
        // Evita dimensões zero quando os filtros tornam todos os pixels transparentes.
        const emptyCanvas = document.createElement('canvas');
        emptyCanvas.width = 1;
        emptyCanvas.height = 1;
        return {
          image: emptyCanvas.toDataURL('image/png'),
          suggestedBackgroundThreshold,
        };
      }

      // Reserva 15 pixels em volta do conteúdo para evitar cortar traços da assinatura.
      const margin = 15;
      const cropWidth = bounds.right - bounds.left + 1;
      const cropHeight = bounds.bottom - bounds.top + 1;
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = cropWidth + margin * 2;
      croppedCanvas.height = cropHeight + margin * 2;

      const croppedContext = croppedCanvas.getContext('2d');
      if (!croppedContext) throw new Error('Não foi possível recortar a imagem.');

      // Desenha a caixa detectada no centro do novo Canvas, preservando seus pixels.
      croppedContext.drawImage(
        canvas,
        bounds.left,
        bounds.top,
        cropWidth,
        cropHeight,
        margin,
        margin,
        cropWidth,
        cropHeight,
      );

      return {
        image: croppedCanvas.toDataURL('image/png'),
        suggestedBackgroundThreshold,
      };
    }

    // Sem crop, serializa o Canvas original com os filtros já aplicados.
    return {
      image: canvas.toDataURL('image/png'),
      suggestedBackgroundThreshold,
    };
  } finally {
    // Libera o bitmap ou URL temporária mesmo quando o processamento falha.
    bitmap.close();
  }
}

// Ajusta RGB em torno do meio-tom; 200 representa a imagem sem alteração de contraste.
function applyContrast(imageData, percentage) {
  const factor = percentage / 100;
  const { data } = imageData;

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) continue;
    for (let channel = 0; channel < 3; channel += 1) {
      data[index + channel] = Math.max(
        0,
        Math.min(255, (data[index + channel] - 128) * factor + 128),
      );
    }
  }
}

// Remove pixels claros pelo brilho perceptual, como no preset do código legado.
function applyBrightnessThreshold(imageData, threshold) {
  const { data } = imageData;
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) continue;
    const brightness = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    if (brightness >= threshold) data[index + 3] = 0;
  }
}

// Aplica máscara de nitidez usando uma cópia borrada como referência de unsharp mask.
function applySharpness(imageData, sharpness) {
  const { width, height, data } = imageData;
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) return;
  sourceContext.putImageData(imageData, 0, 0);

  const blurCanvas = document.createElement('canvas');
  blurCanvas.width = width;
  blurCanvas.height = height;
  const blurContext = blurCanvas.getContext('2d', { willReadFrequently: true });
  if (!blurContext) return;

  // O filtro CSS de blur cria uma referência suavizada para realçar as bordas.
  blurContext.filter = `blur(${sharpness > 10 ? 2 : 1}px)`;
  blurContext.drawImage(sourceCanvas, 0, 0);
  blurContext.filter = 'none';
  const blurredData = blurContext.getImageData(0, 0, width, height).data;
  const amount = sharpness / 3;

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) continue;
    for (let channel = 0; channel < 3; channel += 1) {
      data[index + channel] = Math.max(
        0,
        Math.min(255, data[index + channel] + (data[index + channel] - blurredData[index + channel]) * amount),
      );
    }
  }
}

// Decodifica o arquivo no navegador e garante a liberação de recursos nos dois caminhos.
async function decodeImageFile(file) {
  try {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  } catch {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.src = objectUrl;

    try {
      await image.decode();
      return {
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        close: () => URL.revokeObjectURL(objectUrl),
      };
    } catch {
      URL.revokeObjectURL(objectUrl);
      throw new Error('O navegador não conseguiu decodificar este arquivo de imagem.');
    }
  }
}

// Detecta a luminância mais comum e remove tons próximos com uma transição suave de alpha.
function removeBackground(imageData, selectedThreshold) {
  const { data, width, height } = imageData;
  const histogram = new Uint32Array(256);
  const luminances = new Uint8Array(width * height);
  let visiblePixelCount = 0;

  // Conta a luminância dos pixels visíveis usando os coeficientes BT.601.
  for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += 1) {
    const index = pixelIndex * 4;
    if (data[index + 3] === 0) continue;

    const luminance = Math.round(
      data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114,
    );
    luminances[pixelIndex] = luminance;
    histogram[luminance] += 1;
    visiblePixelCount += 1;
  }

  if (visiblePixelCount === 0) return 12;

  // Suaviza os bins vizinhos para tolerar pequenas variações causadas por compressão.
  let backgroundLuminance = 0;
  let highestFrequency = -1;
  for (let luminance = 0; luminance < 256; luminance += 1) {
    let frequency = 0;
    let valuesInWindow = 0;
    for (let offset = -2; offset <= 2; offset += 1) {
      const neighbor = luminance + offset;
      if (neighbor < 0 || neighbor > 255) continue;
      frequency += histogram[neighbor];
      valuesInWindow += 1;
    }

    const averageFrequency = frequency / valuesInWindow;
    if (averageFrequency > highestFrequency) {
      highestFrequency = averageFrequency;
      backgroundLuminance = luminance;
    }
  }

  // Procura a tinta no lado oposto ao fundo para calcular uma sensibilidade inicial.
  const minimumInkFrequency = visiblePixelCount * 0.005;
  let inkLuminance = backgroundLuminance;
  if (backgroundLuminance < 128) {
    for (let luminance = 255; luminance > backgroundLuminance; luminance -= 1) {
      if (histogram[luminance] > minimumInkFrequency) {
        inkLuminance = luminance;
        break;
      }
    }
  } else {
    for (let luminance = 0; luminance < backgroundLuminance; luminance += 1) {
      if (histogram[luminance] > minimumInkFrequency) {
        inkLuminance = luminance;
        break;
      }
    }
  }

  const luminanceRange = Math.abs(backgroundLuminance - inkLuminance);
  const suggestedThreshold = Math.min(100, Math.max(12, Math.round(luminanceRange * 0.35)));
  const threshold = Number.isFinite(selectedThreshold)
    ? Math.max(0, Math.min(100, selectedThreshold))
    : suggestedThreshold;
  const fadeZone = Math.max(6, Math.round(threshold * 0.25));

  // Torna o fundo transparente e suaviza parcialmente o alpha perto do limite da tinta.
  for (let pixelIndex = 0; pixelIndex < luminances.length; pixelIndex += 1) {
    const index = pixelIndex * 4;
    const originalAlpha = data[index + 3];
    if (originalAlpha === 0) continue;

    const difference = Math.abs(luminances[pixelIndex] - backgroundLuminance);
    if (difference <= threshold) {
      data[index + 3] = 0;
    } else if (difference <= threshold + fadeZone) {
      const opacity = (difference - threshold) / fadeZone;
      data[index + 3] = Math.round(originalAlpha * opacity);
    }
  }

  return suggestedThreshold;
}