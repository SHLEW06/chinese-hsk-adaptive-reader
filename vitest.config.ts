import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Mirror the "@/*" path alias from tsconfig.json so unit tests can import
// modules exactly the way application code does.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    exclude: [
      "tests/firestore.rules.test.ts",
      "**/node_modules/**",
      "**/.git/**",
    ],
  },
});
