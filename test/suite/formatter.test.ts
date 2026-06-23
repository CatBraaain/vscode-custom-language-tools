import * as assert from "node:assert";

import { describe, test } from "mocha";

import { registerFormatter } from "../../src/formatter";
import { ToolManager } from "../../src/tool-manager";

describe("registerFormatter", () => {
  test("register and dispose does work", () => {
    const toolManager = new ToolManager();
    const formatter = registerFormatter(["javascript"], toolManager);
    assert.ok(formatter);
    assert.doesNotThrow(() => {
      formatter.dispose();
    });
  });
});
