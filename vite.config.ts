import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    dts: {
      sourcemap: true,
    },
    deps: {
      skipNodeModulesBundle: true,
      neverBundle: ["vscode"],
    },
    fixedExtension: false,
  },
  test: {
    globals: true,
    environment: "node",
    // Only run unit tests that don't require VSCode API
    include: ["src/test/**/*.test.ts", "src/test/performanceTest.ts"],
    exclude: [
      "node_modules",
      "dist",
      ".vscode-test",
      "src/test/lsp.test.ts",
      "src/test/runTest.ts",
    ],
  },
  fmt: {
    sortImports: true,
    sortPackageJson: {
      sortScripts: true,
    },
  },
  lint: {
    plugins: ["unicorn", "typescript", "oxc"],
    rules: {
      "unicorn/prefer-node-protocol": "warn",
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          fix: {
            imports: "off",
            variables: "off",
          },
        },
      ],
    },
    settings: {
      vitest: {
        typecheck: false,
      },
    },
    env: {
      builtin: true,
    },
  },
});
