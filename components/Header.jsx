// Importa a marca usada no painel fixo da aplicação.
import mobilemedLogo from "../assets/mobilemed-logo.png";

// Define os destinos de navegação e os ícones decorativos de cada ferramenta.
const navigation = [
    {
        id: "signature",
        label: "Assinatura",
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m4 16.5 9.8-9.8a2.1 2.1 0 0 1 3 3L7 19.5 3.5 20.5 4 16.5Z" />
                <path d="m14.5 8 3 3M12 20h8" />
            </svg>
        ),
    },
    {
        id: "password",
        label: "Senha",
        icon: (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="8" cy="15" r="4" />
                <path d="m11 12 8-8 2 2-2 2 2 2-3 3-2-2-2 2" />
            </svg>
        ),
    },
    {
        id: "logo",
        label: "Logo",
        icon: (
            <i className="fi fi-bs-drafting-compass" aria-hidden="true" />
        ),
    },
];

// Renderiza o menu lateral e delega à raiz da aplicação as mudanças de tela/tema.
function Header({ activeComponent, onSelectComponent, theme, onToggleTheme }) {
    return (
        <aside className="app-sidebar">
            <div className="app-brand">
                <div className="app-brand__logo">
                    <img src={mobilemedLogo} alt="Mobilemed" />
                </div>
                <div className="app-brand__copy">
                    <span>Mobilemed Tools</span>
                    <small>PAINEL DE OPERAÇÕES</small>
                </div>
            </div>

            <div className="app-sidebar__section-label">FERRAMENTAS</div>
            {/* Os botões mantêm o estado selecionado visível e exposto a tecnologias assistivas. */}
            <nav className="app-nav" aria-label="Ferramentas">
                {navigation.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={`app-nav__item${activeComponent === item.id ? " active" : ""}`}
                        aria-pressed={activeComponent === item.id}
                        onClick={() => onSelectComponent(item.id)}
                    >
                        <span className="app-nav__icon">{item.icon}</span>
                        <span>{item.label}</span>
                        <svg className="app-nav__chevron" viewBox="0 0 16 16" aria-hidden="true">
                            <path d="m6 3 5 5-5 5" />
                        </svg>
                    </button>
                ))}
            </nav>

            <div className="app-sidebar__spacer" />

            {/* Rodapé do painel: alterna o tema sem guardar estado local neste componente. */}
            <div className="app-sidebar__footer">
                {/* <div className="sidebar-local-card">
                    <span className="sidebar-local-card__icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                            <rect x="4" y="5" width="16" height="14" rx="3" />
                            <path d="M8 9h8M8 13h5" />
                        </svg>
                    </span>
                    <span><strong>Ambiente local</strong><small>Seus dados ficam no navegador</small></span>
                </div> */}
                <button
                    type="button"
                    className="theme-toggle"
                    onClick={onToggleTheme}
                    aria-label={`Ativar modo ${theme === "dark" ? "claro" : "escuro"}`}
                    aria-pressed={theme === "dark"}
                >
                    <span className="theme-toggle__icon" aria-hidden="true">
                        {theme === "dark" ? (
                            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>
                        ) : (
                            <svg viewBox="0 0 24 24"><path d="M20.3 15.2A8.5 8.5 0 0 1 8.8 3.7 8.6 8.6 0 1 0 20.3 15.2Z" /></svg>
                        )}
                    </span>
                    <span className="theme-toggle__label">Modo {theme === "dark" ? "claro" : "escuro"}</span>
                    <span className={`theme-toggle__switch${theme === "dark" ? " is-dark" : ""}`} aria-hidden="true"><i /></span>
                </button>
            </div>
        </aside>
    );
}

export default Header;
