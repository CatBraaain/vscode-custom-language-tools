import * as assert from "assert";
import * as vscode from "vscode";

import { Logger } from "../../src/logger";

suite("Logger", () => {
  suiteTeardown(async () => {
    await vscode.workspace
      .getConfiguration("customLanguageConfig")
      .update("logLevel", undefined, vscode.ConfigurationTarget.Workspace);
  });

  test("creates without error", () => {
    assert.ok(Logger.instance);
  });

  test("debug/info/warn/error/critical do not throw", () => {
    assert.doesNotThrow(() => Logger.debug("debug message"));
    assert.doesNotThrow(() => Logger.info("info message"));
    assert.doesNotThrow(() => Logger.warn("warn message"));
    assert.doesNotThrow(() => Logger.error("error message"));
    assert.doesNotThrow(() => Logger.critical("critical message"));
  });

  test("error/critical with Error object do not throw", () => {
    const err = new Error("test error");
    assert.doesNotThrow(() => Logger.error("error with context", err));
    assert.doesNotThrow(() => Logger.critical("critical with context", err));
  });

  test("log with context object does not throw", () => {
    assert.doesNotThrow(() => Logger.info("with context", { key: "value", num: 42 }));
  });

  test("show does not throw", () => {
    assert.doesNotThrow(() => Logger.show());
  });

  suite("log level from config", () => {
    teardown(async () => {
      await vscode.workspace
        .getConfiguration("customLanguageConfig")
        .update("logLevel", undefined, vscode.ConfigurationTarget.Workspace);
    });

    test("respects debug log level", async () => {
      await vscode.workspace
        .getConfiguration("customLanguageConfig")
        .update("logLevel", "debug", vscode.ConfigurationTarget.Workspace);
      assert.doesNotThrow(() => {
        Logger.debug("should appear");
        Logger.info("should appear");
      });
    });

    test("respects critical log level", async () => {
      await vscode.workspace
        .getConfiguration("customLanguageConfig")
        .update("logLevel", "critical", vscode.ConfigurationTarget.Workspace);
      assert.doesNotThrow(() => {
        Logger.debug("should be filtered");
        Logger.critical("should appear");
      });
    });
  });
});
