import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Habilita o plugin React e define a porta padrão do servidor Vite.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000 // Expõe o servidor local na porta documentada do projeto.
  }
})
