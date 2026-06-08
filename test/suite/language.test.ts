import * as assert from "assert";
import * as vscode from "vscode";

import { registerLangConfig } from "../../src/language";

suite("registerLangConfig", () => {
  const disposables: vscode.Disposable[] = [];

  teardown(() => {
    disposables.forEach((d) => d.dispose());
    disposables.length = 0;
  });

  test("registers language config and returns Disposable", async () => {
    const disposable = await registerLangConfig("javascript", {
      comments: { lineComment: "//" },
    });
    disposables.push(disposable);
    assert.ok(disposable);
    assert.ok(typeof disposable.dispose === "function");
  });

  test("dispose cleans up without error", async () => {
    const disposable = await registerLangConfig("javascript", {
      comments: { lineComment: "//" },
    });
    assert.doesNotThrow(() => disposable.dispose());
  });

  test("registers comments + brackets + autoClosingPairs", async () => {
    const disposable = await registerLangConfig("typescript", {
      comments: { lineComment: "//", blockComment: ["/*", "*/"] },
      brackets: [
        ["(", ")"],
        ["[", "]"],
      ],
      autoClosingPairs: [
        { open: "{", close: "}" },
        { open: '"', close: '"' },
      ],
    });
    disposables.push(disposable);
    assert.ok(disposable);
  });
});
