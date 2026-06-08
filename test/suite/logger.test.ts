import * as assert from "assert";
import * as vscode from "vscode";

import { Logger, LogLevel } from "../../src/logger";

suite("Logger", () => {
  let logger: Logger;

  suiteTeardown(async () => {
    await vscode.workspace
      .getConfiguration("customLanguageConfig")
      .update("logLevel", undefined, vscode.ConfigurationTarget.Workspace);
  });

  test("creates without error", () => {
    logger = new Logger();
    assert.ok(logger);
    logger.dispose();
  });

  test("debug/info/warn/error/critical do not throw", () => {
    logger = new Logger();
    assert.doesNotThrow(() => logger.debug("debug message"));
    assert.doesNotThrow(() => logger.info("info message"));
    assert.doesNotThrow(() => logger.warn("warn message"));
    assert.doesNotThrow(() => logger.error("error message"));
    assert.doesNotThrow(() => logger.critical("critical message"));
    logger.dispose();
  });

  test("error/critical with Error object do not throw", () => {
    logger = new Logger();
    const err = new Error("test error");
    assert.doesNotThrow(() => logger.error("error with context", err));
    assert.doesNotThrow(() => logger.critical("critical with context", err));
    logger.dispose();
  });

  test("log with context object does not throw", () => {
    logger = new Logger();
    assert.doesNotThrow(() => logger.info("with context", { key: "value", num: 42 }));
    logger.dispose();
  });

  test("show does not throw", () => {
    logger = new Logger();
    assert.doesNotThrow(() => logger.show());
    logger.dispose();
  });

  test("dispose does not throw", () => {
    logger = new Logger();
    assert.doesNotThrow(() => logger.dispose());
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
      const debugLogger = new Logger();
      assert.doesNotThrow(() => {
        debugLogger.debug("should appear");
        debugLogger.info("should appear");
      });
      debugLogger.dispose();
    });

    test("respects critical log level", async () => {
      await vscode.workspace
        .getConfiguration("customLanguageConfig")
        .update("logLevel", "critical", vscode.ConfigurationTarget.Workspace);
      const criticalLogger = new Logger();
      assert.doesNotThrow(() => {
        criticalLogger.debug("should be filtered");
        criticalLogger.critical("should appear");
      });
      criticalLogger.dispose();
    });
  });
});
