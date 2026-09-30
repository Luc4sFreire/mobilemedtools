import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Monta o componente principal na raiz #root declarada em index.html.
createRoot(document.getElementById('root')).render(
    <App />
)
