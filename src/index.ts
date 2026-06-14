import * as vscode from "vscode";

import { getMatchedRules } from "./config";
import { registerFormatter } from "./formatter";
import { Logger } from "./logger";
import { registerLsp } from "./lsp";

export async function activate(context: vscode.ExtensionContext) {
  Logger.info("Activating Custom Language Tools extension...");

  let registrations: vscode.Disposable[] = [];

  registrations = await registerCustomLanguageConfig();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration("customLanguageTools.rules")) {
        registrations.forEach((e) => e.dispose());
        registrations = await registerCustomLanguageConfig();
      }
    }),
    vscode.commands.registerCommand("customLanguageTools.restartAll", async () => {
      registrations.forEach((e) => e.dispose());
      registrations = await registerCustomLanguageConfig();
    }),
    new vscode.Disposable(() => {
      registrations.forEach((e) => e.dispose());
    }),
  );

  Logger.info("Custom Language Tools extension activated");
}

async function registerCustomLanguageConfig(): Promise<vscode.Disposable[]> {
  const disposables: vscode.Disposable[] = [];
  for (const rule of await getMatchedRules()) {
    const documentSelector = rule.condition.documentSelector;
    if (rule.action.lsp) {
      disposables.push(await registerLsp(documentSelector, rule.action.lsp, rule.name));
    }
    if (rule.action.formatter) {
      disposables.push(registerFormatter(documentSelector, rule.action.formatter, rule.name));
    }
  }
  return disposables;
}
