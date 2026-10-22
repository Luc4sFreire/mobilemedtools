// Dimensões lógicas usadas para compor o layout que será exibido a 420 × 120 CSS px.
const FINAL_WIDTH = 420
const FINAL_HEIGHT = 120
// Renderiza três vezes acima do tamanho lógico para melhorar antialiasing e nitidez.
const OUTPUT_SCALE = 3
// Margem uniforme entre o conteúdo e as bordas do arquivo final.
const PADDING = 10
// Preserva uma área mínima para que a imagem manuscrita não desapareça quando há texto.
const MIN_SIGNATURE_HEIGHT = 18
// Escala mínima da tipografia antes de reportar que o texto não cabe.
const MIN_TEXT_SCALE = 0.45

/**
 * Compõe a assinatura processada e os dados profissionais em um PNG fixo.
 *
 * A função carrega a imagem, mede e quebra os textos, reduz a fonte se necessário,
 * reserva o espaço vertical para assinatura e texto, desenha ambos em um canvas
 * área lógica de 420 × 120 px, renderiza em 3× e resolve com um PNG de 1260 × 360 px.
 * Lança erro para falhas de leitura,
 * canvas ou conteúdo que não caiba nem na escala mínima.
 *
 * @param {string} imageUrl URL local do PNG da assinatura processada.
 * @param {{text: string, emphasis?: boolean}[]} details Linhas textuais a compor.
 * @param {{transparente?: boolean, escala?: number}} options Opções do fundo e escala.
 * @returns {Promise<Blob>} PNG final em resolução 3× (1260 × 360 px).
 */
export async function composeSignature(imageUrl, details, options = {}) {
    // Decodifica o PNG antes de calcular seu tamanho de exibição.
    const image = await loadImage(imageUrl)
    // A área lógica continua 420 × 120; o bitmap exportado tem três vezes essa resolução.
    const canvas = document.createElement("canvas")
    canvas.width = FINAL_WIDTH * OUTPUT_SCALE
    canvas.height = FINAL_HEIGHT * OUTPUT_SCALE

    // Um contexto nulo impede qualquer desenho, então reporta o problema ao chamador.
    const context = canvas.getContext("2d")
    if (!context) {
        throw new Error("Não foi possível preparar a imagem final.")
    }

    // Ativa a melhor interpolação disponível para ampliar a assinatura no PNG final.
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = "high"
    context.scale(OUTPUT_SCALE, OUTPUT_SCALE)

    // O fundo é branco por padrão; quando transparente, deixa-se o canvas sem preenchimento.
    if (!options.transparente) {
        context.fillStyle = "#ffffff"
        context.fillRect(0, 0, FINAL_WIDTH, FINAL_HEIGHT)
    }

    // Reserva a mesma margem lateral para assinatura e dados textuais.
    const contentWidth = FINAL_WIDTH - PADDING * 2
    const hasDetails = details.length > 0
    // Reserva a altura mínima da assinatura antes de calcular o máximo permitido para o texto.
    const maxTextHeight = FINAL_HEIGHT
        - PADDING * 2
        - (hasDetails ? MIN_SIGNATURE_HEIGHT : 0)
    // Primeiro tenta a fonte no tamanho normal para preservar a melhor legibilidade.
    let textLayout = buildTextLayout(context, details, contentWidth, 1)

    // Se o texto exceder a área, faz uma segunda tentativa com a fonte reduzida.
    if (textLayout.height > maxTextHeight) {
        textLayout = buildTextLayout(context, details, contentWidth, MIN_TEXT_SCALE)
    }
    // Não omite nem recorta texto silenciosamente: devolve erro explícito.
    if (textLayout.height > maxTextHeight) {
        throw new Error("Há texto demais para caber na imagem de 420 × 120 px. Reduza ou remova algumas frases.")
    }

    // Tudo o que não for usado pelo texto fica disponível para a assinatura.
    const signatureAreaHeight = Math.max(
        MIN_SIGNATURE_HEIGHT,
        FINAL_HEIGHT - PADDING * 2 - textLayout.height
    )
    // Calcula a maior escala que mantém a proporção e cabe dentro das áreas úteis.
    const fitScale = Math.min(
        contentWidth / image.naturalWidth,
        signatureAreaHeight / image.naturalHeight
    )
    // Limita a escala pedida ao intervalo aceito; divide por 200 para que
    // 200% corresponda ao máximo que cabe e 100% use metade desse máximo.
    const requestedScale = Math.min(200, Math.max(50, Number(options.escala) || 100)) / 200
    const imageScale = fitScale * requestedScale
    const imageWidth = image.naturalWidth * imageScale
    const imageHeight = image.naturalHeight * imageScale
    // Centraliza a imagem tanto verticalmente na área reservada como horizontalmente no arquivo.
    const imageAreaTop = PADDING + (signatureAreaHeight - imageHeight) / 2
    const imageLeft = (FINAL_WIDTH - imageWidth) / 2

    // Desenha a imagem sem distorção; a transformação de tamanho preserva a proporção.
    context.drawImage(image, imageLeft, imageAreaTop, imageWidth, imageHeight)

    // A lista vazia é válida: nesse caso, o PNG contém somente a assinatura.
    if (hasDetails) {
        // Começa logo após a área da assinatura; não desenha divisor entre os elementos.
        let textY = PADDING + signatureAreaHeight
        // Usa texto escuro sobre branco ou transparência, garantindo contraste.
        context.fillStyle = options.transparente ? "#000" : "#000"
        // Centraliza cada linha no eixo horizontal da imagem final.
        context.textAlign = "center"

        // Cada linha foi previamente medida e quebrada para caber na largura útil.
        textLayout.lines.forEach((line) => {
            context.font = `${line.emphasis ? "700" : "400"} ${line.fontSize}px Arial, sans-serif`
            // Canvas recebe a coordenada da linha de base, não o topo da caixa do texto.
            textY += line.fontSize
            context.fillText(line.text, FINAL_WIDTH / 2, textY, contentWidth)
            // Avança até a próxima linha respeitando seu espaçamento vertical.
            textY += line.lineHeight - line.fontSize
        })
    }

    // Codifica de forma assíncrona o canvas como PNG e rejeita se o navegador
    // não conseguir produzir o Blob, para que a interface possa mostrar o erro.
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob)
            } else {
                reject(new Error("Não foi possível gerar a imagem final."))
            }
        }, "image/png")
    })
}

