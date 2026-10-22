const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_PHRASES = 5;
const ACCEPTED_IMAGE_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "image/bmp",
    "image/avif",
]);

export function validateSignatureFile(file) {
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
        return {
            valid: false,
            title: "Formato de imagem inválido.",
            message: "Selecione uma imagem PNG, JPEG, WebP, GIF, BMP ou AVIF válida.",
        };
    }
    if (file.size > MAX_IMAGE_BYTES) {
        return {
            valid: false,
            title: "Imagem acima do limite.",
            message: "O arquivo excede o limite de 12 MB. Escolha uma imagem menor.",
        };
    }
    return { valid: true, title: "", message: "" };
}

export function formatCredential(value, label, format) {
    const normalizedValue = value.trim().replace(new RegExp(`^${label}\\s*[:/]?\\s*`, "i"), "");
    if (!normalizedValue) return "";
    if (format === "default") return `${label}: ${normalizedValue}`;

    const state = normalizedValue.match(/(?:\/|\s)([A-Z]{2})$/i)?.[1]?.toUpperCase() || "RS";
    const number = normalizedValue.replace(/(?:\/|\s)[A-Z]{2}$/i, "").trim();
    return `${label}/${state} ${number || normalizedValue}`;
}

export function buildSignatureDetails({
    professionalName = "",
    credentialValue = "",
    credentialLabel,
    credentialFormat = "default",
    includeRqe = false,
    rqeValue = "",
    rqeFormat = "default",
    includeSpecialty = false,
    specialty = "",
    includeExtraPhrases = false,
    phrases = [],
}) {
    const details = [];
    const name = professionalName.trim();
    const credential = formatCredential(credentialValue, credentialLabel, credentialFormat);

    if (name) details.push({ text: name, emphasis: true });
    if (credential) details.push({ text: credential });
    if (includeRqe) {
        const rqe = formatCredential(rqeValue, "RQE", rqeFormat);
        if (rqe) details.push({ text: rqe });
    }
    if (includeSpecialty && specialty.trim()) details.push({ text: specialty.trim() });
    if (includeExtraPhrases) {
        phrases.forEach((phrase) => {
            if (phrase.value?.trim()) details.push({ text: phrase.value.trim() });
        });
    }

    return details;
}

export function addSignaturePhrase(phrases) {
    if (phrases.length >= MAX_PHRASES) return phrases;
    const nextId = phrases.length > 0
        ? Math.max(...phrases.map((phrase) => phrase.id)) + 1
        : 1;
    return [...phrases, { id: nextId, value: "" }];
}

export function updateSignaturePhrase(phrases, id, value) {
    return phrases.map((phrase) => phrase.id === id
        ? { ...phrase, value: value.slice(0, 120) }
        : phrase
    );
}

export function removeSignaturePhrase(phrases, id) {
    return phrases.length > 1
        ? phrases.filter((phrase) => phrase.id !== id)
        : phrases.map((phrase) => ({ ...phrase, value: "" }));
}
