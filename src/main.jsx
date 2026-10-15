// API do React que conecta a árvore de componentes ao elemento DOM da página.
import { createRoot } from 'react-dom/client'
// Componente raiz que hospeda as funcionalidades da aplicação.
import App from './App.jsx'
// Estilos e variáveis compartilhadas por todas as telas.
import '../style/index.css'

// Monta a aplicação no container declarado no index.html.
createRoot(document.getElementById('root')).render(<App />)
