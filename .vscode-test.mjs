import { defineConfig } from "@vscode/test-cli";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  files: "dist/test/**/*.test.cjs",
  workspaceFolder: __dirname,
});
