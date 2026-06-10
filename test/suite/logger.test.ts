import * as assert from "assert";
import * as vscode from "vscode";
import { suite, teardown, test } from "mocha";

import { Logger } from "../../src/logger";

suite("Logger", () => {
  test("creates without error", () => {
    assert.ok(Logger.instance);
  });

  test("debug/info/warn/error do not throw", () => {
    assert.doesNotThrow(() => Logger.debug("debug message"));
    assert.doesNotThrow(() => Logger.info("info message"));
    assert.doesNotThrow(() => Logger.warn("warn message"));
    assert.doesNotThrow(() => Logger.error("error message"));
  });

  test("error with Error object do not throw", () => {
    const err = new Error("test error");
    assert.doesNotThrow(() => Logger.error("error with context", err));
  });

  test("log with context object does not throw", () => {
    assert.doesNotThrow(() => Logger.info("with context", { key: "value", num: 42 }));
  });

  test("show does not throw", () => {
    assert.doesNotThrow(() => Logger.show());
  });
});
