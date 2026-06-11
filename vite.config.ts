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
  },
});
