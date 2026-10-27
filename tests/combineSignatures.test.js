import test from "node:test"
import assert from "node:assert/strict"
import { combineSignatures } from "../src/utils/combineSignatures.js"
import { replaceGlobal } from "./helpers/browserMocks.js"

function installMocks(t, { noContext = false, emptyBlob = false } = {}) {
    const canvases = []

    class FakeImage {
        set src(value) {
            this._src = value
            queueMicrotask(() => {
                this.naturalWidth = 1680
                this.naturalHeight = 480
                this.onload?.()
            })
        }
    }

    class FakeCanvas {
        constructor() {
            this.draws = []
            this.fills = []
            this.context = noContext ? null : {
                drawImage: (...args) => this.draws.push(args),
                fillRect(...args) {
                    this.canvas.fills.push({ color: this.fillStyle, args })
                },
                getImageData: (_x, _y, width, height) => {
                    const data = new Uint8ClampedArray(width * height * 4).fill(255)
                    for (let y = 70; y <= 389; y += 1) {
                        for (let x = 300; x <= 1379; x += 1) {
                            const offset = (y * width + x) * 4
                            data[offset] = 0
                            data[offset + 1] = 0
                            data[offset + 2] = 0
                        }
                    }
                    return { data }
                },
            }
            if (this.context) this.context.canvas = this
            canvases.push(this)
        }

        getContext() {
            return this.context
        }

        toBlob(callback, type) {
            callback(emptyBlob ? null : new Blob(["png"], { type }))
        }
    }

    const restoreImage = replaceGlobal("Image", FakeImage)
    const restoreDocument = replaceGlobal("document", {
        createElement: () => new FakeCanvas(),
    })
    t.after(() => {
        restoreImage()
        restoreDocument()
    })

    return {
        canvases,
    }
}

test("combina assinaturas recortando margens internas e gera preview 4× e arquivo 420×120", async (t) => {
    const mocks = installMocks(t)
    const { previewBlob, outputBlob } = await combineSignatures("blob:primeira", "blob:segunda")

    assert.equal(previewBlob.type, "image/png")
    assert.equal(outputBlob.type, "image/png")
    const previewCanvas = mocks.canvases[2]
    const outputCanvas = mocks.canvases[3]
    assert.equal(previewCanvas.width, 1680)
    assert.equal(previewCanvas.height, 480)
    assert.equal(outputCanvas.width, 420)
    assert.equal(outputCanvas.height, 120)
    assert.deepEqual(previewCanvas.draws.map((draw) => draw.slice(5, 9)).map((draw) => draw[0]), [
        0,
        840,
    ])
    assert.equal(previewCanvas.draws[0][3] < 1680, true)
    assert.deepEqual(previewCanvas.fills, [
        { color: "#ffffff", args: [0, 0, 1680, 480] },
    ])
    assert.deepEqual(outputCanvas.draws[0].slice(1), [0, 0, 1680, 480, 0, 0, 420, 120])
})

test("reserva o espaçamento escolhido no preview sem alterar o arquivo 420×120", async (t) => {
    const mocks = installMocks(t)
    await combineSignatures("blob:primeira", "blob:segunda", { gap: 20 })

    const previewCanvas = mocks.canvases[2]
    const outputCanvas = mocks.canvases[3]
    assert.equal(previewCanvas.width, 1680)
    assert.equal(previewCanvas.height, 480)
    assert.equal(outputCanvas.width, 420)
    assert.equal(outputCanvas.height, 120)
    assert.deepEqual(previewCanvas.draws.map((draw) => draw[5]), [0, 880])
})

test("aplica padding ao bloco conjunto, preservando o espaçamento central", async (t) => {
    const mocks = installMocks(t)
    await combineSignatures("blob:primeira", "blob:segunda", { gap: 20, padding: 10 })

    const previewCanvas = mocks.canvases[2]
    const [left, right] = previewCanvas.draws.map((draw) => draw.slice(5, 9))
    assert.equal(left[0], 40)
    assert.equal(right[0] - left[0] - left[2], 80)
    assert.ok(left[1] >= 40)
    assert.ok(left[1] + left[3] <= 440)
    assert.equal(right[1], left[1])
})

test("mantém transparência quando ambas as assinaturas têm fundo transparente", async (t) => {
    const mocks = installMocks(t)
    await combineSignatures("blob:primeira", "blob:segunda", { transparent: true })
    assert.deepEqual(mocks.canvases[2].fills, [])
})

test("limita o espaçamento máximo sem alterar as dimensões finais", async (t) => {
    const mocks = installMocks(t)
    await combineSignatures("blob:primeira", "blob:segunda", { gap: 200 })

    assert.equal(mocks.canvases[2].width, 1680)
    assert.equal(mocks.canvases[3].width, 420)
    assert.deepEqual(mocks.canvases[2].draws.map((draw) => draw[5]), [0, 1000])
})

test("falha explicitamente quando o canvas combinado não está disponível", async (t) => {
    installMocks(t, { noContext: true })
    await assert.rejects(
        combineSignatures("blob:primeira", "blob:segunda"),
        /Canvas 2D indisponível para medir a assinatura/
    )
})

test("falha explicitamente quando não é possível codificar o PNG combinado", async (t) => {
    installMocks(t, { emptyBlob: true })
    await assert.rejects(
        combineSignatures("blob:primeira", "blob:segunda"),
        /Não foi possível gerar o PNG combinado/
    )
})
