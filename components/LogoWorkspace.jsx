// Estado local coordena entradas, imagens temporárias, prévias e lotes da ferramenta.
import { useEffect, useRef, useState } from "react";
import "../src/style/logo.css";
import { useNotifications } from "../src/hooks/useNotifications";
import {
    createAutomaticLogo,
    createLogoZip,
    createManualLogo,
    sanitizeLogoFilename,
} from "../src/utils/logoGenerator";

// Limites de arquivos e itens mantêm os lotes dentro de uma faixa operacional.
const MAX_LOGOS = 50;
const MAX_FILE_SIZE = 12 * 1024 * 1024;

// Paletas que podem ser aplicadas ao fundo dos logos criados manualmente.
const palettes = [
    { id: "ocean", label: "Azul oceano", background: "#2f6dad", primary: "#ffffff", accent: "#8bc8ee" },
    { id: "forest", label: "Verde floresta", background: "#176b50", primary: "#ffffff", accent: "#8dd5b4" },
    { id: "violet", label: "Violeta", background: "#5f48a6", primary: "#ffffff", accent: "#c4b5f5" },
    { id: "sunset", label: "Terracota", background: "#a84d32", primary: "#ffffff", accent: "#f3b692" },
    { id: "graphite", label: "Grafite", background: "#35495e", primary: "#ffffff", accent: "#aabed0" },
];

// Prévia acessível com estados de processamento e navegação opcional pelo lote.
function LogoLivePreview({ title, description, imageUrl, imageAlt, status, emptyMessage, index, count, onPrevious, onNext }) {
    return (
        <aside className="logo-live-preview" aria-live="polite">
            <div className="logo-live-preview__copy">
                <span className="logo-eyebrow">PRÉVIA</span>
                <strong>{title}</strong>
                <small>{description}</small>
                {count > 1 && (
                    <div className="logo-live-preview__navigation" aria-label="Navegação das prévias">
                        <button type="button" onClick={onPrevious} disabled={index === 0} aria-label="Ver logo anterior">‹</button>
                        <span>{index + 1} de {count}</span>
                        <button type="button" onClick={onNext} disabled={index === count - 1} aria-label="Ver próximo logo">›</button>
                    </div>
                )}
            </div>
            <div className="logo-live-preview__canvas">
                {imageUrl ? (
                    <img src={imageUrl} alt={imageAlt} width="200" height="200" />
                ) : (
                    <span>{status === "loading" ? "Preparando prévia…" : emptyMessage}</span>
                )}
            </div>
            <small className="logo-live-preview__status">
                {status === "loading" ? "Atualizando prévia…" : status === "error" ? "Não foi possível gerar a prévia." : "PNG · 200 × 200 px"}
            </small>
        </aside>
    );
}

