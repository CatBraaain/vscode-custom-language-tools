import * as vscode from "vscode";

import { LangConfig } from "./config-schema";

export async function registerLangConfig(
  langs: string[],
  langConfig: LangConfig,
): Promise<vscode.Disposable> {
  const disposables = langs.map((lang) =>
    vscode.languages.setLanguageConfiguration(lang, langConfig),
  );
  return new vscode.Disposable(() => {
    disposables.forEach((d) => d.dispose());
  });
}
