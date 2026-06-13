import * as assert from "node:assert";

import { describe, test } from "mocha";

import { registerLsp } from "../../src/lsp";

describe("registerLsp", () => {
  test("register and dispose does work", async () => {
    const lsp = await registerLsp(["javascript"], "echo hello");
    assert.ok(lsp);
    assert.doesNotThrow(() => {
      lsp.dispose();
    });
  });
});
