import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    outDir: "dist/prod",
    sourcemap: true,
    dts: {
      sourcemap: true,
    },
    deps: {
      neverBundle: ["vscode", "mocha"],
      alwaysBundle: [/.*/],
      onlyBundle: false,
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
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
});
