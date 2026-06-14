import * as assert from "node:assert";

import { describe, test } from "mocha";
import * as vscode from "vscode";

describe("Extension Integration", () => {
  test("extension is active", () => {
    const ext = vscode.extensions.getExtension("CatBraaain.custom-language-tools");
    assert.ok(ext, "Extension should be found");
    assert.ok(ext!.isActive === true, "Extension should be active");
  });

  test("extension commands is registered", async () => {
    const registeredCommands = await vscode.commands.getCommands(true);
    assert.ok(
      registeredCommands.includes("customLanguageTools.restartAll"),
      "restart command should be registered",
    );
  });
});
