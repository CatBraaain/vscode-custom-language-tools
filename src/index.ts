import * as vscode from "vscode";

import { Logger } from "./logger";
import { ToolManager } from "./tool-manager";

export async function activate(context: vscode.ExtensionContext) {
  Logger.info("Activating...");

  const toolManager = new ToolManager();
  toolManager.syncRules();
  await toolManager.syncServices();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration("customLanguageTools.rules")) {
        Logger.debug("onDidChangeConfiguration start");
        toolManager.syncRules();
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
      Logger.debug("onDidSaveTextDocument start");
      await toolManager.syncServices();
      Logger.debug("onDidSaveTextDocument end");
    }),
    vscode.commands.registerCommand("customLanguageTools.restartAll", async () => {
      await toolManager.unregisterAll();
      toolManager.syncRules();
      await toolManager.syncServices();
    }),
    new vscode.Disposable(async () => {
      await toolManager.unregisterAll();
    }),
  );

  Logger.info("Activated");
}
