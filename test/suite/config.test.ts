import * as assert from "node:assert";

import { describe, afterEach, test } from "mocha";
import * as vscode from "vscode";

import { getConfig } from "../../src/config";

describe("getConfig", () => {
  const cfg = () => vscode.workspace.getConfiguration("customLanguageTools");

  afterEach(async () => {
    await cfg().update("rules", undefined, vscode.ConfigurationTarget.Workspace);
  });

  test("getConfig returns empty rules when not set", async () => {
    await cfg().update("rules", undefined, vscode.ConfigurationTarget.Workspace);
    const config = getConfig();
    assert.deepStrictEqual(config.rules, []);
  });

  test("getConfig validates and returns parsed rules", async () => {
    await cfg().update(
      "rules",
      [
        {
          name: "Prettier",
          document: ["javascript", { language: "json", pattern: "**/package.json" }],
          action: { formatter: "prettier --stdin-filepath ${filePath}" },
        },
      ],
      vscode.ConfigurationTarget.Workspace,
    );
    const config = getConfig();
    assert.strictEqual(config.rules.length, 1);
    assert.deepStrictEqual(config.rules[0].document, [
      "javascript",
      { language: "json", pattern: "**/package.json" },
    ]);
    assert.deepStrictEqual(
      config.rules[0].action.formatter,
      "prettier --stdin-filepath ${filePath}",
    );
  });

  test("getConfig returns empty rules on invalid rule schema", async () => {
    await cfg().update(
      "rules",
      [
        {
          // Missing required 'name' and 'condition' fields
          action: { formatter: "prettier --stdin-filepath ${filePath}" },
        },
      ],
      vscode.ConfigurationTarget.Workspace,
    );
    const fallbackConfig = getConfig();
    assert.deepEqual(fallbackConfig.rules, []);
  });
});
