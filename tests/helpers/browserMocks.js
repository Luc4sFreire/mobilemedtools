export function replaceGlobal(name, value) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, {
        configurable: true,
        writable: true,
        value,
    });
    return () => {
        if (original) Object.defineProperty(globalThis, name, original);
        else delete globalThis[name];
    };
}

export function installDeterministicCrypto(sequence = [0]) {
    let cursor = 0;
    const requests = [];
    const restore = replaceGlobal("crypto", {
        getRandomValues(buffer) {
            requests.push(buffer.length);
            for (let index = 0; index < buffer.length; index += 1) {
                buffer[index] = sequence[cursor % sequence.length];
                cursor += 1;
            }
            return buffer;
        },
        randomUUID: () => "test-uuid",
    });
    return { restore, requests };
}

export function makeFile({ name = "usuarios.csv", size, text = "", bytes } = {}) {
    const encoded = new TextEncoder().encode(text);
    return {
        name,
        size: size ?? bytes?.byteLength ?? encoded.byteLength,
        async text() { return text; },
        async arrayBuffer() {
            const data = bytes ?? encoded;
            return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
        },
    };
}

export class MockImageData {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.data = new Uint8ClampedArray(width * height * 4);
    }
}

class MockCanvasContext {
    constructor(canvas) {
        this.canvas = canvas;
    }

    getImageData(...args) {
        const [, , width, height] = args;
        const imageData = new MockImageData(width, height);
        imageData.data.set(this.canvas.pixels.subarray(0, imageData.data.length));
        return imageData;
    }

    putImageData(imageData) {
        this.canvas.pixels = new Uint8ClampedArray(imageData.data);
    }

    createImageData(width, height) {
        return new MockImageData(width, height);
    }

    drawImage(...args) {
        const [source, , , width = source.width, height = source.height] = args;
        const sourceWidth = source.width ?? source.naturalWidth;
        const sourceHeight = source.height ?? source.naturalHeight;
        const sourcePixels = source.pixels ?? source.data;
        if (!sourcePixels || !sourceWidth || !sourceHeight) return;

        const destinationWidth = Math.round(width);
        const destinationHeight = Math.round(height);
        const destination = new Uint8ClampedArray(destinationWidth * destinationHeight * 4);
        for (let y = 0; y < destinationHeight; y += 1) {
            for (let x = 0; x < destinationWidth; x += 1) {
                const sourceX = Math.min(sourceWidth - 1, Math.floor(x * sourceWidth / destinationWidth));
                const sourceY = Math.min(sourceHeight - 1, Math.floor(y * sourceHeight / destinationHeight));
                const sourceOffset = (sourceY * sourceWidth + sourceX) * 4;
                const destinationOffset = (y * destinationWidth + x) * 4;
                destination.set(sourcePixels.subarray(sourceOffset, sourceOffset + 4), destinationOffset);
            }
        }
        this.canvas.pixels = destination;
    }
}

export class MockCanvas {
    constructor(width, height, pixels = null) {
        this._width = width;
        this._height = height;
        this.pixels = pixels ? new Uint8ClampedArray(pixels) : new Uint8ClampedArray(width * height * 4);
        this.context = new MockCanvasContext(this);
        this.contextAvailable = true;
    }

    get width() { return this._width; }
    set width(value) {
        this._width = value;
        this.pixels = new Uint8ClampedArray(Math.max(0, value * this._height * 4));
    }

    get height() { return this._height; }
    set height(value) {
        this._height = value;
        this.pixels = new Uint8ClampedArray(Math.max(0, this._width * value * 4));
    }

    getContext() {
        return this.contextAvailable ? this.context : null;
    }
}

export function makeRgbaCanvas(width, height, pixelAt) {
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const offset = (y * width + x) * 4;
            pixels.set(pixelAt(x, y), offset);
        }
    }
    return new MockCanvas(width, height, pixels);
}

export function installCanvasMocks() {
    const created = [];
    const originalDocument = globalThis.document;
    const originalImageData = Object.getOwnPropertyDescriptor(globalThis, "ImageData");
    globalThis.document = {
        createElement(tagName) {
            if (tagName !== "canvas") throw new Error(`Elemento inesperado: ${tagName}`);
            const canvas = new MockCanvas(0, 0);
            created.push(canvas);
            return canvas;
        },
    };
    Object.defineProperty(globalThis, "ImageData", {
        configurable: true,
        writable: true,
        value: MockImageData,
    });
    return {
        created,
        restore() {
            if (originalDocument === undefined) delete globalThis.document;
            else globalThis.document = originalDocument;
            if (originalImageData) Object.defineProperty(globalThis, "ImageData", originalImageData);
            else delete globalThis.ImageData;
        },
    };
}

export function installDownloadMocks() {
    const blobs = new Map();
    const clicks = [];
    const revoked = [];
    let nextId = 0;
    const originalUrl = Object.getOwnPropertyDescriptor(globalThis, "URL");
    const originalDocument = globalThis.document;
    const originalWindow = globalThis.window;
    const URLMock = class extends URL {};
    URLMock.createObjectURL = (blob) => {
        const url = `blob:test-${nextId++}`;
        blobs.set(url, blob);
        return url;
    };
    URLMock.revokeObjectURL = (url) => revoked.push(url);
    globalThis.URL = URLMock;
    globalThis.document = {
        createElement(tagName) {
            if (tagName !== "a") throw new Error(`Elemento inesperado: ${tagName}`);
            return {
                click() { clicks.push({ href: this.href, download: this.download }); },
            };
        },
    };
    globalThis.window = {
        setTimeout(callback, delay) {
            return { callback, delay };
        },
    };
    return {
        blobs,
        clicks,
        revoked,
        restore() {
            if (originalUrl) Object.defineProperty(globalThis, "URL", originalUrl);
            else delete globalThis.URL;
            if (originalDocument === undefined) delete globalThis.document;
            else globalThis.document = originalDocument;
            if (originalWindow === undefined) delete globalThis.window;
            else globalThis.window = originalWindow;
        },
    };
}
