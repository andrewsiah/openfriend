import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    exclude: [...configDefaults.exclude, "tests/browser/**/*.spec.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
