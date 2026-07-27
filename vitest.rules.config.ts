import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/firestore.rules.test.ts"],
    hookTimeout: 30_000,
    testTimeout: 30_000,
    sequence: {
      concurrent: false,
    },
  },
});
