import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "playwright-report", "test-results", "supabase/functions", "backups"]),

  // Código del navegador: JS/JSX heredado y TS/TSX nuevo.
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Nada del frontend importa de clientes/: la configuración por taller vive en la base de datos.
      "no-restricted-imports": ["error", { patterns: ["**/clientes/**"] }],
    },
  },

  // Scripts de Node y pruebas de Playwright.
  {
    files: ["scripts/**/*.{js,mjs,ts}", "tests/**/*.ts", "*.config.{js,ts}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
  },
]);
