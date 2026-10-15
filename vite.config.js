// Carrega a API de configuração do Vite para definir plugins e servidor local.
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Configuração do ambiente de desenvolvimento e do compilador de JSX do React.
export default defineConfig({
  // Transforma JSX e habilita integrações de desenvolvimento específicas do React.
  plugins: [react()],
  // Mantém o endereço local conhecido pela documentação e pelos fluxos de teste.
  server: {
    port: 3000,
  },
});
