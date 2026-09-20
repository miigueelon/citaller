/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  css: {
    modules: {
      // Nombres de clase legibles en desarrollo y cortos en producción.
      generateScopedName:
        process.env.NODE_ENV === "production" ? "[hash:base64:6]" : "[name]__[local]__[hash:base64:4]",
    },
  },
  test: {
    // Solo lógica pura: ficheros *.test.ts junto al código. Nada de DOM ni de red.
    include: ["src/**/*.test.{ts,js}", "scripts/**/*.test.{ts,mjs}"],
    environment: "node",
    passWithNoTests: true,
  },
});
