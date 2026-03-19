import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 60_000,
    hookTimeout: 15_000,
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
