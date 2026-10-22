// Conjuntos permitidos em cada política; maiúsculas e números são sempre exigidos.
const CHARACTER_GROUPS = {
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    numbers: "0123456789",
    special: "!@#$&",
};

// Buffer reutilizado para obter números aleatórios da API criptográfica do navegador.
const randomBuffer = new Uint32Array(1);

// Sorteia um inteiro no intervalo [0, max) rejeitando a faixa que causaria viés.
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

// Escolhe um caractere uniformemente dentro do conjunto informado.
function pickCharacter(characters) {
    return characters[randomInteger(characters.length)];
}

// Embaralha a sequência pelo algoritmo Fisher–Yates usando o mesmo sorteio seguro.
function shuffle(characters) {
    for (let index = characters.length - 1; index > 0; index -= 1) {
        const swapIndex = randomInteger(index + 1);
        [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
    }
    return characters;
}

/**
 * Gera a parte imprevisível da senha e acrescenta um prefixo opcional previsível.
 * O comprimento limita apenas os caracteres aleatórios, não o prefixo.
 */
export function generatePassword({ prefix = "mobile", size = 8, special = false, onlyUpper = false } = {}) {
    const groups = [CHARACTER_GROUPS.uppercase];
    if (!onlyUpper) groups.push(CHARACTER_GROUPS.lowercase);
    groups.push(CHARACTER_GROUPS.numbers);
    if (special) groups.push(CHARACTER_GROUPS.special);

    const length = Math.min(32, Math.max(4, Math.round(Number(size) || 8)));
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
