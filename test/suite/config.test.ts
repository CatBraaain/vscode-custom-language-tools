import * as assert from "assert";
import * as vscode from "vscode";

import { getMatchedRules } from "../../src/config";

suite("getMatchedRules", () => {
  const cfg = () => vscode.workspace.getConfiguration("customLanguageConfig");

  teardown(async () => {
    await cfg().update("rules", undefined, vscode.ConfigurationTarget.Workspace);
  });

  test("returns empty array when rules not set", async () => {
    await cfg().update("rules", undefined, vscode.ConfigurationTarget.Workspace);
    const result = await getMatchedRules();
    assert.deepStrictEqual(result, []);
  });

  test("returns empty array when rules is empty", async () => {
    await cfg().update("rules", [], vscode.ConfigurationTarget.Workspace);
    const result = await getMatchedRules();
    assert.deepStrictEqual(result, []);
  });

  test("rule without required matches all", async () => {
    await cfg().update(
      "rules",
      [
        {
          when: { langs: ["javascript"] },
          use: { formatter: ["prettier --write"] },
        },
      ],
      vscode.ConfigurationTarget.Workspace,
    );
    const result = await getMatchedRules();
    assert.strictEqual(result.length, 1);
    assert.deepStrictEqual(result[0].when.langs, ["javascript"]);
  });

  test("rule with unmatched required.file is excluded", async () => {
    await cfg().update(
      "rules",
      [
        {
          when: {
            langs: ["javascript"],
            required: { file: "nonexistent-file-xyz\\.json" },
          },
          use: { formatter: ["prettier"] },
        },
      ],
      vscode.ConfigurationTarget.Workspace,
    );
    const result = await getMatchedRules();
    assert.strictEqual(result.length, 0);
  });

  test("rule with matched required.file is included", async () => {
    await cfg().update(
      "rules",
      [
        {
          when: {
            langs: ["javascript"],
            required: { file: "package\\.json" },
          },
          use: { formatter: ["prettier"] },
        },
      ],
      vscode.ConfigurationTarget.Workspace,
    );
    const result = await getMatchedRules();
    assert.strictEqual(result.length, 1);
  });

  test("rule with file + contains match is included", async () => {
    await cfg().update(
      "rules",
      [
        {
          when: {
            langs: ["json"],
            required: { file: "package\\.json", contains: '"name"' },
          },
          use: { formatter: ["prettier"] },
        },
      ],
      vscode.ConfigurationTarget.Workspace,
    );
    const result = await getMatchedRules();
    assert.strictEqual(result.length, 1);
  });

  test("rule with file match but contains mismatch is excluded", async () => {
    await cfg().update(
      "rules",
      [
        {
          when: {
            langs: ["json"],
            required: { file: "package\\.json", contains: "NONEXISTENT_PATTERN_XYZ" },
          },
          use: { formatter: ["prettier"] },
        },
      ],
      vscode.ConfigurationTarget.Workspace,
    );
    const result = await getMatchedRules();
    assert.strictEqual(result.length, 0);
  });

  test("mixed rules: some match, some excluded", async () => {
    await cfg().update(
      "rules",
      [
        {
          when: { langs: ["javascript"] },
          use: { formatter: ["prettier"] },
        },
        {
          when: {
            langs: ["python"],
            required: { file: "nonexistent-file\\.py" },
          },
          use: { formatter: ["black"] },
        },
        {
          when: {
            langs: ["json"],
            required: { file: "package\\.json" },
          },
          use: { formatter: ["fixjson"] },
        },
      ],
      vscode.ConfigurationTarget.Workspace,
    );
    const result = await getMatchedRules();
    assert.strictEqual(result.length, 2);
    const langs = result.map((r) => r.when.langs).sort();
    assert.deepStrictEqual(langs, [["javascript"], ["json"]]);
  });

  test("regex escape in file pattern is accurate", async () => {
    await cfg().update(
      "rules",
      [
        {
          when: {
            langs: ["json"],
            required: { file: "package\\.json" },
          },
          use: { formatter: ["prettier"] },
        },
      ],
      vscode.ConfigurationTarget.Workspace,
    );
    const result = await getMatchedRules();
    assert.strictEqual(result.length, 1);
  });
});
