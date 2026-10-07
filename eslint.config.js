import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// Combina regras JavaScript/React e exclui dependências e artefatos gerados.
export default defineConfig([
  globalIgnores(['dist', '.venv/**', 'venv/**']),
  {
    files: ['**/*.{js,jsx}'],
    // Aplica regras base, validação dos React Hooks e restrições do Fast Refresh.
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    // Reconhece APIs globais do navegador e permite analisar arquivos com JSX.
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
