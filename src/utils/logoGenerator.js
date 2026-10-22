// Dimensões comuns dos PNGs, margem interna e redução máxima do bitmap de origem.
const LOGO_SIZE = 200;
const LOGO_PADDING = 16;
const MAX_SOURCE_SIDE = 1000;

// Cria um canvas no tamanho de saída padrão ou nas dimensões pedidas pelo fluxo.
function createCanvas(width = LOGO_SIZE, height = LOGO_SIZE) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

// Codifica um canvas como PNG e rejeita quando o navegador não retorna um Blob.
function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Não foi possível criar o PNG neste navegador."));
        }, "image/png");
    });
}

// Extrai até quatro iniciais, ou os dois primeiros caracteres de um nome simples.
function getInitials(name) {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) return [...words[0]].slice(0, 2).join("").toUpperCase();
    return words.slice(0, 4).map((word) => [...word][0]).join("").toUpperCase();
}

// Mantém um nome explícito para o modo de exibição abreviado.
function getAbbreviation(name) {
    return getInitials(name);
}

// Quebra nomes por palavra e limita o texto a uma quantidade fixa de linhas.
function wrapName(context, name, maxWidth, maxLines = 2) {
    const words = name.trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";

    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && context.measureText(candidate).width > maxWidth) {
            lines.push(line);
            line = word;
        } else {
            line = candidate;
        }
    }
    if (line) lines.push(line);

    if (lines.length > maxLines) {
        const shortened = lines.slice(0, maxLines);
        shortened[maxLines - 1] = `${shortened[maxLines - 1].slice(0, 13).trimEnd()}…`;
        return shortened;
    }
    return lines;
}

// Renderiza um nome ou abreviação centralizada sobre a paleta solicitada.
export async function createManualLogo({ name, displayMode, palette, backgroundColor = palette.background }) {
    const canvas = createCanvas();
    const context = canvas.getContext("2d");
    if (!context) throw new Error("O navegador não conseguiu abrir o canvas.");

    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, LOGO_SIZE, LOGO_SIZE);

    const title = displayMode === "abbreviation" ? getAbbreviation(name) : name.trim();
    let titleSize = 17;
    context.textAlign = "center";
    context.fillStyle = "#ffffff";
    context.font = `700 ${titleSize}px Inter, Arial, sans-serif`;
    const lines = wrapName(context, title, 176, 4);
    while (lines.some((line) => context.measureText(line).width > 176) && titleSize > 11) {
        titleSize -= 1;
        context.font = `700 ${titleSize}px Inter, Arial, sans-serif`;
    }
    context.textBaseline = "middle";
    const lineHeight = titleSize + 7;
    const firstY = (LOGO_SIZE - (lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => context.fillText(line, 100, firstY + index * lineHeight, 176));

    return {
        blob: await canvasToBlob(canvas),
        previewUrl: canvas.toDataURL("image/png"),
    };
}

// Mede a distância máxima entre canais RGB e escolhe a cor de borda mais próxima.
function getDistance(data, offset, colors) {
    let closest = Infinity;
    for (const color of colors) {
        const dr = data[offset] - color[0];
        const dg = data[offset + 1] - color[1];
        const db = data[offset + 2] - color[2];
        closest = Math.min(closest, Math.max(Math.abs(dr), Math.abs(dg), Math.abs(db)));
    }
    return closest;
}

// Amostra cores opacas nas bordas para estimar qual tom representa o fundo.
function sampleEdgeColors(data, width, height) {
    const colors = [];
    const count = 4;
    const sample = (x, y) => {
        const offset = (y * width + x) * 4;
        if (data[offset + 3] > 200) colors.push([data[offset], data[offset + 1], data[offset + 2]]);
    };

    for (let index = 0; index < count; index += 1) {
        const ratio = index / (count - 1);
        const x = Math.round(ratio * (width - 1));
        const y = Math.round(ratio * (height - 1));
        sample(x, 0);
        sample(x, height - 1);
        sample(0, y);
        sample(width - 1, y);
    }
    return colors;
}

