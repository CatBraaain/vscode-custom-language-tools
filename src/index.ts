import * as vscode from "vscode";

// import { registerLangProps } from "./language";
import { registerLsp } from "./lsp";
import { getMatchedRules } from "./config";
import { registerFormatter } from "./formatter";
import { logger } from "./logger";

export async function activate(context: vscode.ExtensionContext) {
  logger.info("Activating Unified Language Config extension...");

  let registrations: vscode.Disposable[] = [];

  registrations = await registerCustomLanguageConfig();
  vscode.workspace.onDidChangeConfiguration(async () => {
    registrations.forEach((e) => e.dispose());
    registrations = await registerCustomLanguageConfig();
  });

  context.subscriptions.push(
    new vscode.Disposable(() => {
      registrations.forEach((e) => e.dispose());
    }),
  );

  logger.info("Unified Language Config extension activated");
}

async function registerCustomLanguageConfig(): Promise<vscode.Disposable[]> {
  const disposables: vscode.Disposable[] = [];
  for (const rule of await getMatchedRules()) {
    for (const lang of rule.when.langs ?? []) {
      if (rule.use.lsp) {
        rule.use.lsp.forEach(async (e) => {
          disposables.push(await registerLsp(lang, e));
        });
      }
      if (rule.use.formatter) {
        rule.use.formatter.forEach((e) => {
          disposables.push(registerFormatter(lang, e));
        });
      }
      // if (rule.use.langProps) {
      //   // disposables.push(registerLangProps(lang, rule.use.langProps));
      //   await registerLangProps(lang, rule.use.langProps ?? {});
      // }
    }
  }
  return disposables;
}
