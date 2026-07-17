import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    // Integration tests share one test database and truncate it in their
    // own beforeAll — running test files in parallel would race those
    // resets against each other, so keep file execution sequential. Unit
    // tests are pure/fast enough that this costs nothing noticeable.
    fileParallelism: false,
    server: {
      deps: {
        // @material/material-color-utilities ships relative ESM imports
        // without file extensions (e.g. "./dynamic_scheme"), which Node's
        // native ESM resolver rejects but bundlers (Turbopack, and Vite's
        // own esbuild pre-bundling) tolerate. Routing it through Vite's
        // transform pipeline instead of plain Node resolution fixes it.
        inline: ["@material/material-color-utilities"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // See tests/setup/server-only-stub.ts for why this exists.
      "server-only": path.resolve(__dirname, "./tests/setup/server-only-stub.ts"),
    },
  },
});
