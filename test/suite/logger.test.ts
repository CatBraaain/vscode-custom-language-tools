import * as assert from "assert";
import { describe, test } from "mocha";

import { Logger } from "../../src/logger";

describe("Logger", () => {
  test("debug/info/warn/error does work", () => {
    assert.doesNotThrow(() => Logger.debug("debug message"));
    assert.doesNotThrow(() => Logger.info("info message"));
    assert.doesNotThrow(() => Logger.warn("warn message"));
    assert.doesNotThrow(() => Logger.error("error message"));
    assert.doesNotThrow(() => Logger.show());
  });
});
