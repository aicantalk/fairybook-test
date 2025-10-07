import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    globals: true,
    include: ["tests/**/*.test.{ts,tsx}"],
    pool: "threads",
    minWorkers: 1,
    maxWorkers: 1,
  }
});