// Detecta transparência existente para evitar remover novamente o fundo da imagem.
function hasTransparentBorder(data, width, height) {
    const points = [
        [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
        [Math.floor(width / 2), 0], [Math.floor(width / 2), height - 1],
        [0, Math.floor(height / 2)], [width - 1, Math.floor(height / 2)],
    ];
    const transparentPoints = points.filter(([x, y]) => data[(y * width + x) * 4 + 3] < 16).length;
    return transparentPoints >= 3;
}

// Remove regiões conectadas à borda cuja cor se aproxima do fundo amostrado.
function removeEdgeBackground(imageData, tolerance) {
    const { data, width, height } = imageData;
    const edgeColors = sampleEdgeColors(data, width, height);
    if (!edgeColors.length) return;

    const pixelCount = width * height;
    const visited = new Uint8Array(pixelCount);
    const distances = new Uint8Array(pixelCount);
    const queue = new Int32Array(pixelCount);
    let head = 0;
    let tail = 0;
    const feather = 24;
    const maxDistance = tolerance + feather;

    const enqueue = (pixelIndex) => {
        if (visited[pixelIndex]) return;
        const offset = pixelIndex * 4;
        const distance = getDistance(data, offset, edgeColors);
        if (data[offset + 3] < 8 || distance > maxDistance) return;
        visited[pixelIndex] = 1;
        distances[pixelIndex] = distance;
        queue[tail++] = pixelIndex;
    };

    for (let x = 0; x < width; x += 1) {
        enqueue(x);
        enqueue((height - 1) * width + x);
    }
    for (let y = 1; y < height - 1; y += 1) {
        enqueue(y * width);
        enqueue(y * width + width - 1);
    }

    while (head < tail) {
        const pixelIndex = queue[head++];
        const offset = pixelIndex * 4;
        const distance = distances[pixelIndex];
        if (distance <= tolerance) data[offset + 3] = 0;
        else data[offset + 3] = Math.min(data[offset + 3], Math.round(((distance - tolerance) / feather) * 255));

        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        if (x > 0) enqueue(pixelIndex - 1);
        if (x < width - 1) enqueue(pixelIndex + 1);
        if (y > 0) enqueue(pixelIndex - width);
        if (y < height - 1) enqueue(pixelIndex + width);
    }
}

// Localiza o menor retângulo que contém pixels ainda visíveis após o recorte.
function findVisibleBounds(data, width, height) {
    let left = width;
    let top = height;
    let right = -1;
    let bottom = -1;

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            if (data[(y * width + x) * 4 + 3] <= 8) continue;
            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x);
            bottom = Math.max(bottom, y);
        }
    }
    return right < left || bottom < top ? null : { left, top, width: right - left + 1, height: bottom - top + 1 };
}

// Remove fundo periférico, recorta o conteúdo e o centraliza no quadrado de saída.
export async function createAutomaticLogo(file, tolerance = 42, backgroundColor = null) {
    const image = await createImageBitmap(file);
    try {
        const scale = Math.min(1, MAX_SOURCE_SIDE / Math.max(image.width, image.height));
        const sourceWidth = Math.max(1, Math.round(image.width * scale));
        const sourceHeight = Math.max(1, Math.round(image.height * scale));
        const sourceCanvas = createCanvas(sourceWidth, sourceHeight);
        const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
        if (!sourceContext) throw new Error("O navegador não conseguiu processar esta imagem.");
        sourceContext.drawImage(image, 0, 0, sourceWidth, sourceHeight);

        const sourcePixels = sourceContext.getImageData(0, 0, sourceWidth, sourceHeight);
        if (!hasTransparentBorder(sourcePixels.data, sourceWidth, sourceHeight)) {
            removeEdgeBackground(sourcePixels, tolerance);
        }
        sourceContext.putImageData(sourcePixels, 0, 0);

        const bounds = findVisibleBounds(sourcePixels.data, sourceWidth, sourceHeight);
        if (!bounds) throw new Error("A imagem ficou sem conteúdo visível após remover o fundo.");

        const outputCanvas = createCanvas();
        const outputContext = outputCanvas.getContext("2d");
        if (!outputContext) throw new Error("O navegador não conseguiu criar o logo final.");
        if (backgroundColor) {
            outputContext.fillStyle = backgroundColor;
            outputContext.fillRect(0, 0, LOGO_SIZE, LOGO_SIZE);
        }
        const availableSize = LOGO_SIZE - LOGO_PADDING * 2;
        const fitScale = Math.min(availableSize / bounds.width, availableSize / bounds.height);
        const drawWidth = bounds.width * fitScale;
        const drawHeight = bounds.height * fitScale;
        outputContext.imageSmoothingEnabled = true;
        outputContext.imageSmoothingQuality = "high";
        outputContext.drawImage(
            sourceCanvas,
            bounds.left, bounds.top, bounds.width, bounds.height,
            (LOGO_SIZE - drawWidth) / 2, (LOGO_SIZE - drawHeight) / 2, drawWidth, drawHeight
        );

        return {
            blob: await canvasToBlob(outputCanvas),
            previewUrl: outputCanvas.toDataURL("image/png"),
        };
    } finally {
        image.close();
    }
}

