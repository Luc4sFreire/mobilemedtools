import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Configura o servidor de desenvolvimento e habilita a transformação de JSX pelo React.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000 // Mantém a aplicação disponível na porta padrão do projeto.
  }
})
