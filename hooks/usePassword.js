import { useState } from "react";

const GRUPOS = {
    maiusculas: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    minusculas: "abcdefghijklmnopqrstuvwxyz",
    numeros: "0123456789",
    especiais: "!@#$&",
};

const sortear = (texto) => texto[Math.floor(Math.random() * texto.length)];

function embaralhar(lista) {
    for (let i = lista.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [lista[i], lista[j]] = [lista[j], lista[i]];
    }
    return lista;
}

function gerarComplemento(size, gruposAtivos) {
    const todos = gruposAtivos.join("");
    const obrigatorios = gruposAtivos.map(sortear);
    const restante = Array.from(
        { length: Math.max(size - obrigatorios.length, 0) },
        () => sortear(todos)
    );
    return embaralhar([...obrigatorios, ...restante]).join("");
}

export function usePassword() {
    const [prefix, setPrefix] = useState("Mobile");
    const [qtde, setQtde] = useState(1);
    const [size, setSize] = useState(8);
    const [pass, setPass] = useState([]);
    const [special, setSpecial] = useState(false);
    const [onlyUpper, setOnlyUpper] = useState(false);

    function generatePass() {
        const gruposAtivos = [GRUPOS.maiusculas];
        if (!onlyUpper) gruposAtivos.push(GRUPOS.minusculas);
        gruposAtivos.push(GRUPOS.numeros);
        if (special) gruposAtivos.push(GRUPOS.especiais);

        const tamanho = Math.max(size, gruposAtivos.length);

        const passwords = Array.from({ length: qtde }, () =>
            prefix + "@" + gerarComplemento(tamanho, gruposAtivos)
        );
        setPass(passwords);
    }

    const handlePrefix = (e) => setPrefix(e.target.value);
    const handleNumPass = (e) => setQtde(Number(e.target.value));
    const handleSizePass = (e) => setSize(Number(e.target.value));
    const handleSpecial = (checked) => setSpecial(checked);
    const handleOnlyUpper = (checked) => setOnlyUpper(checked);

    return {
        prefix, qtde, size, pass, special, onlyUpper,
        setPrefix, generatePass,
        handlePrefix, handleNumPass, handleSizePass,
        handleSpecial, handleOnlyUpper,
    };
}