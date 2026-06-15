import * as vscode from "vscode";

import { ToolManager } from "./tool-manager";
import { Logger } from "./logger";

export async function activate(context: vscode.ExtensionContext) {
  Logger.info("Activating Custom Language Tools extension...");

  const toolManager = new ToolManager();
  await toolManager.syncRules();
  await toolManager.syncServices();

  Logger.info("Custom Language Tools extension activated");
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration("customLanguageTools.rules")) {
        await toolManager.syncRules();
        await toolManager.syncServices();
      }
    }),
    vscode.workspace.onDidOpenTextDocument(async (_event) => {
      await toolManager.syncServices();
    }),
    vscode.workspace.onDidSaveTextDocument(async (_event) => {
      await toolManager.syncServices();
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

  Logger.info("Custom Language Tools extension activated");
}
