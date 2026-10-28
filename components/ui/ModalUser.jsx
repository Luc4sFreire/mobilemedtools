import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    CREDENTIAL_MESSAGE_PRESETS,
    DEFAULT_CREDENTIAL_MESSAGE,
} from "../../src/utils/credentialMessages";

function ModalUsers({
    users,
    onClose,
    onRemoveUser,
    onClearUsers,
    onExportCredentials,
    onCopyCredentials,
    onExportMessages,
    onCopyMessages,
}) {
    const [isClearConfirmationOpen, setIsClearConfirmationOpen] = useState(false);
    const [messageTemplate, setMessageTemplate] = useState(DEFAULT_CREDENTIAL_MESSAGE);
    const [messageBrand, setMessageBrand] = useState("Mobilemed");
    const [selectedMessagePreset, setSelectedMessagePreset] = useState("default");
    const usersModalRef = useRef(null);
    const closeUsersModalRef = useRef(null);
    const messageTemplateRef = useRef(null);

    useEffect(() => {
        const appShell = document.querySelector(".app-shell");
        appShell?.classList.add("app-shell--users-modal-open");

        return () => {
            appShell?.classList.remove("app-shell--users-modal-open");
        };
    }, []);

    useEffect(() => {
        const previouslyFocusedElement = document.activeElement;
        closeUsersModalRef.current?.focus();

        function handleModalKeyDown(event) {
            if (event.key === "Escape") {
                onClose();
                return;
            }

            if (event.key !== "Tab") return;

            const focusableElements = usersModalRef.current?.querySelectorAll(
                'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (!focusableElements?.length) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        }

        document.addEventListener("keydown", handleModalKeyDown);
        return () => {
            document.removeEventListener("keydown", handleModalKeyDown);
            previouslyFocusedElement?.focus?.();
        };
    }, [onClose]);

    function clearUsers() {
        if (onClearUsers()) setIsClearConfirmationOpen(false);
    }

    function selectMessagePreset(event) {
        const presetId = event.target.value;
        setSelectedMessagePreset(presetId);
        const preset = CREDENTIAL_MESSAGE_PRESETS[messageBrand].find(({ id }) => id === presetId);
        setMessageTemplate(preset?.text ?? "");
    }

    function selectMessageBrand(brand) {
        const presets = CREDENTIAL_MESSAGE_PRESETS[brand];
        setMessageBrand(brand);

        if (!presets.length) {
            setSelectedMessagePreset("custom");
            setMessageTemplate("");
            return;
        }

        setSelectedMessagePreset("default");
        setMessageTemplate(presets[0].text);
    }

    function editMessageTemplate(event) {
        setMessageTemplate(event.target.value);
    }

    function insertMessagePlaceholder(placeholder) {
        const textarea = messageTemplateRef.current;
        const start = textarea?.selectionStart ?? messageTemplate.length;
        const end = textarea?.selectionEnd ?? start;
        const updatedTemplate = `${messageTemplate.slice(0, start)}${placeholder}${messageTemplate.slice(end)}`;
        setSelectedMessagePreset("custom");
        setMessageTemplate(updatedTemplate);
        requestAnimationFrame(() => {
            textarea?.focus();
            textarea?.setSelectionRange(start + placeholder.length, start + placeholder.length);
        });
    }

    function exportMessages() {
        onExportMessages(messageTemplate);
    }

    function copyMessages() {
        onCopyMessages(messageTemplate);
    }

    return createPortal((
        <div
            className="saved-users-overlay"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                className="saved-users-modal"
                ref={usersModalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="saved-users-title"
                aria-describedby="saved-users-description"
            >
                <header className="saved-users-header">
                    <div className="saved-users-title-group">
                        <span className="saved-users-modal-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M16 4.2a4 4 0 0 1 0 7.6M22 20v-1.5a4 4 0 0 0-3-3.87" />
                            </svg>
                        </span>
                        <div>
                            <span className="saved-users-eyebrow">GESTÃO DE ACESSOS</span>
                            <h2 id="saved-users-title">Usuários salvos</h2>
                            <p id="saved-users-description">Credenciais armazenadas neste navegador.</p>
                        </div>
                    </div>
                    <div className="saved-users-header-actions">
                        <span className="saved-users-count">
                            {users.length} {users.length === 1 ? "usuário" : "usuários"}
                        </span>
                        <button
                            ref={closeUsersModalRef}
                            type="button"
                            onClick={onClose}
                            aria-label="Fechar usuários salvos"
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
                        </button>
                    </div>
                </header>
                <div className="saved-users-list-heading">
                    <h3>Credenciais</h3>
                    <span>E-mail e senha</span>
                </div>
                <div className="saved-users-list">
                    {users.length === 0 ? (
                        <div className="saved-users-empty">
                            <span aria-hidden="true">
                                <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20v-1a6.5 6.5 0 0 1 13 0v1M17 8h5m-2.5-2.5v5" /></svg>
                            </span>
                            <p>Nenhum usuário salvo ainda.</p>
                            <small>Depois de salvar um acesso, ele aparecerá nesta lista.</small>
                        </div>
                    ) : users.map((user) => (
                        <article className="saved-user" key={user.id}>
                            <span className="saved-user-avatar" aria-hidden="true">{user.email.slice(0, 1).toUpperCase()}</span>
                            <div className="saved-user-info">
                                <p>{user.email}</p>
                                <code>{user.password}</code>
                            </div>
                            <button
                                type="button"
                                className="delete-saved-user"
                                onClick={() => onRemoveUser(user)}
                                aria-label={`Excluir usuário ${user.email}`}
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" /></svg>
                                <span>Excluir</span>
                            </button>
                        </article>
                    ))}
                </div>
                {isClearConfirmationOpen && (
                    <div
                        className="saved-users-confirmation"
                        role="group"
                        aria-labelledby="clear-users-confirmation"
                        aria-live="polite"
                    >
                        <p id="clear-users-confirmation">Deseja remover todos os usuários salvos?</p>
                        <div>
                            <button type="button" onClick={() => setIsClearConfirmationOpen(false)}>
                                Cancelar
                            </button>
                            <button type="button" className="saved-users-confirmation__confirm" onClick={clearUsers}>
                                Apagar usuários
                            </button>
                        </div>
                    </div>
                )}
                <section className="saved-users-message-settings" aria-labelledby="saved-users-message-title">
                    <h3 id="saved-users-message-title">Personalizar mensagens</h3>
                    <p>Este texto aparece antes do e-mail e da senha em cada mensagem.</p>
                    <div className="saved-users-message-brands" role="group" aria-label="Marca das mensagens">
                        {Object.keys(CREDENTIAL_MESSAGE_PRESETS).map((brand) => (
                            <button
                                key={brand}
                                type="button"
                                className={messageBrand === brand ? "is-selected" : ""}
                                aria-pressed={messageBrand === brand}
                                onClick={() => selectMessageBrand(brand)}
                            >
                                {brand}
                            </button>
                        ))}
                    </div>
                    <label htmlFor="saved-users-message-preset">Mensagem pronta (opcional)</label>
                    <select
                        id="saved-users-message-preset"
                        value={selectedMessagePreset}
                        onChange={selectMessagePreset}
                    >
                        {CREDENTIAL_MESSAGE_PRESETS[messageBrand].map(({ id, label }) => (
                            <option key={id} value={id}>{label}</option>
                        ))}
                        <option value="custom">Personalizada</option>
                    </select>
                    <label htmlFor="saved-users-message-template" hidden={selectedMessagePreset !== "custom"}>
                        Texto da mensagem
                    </label>
                    <textarea
                        ref={messageTemplateRef}
                        id="saved-users-message-template"
                        rows={3}
                        maxLength={500}
                        value={messageTemplate}
                        onChange={editMessageTemplate}
                        hidden={selectedMessagePreset !== "custom"}
                        placeholder="Digite uma mensagem personalizada"
                    />
                    <div className="saved-users-message-placeholders" hidden={selectedMessagePreset !== "custom"}>
                        <span>Inserir no ponto selecionado:</span>
                        <button type="button" onClick={() => insertMessagePlaceholder("{email}")}>E-mail</button>
                        <button type="button" onClick={() => insertMessagePlaceholder("{password}")}>Senha</button>
                    </div>
                    <small hidden={selectedMessagePreset !== "custom"}>
                        Use os marcadores para posicionar os dados: {"{email}"} e {"{password}"}.
                    </small>
                </section>
                <footer className="saved-users-actions">
                    <div className="saved-users-actions__intro">
                        <span className="saved-users-eyebrow">AÇÕES EM LOTE</span>
                        <p>Exporte ou copie os dados para compartilhar com segurança.</p>
                        <button
                            type="button"
                            className="reset-users"
                            onClick={() => setIsClearConfirmationOpen(true)}
                            disabled={!users.length}
                        >
                            Apagar todos
                        </button>
                    </div>
                    <div className="saved-users-export-actions">
                        <button className="saved-users-action" type="button" disabled={!users.length} onClick={onExportCredentials}>
                            <span className="saved-users-action__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v12m-4-4 4 4 4-4M5 17v3h14v-3" /></svg></span>
                            <span>Exportar credenciais</span>
                        </button>
                        <button className="saved-users-action" type="button" disabled={!users.length} onClick={onCopyCredentials}>
                            <span className="saved-users-action__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h2" /></svg></span>
                            <span>Copiar credenciais</span>
                        </button>
                        <button className="saved-users-action" type="button" disabled={!users.length} onClick={exportMessages}>
                            <span className="saved-users-action__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 5h16v12H9l-5 4V5Z" /><path d="M8 9h8M8 13h5" /></svg></span>
                            <span>Exportar mensagens</span>
                        </button>
                        <button className="saved-users-action" type="button" disabled={!users.length} onClick={copyMessages}>
                            <span className="saved-users-action__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h2" /></svg></span>
                            <span>Copiar mensagens</span>
                        </button>
                    </div>
                </footer>
            </section>
        </div>
    ), document.querySelector(".app-shell") ?? document.body);
}

export default ModalUsers;
