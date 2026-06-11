import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "@vscode/test-cli";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  files: "dist/test/**/*.test.cjs",
  workspaceFolder: __dirname,
});
