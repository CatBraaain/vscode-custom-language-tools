import * as vscode from "vscode";

import { getMatchedRules } from "./config";
import { registerFormatter } from "./formatter";
import { registerLangConfig } from "./language";
import { Logger } from "./logger";
import { registerLsp } from "./lsp";

export async function activate(context: vscode.ExtensionContext) {
  Logger.info("Activating Custom Language Config extension...");

  let registrations: vscode.Disposable[] = [];

  registrations = await registerCustomLanguageConfig();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration("customLanguageConfig.rules")) {
        registrations.forEach((e) => e.dispose());
        registrations = await registerCustomLanguageConfig();
      }
    }),
    vscode.commands.registerCommand("customLanguageConfig.restartAll", async () => {
      registrations.forEach((e) => e.dispose());
      registrations = await registerCustomLanguageConfig();
    }),
    new vscode.Disposable(() => {
      registrations.forEach((e) => e.dispose());
    }),
  );

  Logger.info("Custom Language Config extension activated");
}

async function registerCustomLanguageConfig(): Promise<vscode.Disposable[]> {
  const disposables: vscode.Disposable[] = [];
  for (const rule of await getMatchedRules()) {
    const langs = rule.when.langs ?? [];
    if (rule.use.lsp) {
      rule.use.lsp.forEach(async (e) => {
        disposables.push(await registerLsp(langs, e));
      });
    }
    if (rule.use.formatter) {
      rule.use.formatter.forEach((e) => {
        disposables.push(registerFormatter(langs, e));
      });
    }
    if (rule.use.langConfig) {
      disposables.push(await registerLangConfig(langs, rule.use.langConfig));
    }
  }
  return disposables;
}
