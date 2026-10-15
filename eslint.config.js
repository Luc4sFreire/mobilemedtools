import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// Combina regras JavaScript/React e exclui dependências e artefatos gerados.
export default defineConfig([
  // Bundles de produção são gerados automaticamente e não devem ser analisados.
  globalIgnores(['dist']),
  {
    // Aplica as regras aos módulos JavaScript e JSX do projeto.
    files: ['**/*.{js,jsx}'],
    // Aplica regras base, validação dos React Hooks e restrições do Fast Refresh.
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    // Reconhece APIs globais do navegador e habilita a sintaxe JSX no parser.
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
