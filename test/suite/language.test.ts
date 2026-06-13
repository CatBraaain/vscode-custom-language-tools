import * as assert from "node:assert";

import { describe, test } from "mocha";

import { registerLangConfig } from "../../src/language";

describe("registerLangConfig", () => {
  test("register and dispose does work", async () => {
    const langConfig = await registerLangConfig(["javascript"], {
      comments: { lineComment: "//" },
    });
    assert.ok(langConfig);
    assert.doesNotThrow(() => {
      langConfig.dispose();
    });
  });
});
