const CHARACTER_GROUPS = {
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    numbers: "0123456789",
    special: "!@#$&",
};

const randomBuffer = new Uint32Array(1);

function randomInteger(max) {
    if (!globalThis.crypto?.getRandomValues || max < 1) {
        throw new Error("A geração aleatória segura não está disponível neste navegador.");
    }

    const range = 0x100000000;
    const limit = range - (range % max);
    let value;

    do {
        globalThis.crypto.getRandomValues(randomBuffer);
        value = randomBuffer[0];
    } while (value >= limit);

    return value % max;
}

function pickCharacter(characters) {
    return characters[randomInteger(characters.length)];
}

function shuffle(characters) {
    for (let index = characters.length - 1; index > 0; index -= 1) {
        const swapIndex = randomInteger(index + 1);
        [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
    }
    return characters;
}

// Mantém as mesmas regras nos modos Padrão, Implantação e Avançado.
export function generatePassword({ prefix = "", size = 16, special = false, onlyUpper = false } = {}) {
    const groups = [CHARACTER_GROUPS.uppercase];
    if (!onlyUpper) groups.push(CHARACTER_GROUPS.lowercase);
    groups.push(CHARACTER_GROUPS.numbers);
    if (special) groups.push(CHARACTER_GROUPS.special);

    const length = Math.min(32, Math.max(12, Math.round(Number(size) || 16)));
    const alphabet = groups.join("");
    const requiredCharacters = groups.map(pickCharacter);
    const remainingCharacters = Array.from(
        { length: length - requiredCharacters.length },
        () => pickCharacter(alphabet)
    );
    const randomPart = shuffle([...requiredCharacters, ...remainingCharacters]).join("");
    const safePrefix = String(prefix).slice(0, 24);

    return safePrefix ? `${safePrefix}@${randomPart}` : randomPart;
}
