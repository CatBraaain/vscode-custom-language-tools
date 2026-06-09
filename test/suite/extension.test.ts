import * as assert from "assert";
import * as vscode from "vscode";
import { suite, test } from "mocha";

suite("Extension Integration", () => {
  test("extension is active", () => {
    const ext = vscode.extensions.getExtension("CatBraaain.custom-language-config");
    assert.ok(ext, "Extension should be found");
    assert.strictEqual(ext!.isActive, true, "Extension should be active");
  });

  test("extension contributes manualRestartLSP command", () => {
    const ext = vscode.extensions.getExtension("CatBraaain.custom-language-config");
    assert.ok(ext);
    const commands = ext!.packageJSON.contributes.commands as Array<{ command: string }>;
    const commandIds = commands.map((c) => c.command);
    assert.ok(
      commandIds.includes("unifiedLanguageConfig.manualRestartLSP"),
      "manualRestartLSP command should be declared in package.json",
    );
  });
});
