import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e", "playwright-report", "test-results"],
    setupFiles: ["./src/tests/setup.ts"],
    coverage: {
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.{test,spec}.{ts,tsx}", "src/tests/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Neutralise Next.js' `server-only` runtime guard so we can unit-test
      // service modules that mark themselves as server-only. The guard is
      // otherwise a plain `throw` at import time.
      "server-only": path.resolve(__dirname, "./src/tests/shims/server-only.ts"),
    },
  },
});
