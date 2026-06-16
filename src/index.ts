import * as vscode from "vscode";

import { ToolManager } from "./tool-manager";
import { Logger } from "./logger";

export async function activate(context: vscode.ExtensionContext) {
  Logger.info("Activating...");

  const toolManager = new ToolManager();
  await toolManager.syncRules();
  await toolManager.syncServices();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration("customLanguageTools.rules")) {
        Logger.debug("onDidChangeConfiguration start");
        await toolManager.syncRules();
        await toolManager.syncServices();
        Logger.debug("onDidChangeConfiguration end");
      }
    }),
    vscode.workspace.onDidOpenTextDocument(async (_event) => {
      Logger.debug("onDidOpenTextDocument start");
      await toolManager.syncServices();
      Logger.debug("onDidOpenTextDocument end");
    }),
    vscode.workspace.onDidSaveTextDocument(async (_event) => {
      Logger.debug("onDidOpenTextDocument start");
      await toolManager.syncServices();
      Logger.debug("onDidOpenTextDocument end");
    }),
    vscode.commands.registerCommand("customLanguageTools.restartAll", async () => {
      await toolManager.unregisterAll();
      await toolManager.syncRules();
      await toolManager.syncServices();
    }),
    new vscode.Disposable(async () => {
      await toolManager.unregisterAll();
    }),
  );

  Logger.info("Activated");
}