// Dispara um download local e revoga a URL temporária após o navegador consumi-la.
function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Oferece criação textual manual e processamento automático de imagens enviadas.
function LogoWorkspace() {
    const fileInputRef = useRef(null);
    const { notifySuccess, notifyError } = useNotifications();
    // Estados dos modos manual e automático permitem configurar cada fluxo separadamente.
    const [mode, setMode] = useState("manual");
    const [manualEntryMode, setManualEntryMode] = useState("simple");
    const [manualPreviewIndex, setManualPreviewIndex] = useState(0);
    const [manualBackgroundMode, setManualBackgroundMode] = useState("shared");
    const [manualIndividualBackgrounds, setManualIndividualBackgrounds] = useState({});
    const [automaticEntryMode, setAutomaticEntryMode] = useState("simple");
    const [automaticPreviewIndex, setAutomaticPreviewIndex] = useState(0);
    const [useAutomaticBackground, setUseAutomaticBackground] = useState(false);
    const [automaticBackgroundColor, setAutomaticBackgroundColor] = useState("#ffffff");
    const [automaticBackgroundMode, setAutomaticBackgroundMode] = useState("shared");
    const [automaticIndividualBackgrounds, setAutomaticIndividualBackgrounds] = useState({});
    const [singleName, setSingleName] = useState("");
    const [namesText, setNamesText] = useState("");
    const [displayMode, setDisplayMode] = useState("full");
    const [paletteId, setPaletteId] = useState(palettes[0].id);
    const [files, setFiles] = useState([]);
    const [tolerance, setTolerance] = useState(42);
    const [isDragging, setIsDragging] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [logos, setLogos] = useState([]);
    const [logoBatchEnabled, setLogoBatchEnabled] = useState(false);
    const [manualPreview, setManualPreview] = useState({ key: "", url: "", status: "idle" });
    const [automaticPreview, setAutomaticPreview] = useState({
        file: null,
        tolerance: null,
        backgroundColor: null,
        url: "",
        status: "idle",
    });

    // Calcula valores derivados para a prévia selecionada e para detectar saídas obsoletas.
    const selectedPalette = palettes.find((palette) => palette.id === paletteId) ?? palettes[0];
    const manualPreviewNames = (manualEntryMode === "simple" ? [singleName] : namesText.split(/\r?\n/))
        .map((name) => name.trim())
        .filter(Boolean);
    const manualPreviewPosition = Math.min(manualPreviewIndex, Math.max(manualPreviewNames.length - 1, 0));
    const previewName = manualPreviewNames[manualPreviewPosition] ?? "";
    const manualPreviewBackground = manualBackgroundMode === "individual"
        ? manualIndividualBackgrounds[manualPreviewPosition] ?? selectedPalette.background
        : selectedPalette.background;
    const automaticPreviewPosition = Math.min(automaticPreviewIndex, Math.max(files.length - 1, 0));
    const automaticPreviewFile = files[automaticPreviewPosition];
    const automaticPreviewBackground = automaticBackgroundMode === "individual"
        ? automaticIndividualBackgrounds[automaticPreviewPosition] ?? automaticBackgroundColor
        : automaticBackgroundColor;
    const manualPreviewKey = JSON.stringify([
        previewName,
        displayMode,
        selectedPalette.id,
        manualPreviewBackground,
    ]);
    const manualPreviewIsCurrent = manualPreview.key === manualPreviewKey;
    const manualPreviewUrl = manualPreviewIsCurrent ? manualPreview.url : "";
    const manualPreviewStatus = !previewName
        ? "idle"
        : manualPreviewIsCurrent ? manualPreview.status : "loading";
    const automaticPreviewBackgroundOption = useAutomaticBackground ? automaticPreviewBackground : null;
    const automaticPreviewIsCurrent = automaticPreview.file === automaticPreviewFile
        && automaticPreview.tolerance === Number(tolerance)
        && automaticPreview.backgroundColor === automaticPreviewBackgroundOption;
    const automaticPreviewUrl = automaticPreviewIsCurrent ? automaticPreview.url : "";
    const automaticPreviewStatus = !automaticPreviewFile
        ? "idle"
        : automaticPreviewFile.size > MAX_FILE_SIZE
            ? "error"
            : automaticPreviewIsCurrent ? automaticPreview.status : "loading";

    // Atualiza a prévia manual quando nome, apresentação, paleta ou fundo mudam.
    useEffect(() => {
        if (!previewName) return undefined;

        let isCurrent = true;
        createManualLogo({ name: previewName, displayMode, palette: selectedPalette, backgroundColor: manualPreviewBackground })
            .then(({ previewUrl }) => {
                if (!isCurrent) return;
                setManualPreview({ key: manualPreviewKey, url: previewUrl, status: "ready" });
            })
            .catch(() => {
                if (isCurrent) setManualPreview({ key: manualPreviewKey, url: "", status: "error" });
            });

        return () => { isCurrent = false; };
    }, [previewName, displayMode, selectedPalette, manualPreviewBackground, manualPreviewKey]);

    // Atualiza a prévia automática com debounce e invalida resultados de seleções antigas.
    useEffect(() => {
        const file = automaticPreviewFile;
        if (!file || file.size > MAX_FILE_SIZE) return undefined;

        let isCurrent = true;
        const timer = window.setTimeout(() => {
            createAutomaticLogo(file, Number(tolerance), automaticPreviewBackgroundOption)
                .then(({ previewUrl }) => {
                    if (!isCurrent) return;
                    setAutomaticPreview({
                        file,
                        tolerance: Number(tolerance),
                        backgroundColor: automaticPreviewBackgroundOption,
                        url: previewUrl,
                        status: "ready",
                    });
                })
                .catch(() => {
                    if (isCurrent) setAutomaticPreview({
                        file,
                        tolerance: Number(tolerance),
                        backgroundColor: automaticPreviewBackgroundOption,
                        url: "",
                        status: "error",
                    });
                });
        }, 180);

        return () => {
            isCurrent = false;
            window.clearTimeout(timer);
        };
    }, [automaticPreviewFile, tolerance, automaticPreviewBackgroundOption]);

    // Filtra arquivos de imagem, aplica o limite do lote e reinicia cores individuais.
    function updateFiles(fileList) {
        const selectedFiles = Array.from(fileList ?? []).filter((file) => file.type.startsWith("image/"));
        if (selectedFiles.length > MAX_LOGOS) {
            notifyError("Muitos arquivos selecionados.", `Selecione até ${MAX_LOGOS} imagens por lote.`);
        }
        const maxSelected = automaticEntryMode === "simple" ? 1 : MAX_LOGOS;
        if (automaticEntryMode === "simple" && selectedFiles.length > 1) {
            notifyError("Cadastro simples seleciona uma imagem.", "Mude para Em massa para importar várias imagens.");
        }
        setFiles(selectedFiles.slice(0, maxSelected));
        setAutomaticPreviewIndex(0);
        setAutomaticIndividualBackgrounds({});
    }

    // Gera PNGs para todos os nomes válidos informados no modo manual.
    async function generateManualLogos() {
        const names = (manualEntryMode === "simple" ? [singleName] : namesText.split(/\r?\n/))
            .map((name) => name.trim())
            .filter(Boolean);
        if (!names.length) {
            notifyError("Informe um nome para o logo.", manualEntryMode === "simple"
                ? "Digite o nome que deve aparecer no logo."
                : "Digite um nome por linha para montar o lote.");
            return;
        }
        if (names.length > MAX_LOGOS) {
            notifyError("O lote ultrapassa o limite.", `Gere até ${MAX_LOGOS} logos de cada vez.`);
            return;
        }

        setIsGenerating(true);
        try {
            const generated = [];
            for (const [index, name] of names.entries()) {
                const backgroundColor = manualBackgroundMode === "individual"
                    ? manualIndividualBackgrounds[index] ?? selectedPalette.background
                    : selectedPalette.background;
                const image = await createManualLogo({ name, displayMode, palette: selectedPalette, backgroundColor });
                generated.push({
                    id: `${Date.now()}-${index}`,
                    sourceKey: `manual-${index}`,
                    name,
                    fileName: `${sanitizeLogoFilename(name)}.png`,
                    ...image,
                });
            }
            setLogos(generated);
            setLogoBatchEnabled(manualEntryMode === "bulk");
            notifySuccess("Logos criados.", `${generated.length} logo(s) em PNG de 200 × 200 px.`);
        } catch (error) {
            console.error("Não foi possível criar os logos:", error);
            notifyError("Não foi possível criar os logos.", error.message || "Tente novamente.");
        } finally {
            setIsGenerating(false);
        }
    }

    // Processa cada arquivo separadamente para registrar falhas sem perder o lote restante.
    async function generateAutomaticLogos() {
        if (!files.length) {
            notifyError("Selecione imagens para processar.", "Você pode enviar vários arquivos para gerar logos em lote.");
            return;
        }

        setIsGenerating(true);
        const generated = [];
        const failures = [];
        try {
            for (const [index, file] of files.entries()) {
                if (file.size > MAX_FILE_SIZE) {
                    failures.push(`${file.name}: excede 12 MB`);
                    continue;
                }
                try {
                    const backgroundColor = automaticBackgroundMode === "individual"
                        ? automaticIndividualBackgrounds[index] ?? automaticBackgroundColor
                        : automaticBackgroundColor;
                    const image = await createAutomaticLogo(file, Number(tolerance), useAutomaticBackground ? backgroundColor : null);
                    const baseName = file.name.replace(/\.[^.]+$/, "");
                    generated.push({
                        id: `${Date.now()}-${index}`,
                        sourceKey: `automatic-${index}`,
                        name: baseName,
                        fileName: `${sanitizeLogoFilename(baseName)}.png`,
                        ...image,
                    });
                } catch (error) {
                    failures.push(`${file.name}: ${error.message || "formato não suportado"}`);
                }
            }
            setLogos(generated);
            setLogoBatchEnabled(automaticEntryMode === "bulk");
            if (generated.length) {
                notifySuccess("Imagens processadas.", `${generated.length} logo(s) padronizado(s); ${failures.length} arquivo(s) não processado(s).`);
            }
            if (failures.length) {
                notifyError("Alguns arquivos não foram processados.", failures.slice(0, 2).join(" · "));
            }
            if (!generated.length && !failures.length) {
                notifyError("Nenhum logo foi criado.", "Confira as imagens e tente novamente.");
            }
        } catch (error) {
            console.error("Não foi possível processar as imagens:", error);
            notifyError("Não foi possível processar as imagens.", error.message || "Tente novamente.");
        } finally {
            setIsGenerating(false);
        }
    }

    // Reúne os logos em memória em um ZIP criado pelo utilitário local.
    async function downloadAll() {
        try {
            const archive = await createLogoZip(logos);
            triggerDownload(archive, "logos-mobilemed.zip");
            notifySuccess("Download preparado.", `${logos.length} logo(s) reunido(s) em um arquivo ZIP.`);
        } catch (error) {
            console.error("Não foi possível compactar os logos:", error);
            notifyError("Não foi possível baixar o lote.", "Tente baixar os arquivos individualmente.");
        }
    }

    // Atualiza ou acrescenta um resultado, usando a origem para evitar duplicatas do mesmo item.
    function saveLogoResult({ sourceKey, name, image }) {
        setLogoBatchEnabled(true);
        const fileName = `${sanitizeLogoFilename(name)}.png`;
        setLogos((current) => {
            const existingIndex = current.findIndex((logo) => logo.sourceKey === sourceKey);
            const savedLogo = {
                id: existingIndex >= 0 ? current[existingIndex].id : `${Date.now()}-${sourceKey}`,
                sourceKey,
                name,
                fileName,
                ...image,
            };
            if (existingIndex < 0) return [...current, savedLogo];
            return current.map((logo, index) => index === existingIndex ? savedLogo : logo);
        });
        notifySuccess("Alterações salvas.", `O logo “${name}” foi atualizado nos resultados.`);
    }

    // Materializa como resultado a configuração individual visível na prévia manual.
    async function saveManualPreview() {
        if (!previewName) {
            notifyError("Informe um nome para o logo.", "Digite um nome antes de salvar as alterações.");
            return;
        }
        setIsGenerating(true);
        try {
            const image = await createManualLogo({ name: previewName, displayMode, palette: selectedPalette, backgroundColor: manualPreviewBackground });
            saveLogoResult({ sourceKey: `manual-${manualPreviewPosition}`, name: previewName, image });
        } catch (error) {
            notifyError("Não foi possível salvar o logo.", error.message || "Tente novamente.");
        } finally {
            setIsGenerating(false);
        }
    }

    // Materializa como resultado a configuração individual visível na prévia automática.
    async function saveAutomaticPreview() {
        if (!automaticPreviewFile) {
            notifyError("Selecione uma imagem.", "Escolha uma imagem antes de salvar as alterações.");
            return;
        }
        if (automaticPreviewFile.size > MAX_FILE_SIZE) {
            notifyError("A imagem excede o limite.", "Selecione uma imagem de até 12 MB.");
            return;
        }
        setIsGenerating(true);
        try {
            const backgroundColor = automaticBackgroundMode === "individual"
                ? automaticIndividualBackgrounds[automaticPreviewPosition] ?? automaticBackgroundColor
                : automaticBackgroundColor;
            const image = await createAutomaticLogo(automaticPreviewFile, Number(tolerance), useAutomaticBackground ? backgroundColor : null);
            const name = automaticPreviewFile.name.replace(/\.[^.]+$/, "");
            saveLogoResult({ sourceKey: `automatic-${automaticPreviewPosition}`, name, image });
        } catch (error) {
            notifyError("Não foi possível salvar o logo.", error.message || "Tente novamente.");
        } finally {
            setIsGenerating(false);
        }
    }

    return (
        <main className="workspace-main logo-workspace">
            {/* Os formulários alternam entre criação a partir de texto e tratamento de imagens. */}
            <section className="page-intro">
                <span className="workspace-kicker">FERRAMENTA 03 · IDENTIDADE VISUAL</span>
                <h1>Gerador de logos</h1>
                <p>Crie identidades visuais em lote ou padronize imagens existentes em PNG quadrado.</p>
            </section>

            <nav className="logo-modes" aria-label="Modo do gerador de logos">
                <button type="button" className={mode === "manual" ? "active" : ""} aria-pressed={mode === "manual"} onClick={() => setMode("manual")}>
                    Criar manualmente
                </button>
                <button type="button" className={mode === "automatic" ? "active" : ""} aria-pressed={mode === "automatic"} onClick={() => setMode("automatic")}>
                    Padronizar imagens
                </button>
            </nav>

            {/* Cada modo mantém seu próprio conjunto de controles, prévia e ação de geração. */}
            {mode === "manual" ? (
                <section className="logo-panel" aria-labelledby="logo-manual-title">
                    <div className="logo-panel__heading">
                        <div>
                            <span className="logo-eyebrow">CRIAÇÃO MANUAL</span>
                            <h2 id="logo-manual-title">Crie logos a partir de nomes</h2>
                            <p>Cadastre um nome ou uma lista e escolha como o texto será exibido.</p>
                        </div>
                        <span className="logo-size-badge">200 × 200 px</span>
                    </div>

                    <fieldset className="logo-choice-group logo-entry-mode">
                        <legend>Tipo de cadastro</legend>
                        <div className="logo-choice-row">
                            <button type="button" className={manualEntryMode === "simple" ? "selected" : ""} aria-pressed={manualEntryMode === "simple"} onClick={() => { setManualEntryMode("simple"); setManualPreviewIndex(0); }}>
                                Simples
                            </button>
                            <button type="button" className={manualEntryMode === "bulk" ? "selected" : ""} aria-pressed={manualEntryMode === "bulk"} onClick={() => { setManualEntryMode("bulk"); setManualPreviewIndex(0); }}>
                                Em massa
                            </button>
                        </div>
                    </fieldset>

                    {manualEntryMode === "simple" ? (
                        <label className="logo-field" htmlFor="logo-name">
                            <span>Nome para o logo</span>
                            <input
                                id="logo-name"
                                type="text"
                                value={singleName}
                                onChange={(event) => { setSingleName(event.target.value); setManualPreviewIndex(0); }}
                                placeholder="Ex.: Clínica Exemplo"
                                maxLength={120}
                            />
                            <small>Será criado um logo individual.</small>
                        </label>
                    ) : (
                        <label className="logo-field" htmlFor="logo-names">
                            <span>Nomes para os logos</span>
                            <textarea
                                id="logo-names"
                                value={namesText}
                                onChange={(event) => { setNamesText(event.target.value); setManualPreviewIndex(0); setManualIndividualBackgrounds({}); }}
                                placeholder={"Clínica Exemplo\nDra. Maria Silva\nCentro Médico"}
                                maxLength={5000}
                                rows={4}
                            />
                            <small>Um nome por linha · até {MAX_LOGOS} logos por lote</small>
                        </label>
                    )}

                    <fieldset className="logo-choice-group">
                        <legend>Texto em destaque</legend>
                        <div className="logo-choice-row">
                            <button type="button" className={displayMode === "full" ? "selected" : ""} aria-pressed={displayMode === "full"} onClick={() => setDisplayMode("full")}>
                                Nome completo
                            </button>
                            <button type="button" className={displayMode === "abbreviation" ? "selected" : ""} aria-pressed={displayMode === "abbreviation"} onClick={() => setDisplayMode("abbreviation")}>
                                Abreviação
                            </button>
                        </div>
                    </fieldset>

                    <fieldset className="logo-palette-picker">
                        <legend>Paleta de cores e fundo</legend>
                        <div className="logo-palette-list">
                            {palettes.map((palette) => (
                                <button
                                    key={palette.id}
                                    type="button"
                                    className={paletteId === palette.id ? "selected" : ""}
                                    aria-pressed={paletteId === palette.id}
                                    onClick={() => setPaletteId(palette.id)}
                                >
                                    <span className="logo-palette-swatch" style={{ "--palette-bg": palette.background, "--palette-primary": palette.primary, "--palette-accent": palette.accent }} aria-hidden="true" />
                                    <span>{palette.label}</span>
                                </button>
                            ))}
                        </div>
                        <small className="logo-palette-hint">A imagem será quadrada, com o fundo preenchido pela cor da paleta selecionada.</small>
                    </fieldset>

                    {manualEntryMode === "bulk" && (
                        <fieldset className="logo-choice-group">
                            <legend>Aplicação do fundo</legend>
                            <div className="logo-choice-row">
                                <button type="button" className={manualBackgroundMode === "shared" ? "selected" : ""} aria-pressed={manualBackgroundMode === "shared"} onClick={() => setManualBackgroundMode("shared")}>Igual para todas</button>
                                <button type="button" className={manualBackgroundMode === "individual" ? "selected" : ""} aria-pressed={manualBackgroundMode === "individual"} onClick={() => setManualBackgroundMode("individual")}>Individual</button>
                            </div>
                            {manualBackgroundMode === "individual" && previewName && (
                                <label className="logo-background-color logo-individual-color" htmlFor="logo-manual-individual-background">
                                    <span>Fundo de “{previewName}”</span>
                                    <input id="logo-manual-individual-background" type="color" value={manualPreviewBackground} onChange={(event) => setManualIndividualBackgrounds((current) => ({ ...current, [manualPreviewPosition]: event.target.value }))} />
                                    <code>{manualPreviewBackground}</code>
                                </label>
                            )}
                            {manualBackgroundMode === "individual" && <small className="logo-palette-hint">Use a navegação da prévia para escolher a cor de cada logo.</small>}
                            {manualBackgroundMode === "individual" && <button className="logo-save-individual-button" type="button" onClick={saveManualPreview} disabled={isGenerating || !previewName}>{isGenerating ? "Salvando…" : "Salvar alterações deste logo"}</button>}
                        </fieldset>
                    )}

                    <LogoLivePreview
                        title={manualEntryMode === "bulk" ? `Logo: ${previewName || "lote"}` : "Logo individual"}
                        description={previewName ? `Exemplo para “${previewName}” com a paleta atual.` : "A prévia acompanha suas opções."}
                        imageUrl={manualPreviewUrl}
                        imageAlt={previewName ? `Prévia do logo de ${previewName}` : "Prévia do logo manual"}
                        status={manualPreviewStatus}
                        emptyMessage="Digite um nome para visualizar o logo."
                        index={manualPreviewPosition}
                        count={manualPreviewNames.length}
                        onPrevious={() => setManualPreviewIndex((current) => Math.max(0, current - 1))}
                        onNext={() => setManualPreviewIndex((current) => Math.min(manualPreviewNames.length - 1, current + 1))}
                    />

                    <button className="logo-primary-button" type="button" onClick={generateManualLogos} disabled={isGenerating}>
                        {isGenerating ? "Criando logos…" : "Criar logos"}
                    </button>
                </section>
            ) : (
                <section className="logo-panel" aria-labelledby="logo-automatic-title">
                    <div className="logo-panel__heading">
                        <div>
                            <span className="logo-eyebrow">TRATAMENTO AUTOMÁTICO</span>
                            <h2 id="logo-automatic-title">Remova o fundo e padronize</h2>
                            <p>O processamento remove o fundo original, preserva o logo e centraliza a imagem sobre a cor selecionada.</p>
                        </div>
                        <span className="logo-size-badge">200 × 200 px</span>
                    </div>

                    <fieldset className="logo-choice-group">
                        <legend>Tipo de cadastro</legend>
                        <div className="logo-choice-row">
                            <button type="button" className={automaticEntryMode === "simple" ? "selected" : ""} aria-pressed={automaticEntryMode === "simple"} onClick={() => { setAutomaticEntryMode("simple"); setFiles((current) => current.slice(0, 1)); setAutomaticPreviewIndex(0); }}>
                                Simples
                            </button>
                            <button type="button" className={automaticEntryMode === "bulk" ? "selected" : ""} aria-pressed={automaticEntryMode === "bulk"} onClick={() => { setAutomaticEntryMode("bulk"); setAutomaticPreviewIndex(0); }}>
                                Em massa
                            </button>
                        </div>
                    </fieldset>

                    <label
                        className={`logo-dropzone${isDragging ? " is-dragging" : ""}`}
                        htmlFor="logo-images"
                        onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(event) => { event.preventDefault(); setIsDragging(false); updateFiles(event.dataTransfer.files); }}
                    >
                        <span className="logo-dropzone__icon" aria-hidden="true">↑</span>
                        <strong>Escolha {automaticEntryMode === "simple" ? "uma imagem" : "imagens ou arraste até aqui"}</strong>
                        <small>PNG, JPEG, WebP ou BMP · até 12 MB por imagem · {automaticEntryMode === "simple" ? "cadastro individual" : `até ${MAX_LOGOS} imagens`}</small>
                        <input
                            ref={fileInputRef}
                            id="logo-images"
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/bmp"
                            multiple={automaticEntryMode === "bulk"}
                            onChange={(event) => updateFiles(event.target.files)}
                        />
                    </label>
                    <div className="logo-background-setting">
                        <label className="logo-background-toggle" htmlFor="logo-auto-background">
                            <input
                                id="logo-auto-background"
                                type="checkbox"
                                checked={useAutomaticBackground}
                                onChange={(event) => setUseAutomaticBackground(event.target.checked)}
                            />
                            <span>Escolher uma cor de fundo</span>
                        </label>
                        {useAutomaticBackground && (
                            <>
                                {automaticEntryMode === "bulk" && (
                                    <div className="logo-choice-row">
                                        <button type="button" className={automaticBackgroundMode === "shared" ? "selected" : ""} aria-pressed={automaticBackgroundMode === "shared"} onClick={() => setAutomaticBackgroundMode("shared")}>Igual para todas</button>
                                        <button type="button" className={automaticBackgroundMode === "individual" ? "selected" : ""} aria-pressed={automaticBackgroundMode === "individual"} onClick={() => setAutomaticBackgroundMode("individual")}>Individual</button>
                                    </div>
                                )}
                                <label className="logo-background-color" htmlFor={automaticBackgroundMode === "individual" && automaticEntryMode === "bulk" ? "logo-auto-individual-background" : "logo-auto-background-color"}>
                                    <span>{automaticBackgroundMode === "individual" && automaticEntryMode === "bulk" ? `Fundo de “${automaticPreviewFile?.name ?? "imagem atual"}”` : "Cor de fundo"}</span>
                                    <input
                                        id={automaticBackgroundMode === "individual" && automaticEntryMode === "bulk" ? "logo-auto-individual-background" : "logo-auto-background-color"}
                                        type="color"
                                        value={automaticBackgroundMode === "individual" && automaticEntryMode === "bulk" ? automaticPreviewBackground : automaticBackgroundColor}
                                        onChange={(event) => automaticBackgroundMode === "individual" && automaticEntryMode === "bulk"
                                            ? setAutomaticIndividualBackgrounds((current) => ({ ...current, [automaticPreviewPosition]: event.target.value }))
                                            : setAutomaticBackgroundColor(event.target.value)}
                                    />
                                    <code>{(automaticBackgroundMode === "individual" && automaticEntryMode === "bulk" ? automaticPreviewBackground : automaticBackgroundColor) === "#ffffff" ? "#fff" : (automaticBackgroundMode === "individual" && automaticEntryMode === "bulk" ? automaticPreviewBackground : automaticBackgroundColor)}</code>
                                </label>
                                {automaticBackgroundMode === "individual" && automaticEntryMode === "bulk" && <small>Use a navegação da prévia para escolher a cor de cada imagem.</small>}
                                {automaticBackgroundMode === "individual" && automaticEntryMode === "bulk" && <button className="logo-save-individual-button" type="button" onClick={saveAutomaticPreview} disabled={isGenerating || !automaticPreviewFile}>{isGenerating ? "Salvando…" : "Salvar alterações desta imagem"}</button>}
                            </>
                        )}
                        <small>{useAutomaticBackground ? "A imagem será composta sobre a cor escolhida." : "O fundo da imagem exportada será transparente."}</small>
                    </div>
                    <div className="logo-auto-settings">
                        <div>
                            <label htmlFor="logo-tolerance">Sensibilidade para remover o fundo</label>
                            <p>Valores maiores removem mais tons próximos às cores detectadas nas bordas.</p>
                        </div>
                        <div className="logo-tolerance-control">
                            <input id="logo-tolerance" type="range" min="18" max="100" value={tolerance} onChange={(event) => setTolerance(event.target.value)} />
                            <output htmlFor="logo-tolerance">{tolerance}</output>
                        </div>
                    </div>
                    <LogoLivePreview
                        title={files.length > 1 ? `Imagem ${automaticPreviewPosition + 1} de ${files.length}` : "Imagem selecionada"}
                        description={automaticPreviewFile ? automaticPreviewFile.name : "A prévia mostra o resultado com a sensibilidade atual."}
                        imageUrl={automaticPreviewUrl}
                        imageAlt={automaticPreviewFile ? `Prévia processada de ${automaticPreviewFile.name}` : "Prévia do logo automático"}
                        status={automaticPreviewStatus}
                        emptyMessage="Selecione uma imagem para visualizar o resultado."
                        index={automaticPreviewPosition}
                        count={files.length}
                        onPrevious={() => setAutomaticPreviewIndex((current) => Math.max(0, current - 1))}
                        onNext={() => setAutomaticPreviewIndex((current) => Math.min(files.length - 1, current + 1))}
                    />
                    <div className="logo-auto-footer">
                        <span>{files.length ? `${files.length} imagem(ns) selecionada(s)` : "Selecione a imagem para visualizar a composição final."}</span>
                        <button className="logo-primary-button" type="button" onClick={generateAutomaticLogos} disabled={isGenerating}>
                            {isGenerating ? "Processando imagens…" : "Gerar logos"}
                        </button>
                    </div>
                </section>
            )}

            {logos.length > 0 && (
                <section className="logo-results" aria-labelledby="logo-results-title">
                    <div className="logo-results__heading">
                        <div>
                            <span className="logo-eyebrow">RESULTADOS</span>
                            <h2 id="logo-results-title">{logos.length} logo(s) prontos</h2>
                        </div>
                        {logoBatchEnabled && <button type="button" className="logo-download-all" onClick={downloadAll}>Baixar arquivos (.zip)</button>}
                    </div>
                    <div className="logo-results__grid">
                        {logos.map((logo) => (
                            <article className="logo-result-card" key={logo.id}>
                                <div className="logo-result-card__preview"><img src={logo.previewUrl} alt={`Logo de ${logo.name}`} width="200" height="200" /></div>
                                <strong title={logo.name}>{logo.name}</strong>
                                <span>PNG · 200 × 200 px</span>
                                <button type="button" onClick={() => triggerDownload(logo.blob, logo.fileName)}>Baixar PNG</button>
                            </article>
                        ))}
                    </div>
                </section>
            )}
        </main>
    );
}

export default LogoWorkspace;
