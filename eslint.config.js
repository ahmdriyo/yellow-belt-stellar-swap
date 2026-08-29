import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // The Stellar SDK returns loosely-typed XDR/Soroban values (ScVal), so
      // `any` is used deliberately when decoding contract responses and events.
      '@typescript-eslint/no-explicit-any': 'off',
      // Fetching on-chain state (balances, orderbook) in an effect and writing
      // it to state is the intended data-sync pattern used throughout the app.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
