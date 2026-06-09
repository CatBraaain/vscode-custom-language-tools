import * as assert from "assert";
import * as vscode from "vscode";
import { suite, teardown, test } from "mocha";

import { registerFormatter } from "../../src/formatter";

suite("registerFormatter", () => {
  const disposables: vscode.Disposable[] = [];

  teardown(() => {
    disposables.forEach((d) => d.dispose());
    disposables.length = 0;
  });

  test("registers formatter and returns Disposable", () => {
    const disposable = registerFormatter("javascript", "prettier --write");
    disposables.push(disposable);
    assert.ok(disposable);
    assert.ok(typeof disposable.dispose === "function");
  });

  test("dispose cleans up without error", () => {
    const disposable = registerFormatter("javascript", "prettier --write");
    assert.doesNotThrow(() => disposable.dispose());
  });

  test("registers command with ${filePath} variable", () => {
    const disposable = registerFormatter("typescript", 'prettier --write "${filePath}"');
    disposables.push(disposable);
    assert.ok(disposable);
  });
});
