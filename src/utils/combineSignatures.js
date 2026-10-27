const FINAL_WIDTH = 420
const FINAL_HEIGHT = 120
const PREVIEW_SCALE = 4
const MAX_GAP = 80
const MAX_PADDING = 20

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Falha ao carregar imagem para combinação."))
    img.src = src
  })
}

function findContentBounds(image) {
  const canvas = document.createElement("canvas")
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (!context) throw new Error("Canvas 2D indisponível para medir a assinatura.")

  context.drawImage(image, 0, 0)
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
  let left = canvas.width
  let top = canvas.height
  let right = -1
  let bottom = -1

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const offset = (y * canvas.width + x) * 4
      const alpha = data[offset + 3]
      const isVisibleInk = alpha > 8 && (
        alpha < 248 ||
        data[offset] < 246 ||
        data[offset + 1] < 246 ||
        data[offset + 2] < 246
      )
      if (!isVisibleInk) continue

      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }

  if (right < left || bottom < top) {
    return { left: 0, top: 0, width: canvas.width, height: canvas.height }
  }

  const padding = Math.max(2, Math.round(Math.min(canvas.width, canvas.height) * 0.015))
  left = Math.max(0, left - padding)
  top = Math.max(0, top - padding)
  right = Math.min(canvas.width - 1, right + padding)
  bottom = Math.min(canvas.height - 1, bottom + padding)

  return {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
  }
}

function drawContained(ctx, image, bounds, dx, dy, dw, dh) {
  const scale = Math.min(dw / bounds.width, dh / bounds.height)
  const width = bounds.width * scale
  const height = bounds.height * scale
  ctx.drawImage(
    image,
    bounds.left,
    bounds.top,
    bounds.width,
    bounds.height,
    dx + (dw - width) / 2,
    dy + (dh - height) / 2,
    width,
    height
  )
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob
        ? resolve(blob)
        : reject(new Error("Não foi possível gerar o PNG combinado.")),
      "image/png"
    )
  })
}

/**
 * Combina dois PNGs (já compostos por composeSignature) em um PNG 420x120,
 * preservando a proporção e reservando um espaçamento ajustável entre eles.
 */
export async function combineSignatures(
  urlA,
  urlB,
  { gap = 0, padding = 0, transparent = false } = {}
) {
  const [imgA, imgB] = await Promise.all([loadImage(urlA), loadImage(urlB)])
  const boundsA = findContentBounds(imgA)
  const boundsB = findContentBounds(imgB)

  const previewCanvas = document.createElement("canvas")
  previewCanvas.width = FINAL_WIDTH * PREVIEW_SCALE
  previewCanvas.height = FINAL_HEIGHT * PREVIEW_SCALE
  const previewContext = previewCanvas.getContext("2d")
  if (!previewContext) throw new Error("Canvas 2D indisponível.")
  if (!transparent) {
    previewContext.fillStyle = "#ffffff"
    previewContext.fillRect(0, 0, previewCanvas.width, previewCanvas.height)
  }

  const safeGap = Math.min(MAX_GAP, Math.max(0, Number(gap) || 0))
  const safePadding = Math.min(MAX_PADDING, Math.max(0, Number(padding) || 0))
  const contentWidth = FINAL_WIDTH - safePadding * 2
  const contentHeight = FINAL_HEIGHT - safePadding * 2
  const panelWidth = (contentWidth - safeGap) / 2
  drawContained(
    previewContext,
    imgA,
    boundsA,
    safePadding * PREVIEW_SCALE,
    safePadding * PREVIEW_SCALE,
    panelWidth * PREVIEW_SCALE,
    contentHeight * PREVIEW_SCALE
  )
  drawContained(
    previewContext,
    imgB,
    boundsB,
    (safePadding + panelWidth + safeGap) * PREVIEW_SCALE,
    safePadding * PREVIEW_SCALE,
    panelWidth * PREVIEW_SCALE,
    contentHeight * PREVIEW_SCALE
  )

  const outputCanvas = document.createElement("canvas")
  outputCanvas.width = FINAL_WIDTH
  outputCanvas.height = FINAL_HEIGHT
  const outputContext = outputCanvas.getContext("2d")
  if (!outputContext) throw new Error("Canvas 2D indisponível para gerar o arquivo final.")
  outputContext.imageSmoothingEnabled = true
  outputContext.imageSmoothingQuality = "high"
  outputContext.drawImage(
    previewCanvas,
    0,
    0,
    previewCanvas.width,
    previewCanvas.height,
    0,
    0,
    FINAL_WIDTH,
    FINAL_HEIGHT
  )

  const [previewBlob, outputBlob] = await Promise.all([
    canvasToBlob(previewCanvas),
    canvasToBlob(outputCanvas),
  ])
  return { previewBlob, outputBlob }
}