/**
 * Converte cada detalhe em uma ou mais linhas com fonte e espaçamento definidos.
 * A escala reduz simultaneamente tamanhos de fonte e espaçamento vertical.
 *
 * @param {CanvasRenderingContext2D} context Contexto usado para medir o texto.
 * @param {{text: string, emphasis?: boolean}[]} details Dados a apresentar.
 * @param {number} maxWidth Largura máxima de cada linha em pixels.
 * @param {number} scale Fator aplicado ao tamanho tipográfico padrão.
 * @returns {{lines: {text: string, fontSize: number, lineHeight: number, emphasis?: boolean}[], height: number}}
 */
// Mede, quebra e dimensiona os dados tipográficos antes de desenhar a composição.
function buildTextLayout(context, details, maxWidth, scale) {
    // flatMap permite expandir um único detalhe para várias linhas quando necessário.
    const lines = details.flatMap((detail) => {
        // Nome em destaque tem fonte base maior; os outros dados usam fonte regular.
        const baseFontSize = detail.emphasis ? 14 : 11
        const fontSize = baseFontSize * scale
        context.font = `${detail.emphasis ? "700" : "400"} ${fontSize}px Arial, sans-serif`
        // wrapText retorna linhas que respeitam a largura disponível.
        return wrapText(context, detail.text, maxWidth).map((text) => ({
            text,
            fontSize,
            lineHeight: fontSize * 1.25,
            emphasis: detail.emphasis,
        }))
    })

    // Soma a altura de todas as linhas para decidir quanto espaço reservar.
    return {
        lines,
        height: lines.reduce((height, line) => height + line.lineHeight, 0),
    }
}

/**
 * Carrega uma URL de imagem como objeto Image, permitindo usar naturalWidth
 * e naturalHeight e desenhá-la no canvas depois que a decodificação terminar.
 *
 * @param {string} src URL ou fonte local compreendida pelo navegador.
 * @returns {Promise<HTMLImageElement>} Imagem carregada.
 */
// Carrega a imagem e rejeita a promessa quando a decodificação falha.
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image()
        // Resolve apenas quando as dimensões naturais já estão disponíveis.
        image.onload = () => resolve(image)
        // Rejeita a Promise para que o chamador não gere uma prévia incompleta.
        image.onerror = () => reject(new Error("Não foi possível carregar a assinatura processada."))
        image.src = src
    })
}

/**
 * Divide texto em linhas com largura medida pelo canvas.
 *
 * Preserva quebras de parágrafo, move palavras completas quando possível e
 * divide palavras individuais muito longas em fragmentos para impedir overflow.
 *
 * @param {CanvasRenderingContext2D} context Contexto com a fonte atual definida.
 * @param {string} text Texto que será quebrado.
 * @param {number} maxWidth Largura máxima permitida por linha.
 * @returns {string[]} Linhas resultantes, na ordem em que devem ser desenhadas.
 */
function wrapText(context, text, maxWidth) {
    // Cada quebra explícita forma um parágrafo independente, cujas linhas
    // são achatadas no resultado mantendo a sequência original.
    return text.split("\n").flatMap((paragraph) => {
        // Remove espaços extras nas extremidades e ignora parágrafos vazios.
        const words = paragraph.trim().split(/\s+/).filter(Boolean)
        if (words.length === 0) return [""]

        const lines = []
        let line = ""

        // Acrescenta palavras enquanto a linha medida ainda cabe na largura.
        words.forEach((word) => {
            const candidate = line ? `${line} ${word}` : word
            if (context.measureText(candidate).width <= maxWidth) {
                line = candidate
                return
            }

            // Quando a palavra não cabe, fecha a linha atual e inicia outra.
            if (line) lines.push(line)
            line = word

            // Uma palavra pode ser mais larga que a própria imagem; nesse caso
            // divide em fragmentos medidos para evitar que ultrapasse a borda.
            while (context.measureText(line).width > maxWidth && line.length > 1) {
                let splitAt = line.length - 1
                while (splitAt > 1 && context.measureText(line.slice(0, splitAt)).width > maxWidth) {
                    splitAt -= 1
                }
                lines.push(line.slice(0, splitAt))
                line = line.slice(splitAt)
            }
        })

        // Guarda a última linha do parágrafo depois que todas as palavras foram lidas.
        if (line) lines.push(line)
        return lines
    })
}
