import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Ponto de entrada: busca a raiz declarada no HTML e monta nela o componente principal.
createRoot(document.getElementById('root')).render(
    <App />
)
