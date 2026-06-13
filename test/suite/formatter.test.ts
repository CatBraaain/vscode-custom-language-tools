import * as assert from "node:assert";

import { describe, test } from "mocha";

import { registerFormatter } from "../../src/formatter";

describe("registerFormatter", () => {
  test("register and dispose does work", () => {
    const formatter = registerFormatter(["javascript"], "prettier --write");
    assert.ok(formatter);
    assert.doesNotThrow(() => {
      formatter.dispose();
    });
  });
});
