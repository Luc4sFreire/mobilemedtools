// Importa a API que cria a raiz React ligada ao DOM do navegador.
import { createRoot } from 'react-dom/client'
// Importa a tela raiz, responsável por navegação, módulos e provedores globais.
import App from './App.jsx'
// Esta folha-base antiga não é carregada; as entradas visuais ativas estão abaixo.
// import './style/index.css'
// Carrega a fundação visual atual e suas regras comuns de layout.
import './style/refresh.css'
// Aplica ajustes visuais e variantes complementares sobre a fundação.
import './style/modern.css'
// Carrega a família Flaticon usada pelo ícone do módulo de logos.
import '@flaticon/flaticon-uicons/css/bold/straight.css'

// Encontra o elemento de montagem declarado em index.html.
// A raiz React atualiza esse elemento com App e todos os seus componentes descendentes.
createRoot(document.getElementById('root')).render(<App />)