// Tabela fixa do CRC-32 usada para escrever a soma de verificação do formato ZIP.
const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
        let value = index;
        for (let bit = 0; bit < 8; bit += 1) {
            value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
        }
        table[index] = value >>> 0;
    }
    return table;
})();

// Calcula o CRC-32 dos bytes de cada imagem incluída no arquivo compactado.
function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}

// Escreve inteiros little-endian nos cabeçalhos binários do formato ZIP.
function write16(view, offset, value) { view.setUint16(offset, value, true); }
function write32(view, offset, value) { view.setUint32(offset, value, true); }

// Monta um ZIP sem dependência externa com os PNGs gerados nesta sessão.
export async function createLogoZip(logos) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let localOffset = 0;

    for (const [index, logo] of logos.entries()) {
        const filename = `${String(index + 1).padStart(2, "0")}-${logo.fileName}`;
        const filenameBytes = encoder.encode(filename);
        const fileBytes = new Uint8Array(await logo.blob.arrayBuffer());
        const checksum = crc32(fileBytes);
        const localHeader = new Uint8Array(30 + filenameBytes.length);
        const localView = new DataView(localHeader.buffer);
        write32(localView, 0, 0x04034b50);
        write16(localView, 4, 20);
        write16(localView, 6, 0x0800);
        write16(localView, 8, 0);
        write32(localView, 14, checksum);
        write32(localView, 18, fileBytes.length);
        write32(localView, 22, fileBytes.length);
        write16(localView, 26, filenameBytes.length);
        localHeader.set(filenameBytes, 30);
        localParts.push(localHeader, fileBytes);

        const centralHeader = new Uint8Array(46 + filenameBytes.length);
        const centralView = new DataView(centralHeader.buffer);
        write32(centralView, 0, 0x02014b50);
        write16(centralView, 4, 20);
        write16(centralView, 6, 20);
        write16(centralView, 8, 0x0800);
        write16(centralView, 10, 0);
        write32(centralView, 16, checksum);
        write32(centralView, 20, fileBytes.length);
        write32(centralView, 24, fileBytes.length);
        write16(centralView, 28, filenameBytes.length);
        write32(centralView, 42, localOffset);
        centralHeader.set(filenameBytes, 46);
        centralParts.push(centralHeader);
        localOffset += localHeader.length + fileBytes.length;
    }

    const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    write32(endView, 0, 0x06054b50);
    write16(endView, 8, logos.length);
    write16(endView, 10, logos.length);
    write32(endView, 12, centralSize);
    write32(endView, 16, localOffset);

    return new Blob([...localParts, ...centralParts, end], { type: "application/zip" });
}

// Converte o nome do logo em um nome de arquivo simples, sem acentos ou símbolos.
export function sanitizeLogoFilename(value) {
    return value.normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || "logo";
}

export { LOGO_SIZE };
