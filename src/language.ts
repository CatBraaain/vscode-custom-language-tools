import * as vscode from "vscode";

import { LangConfig } from "./config";

export async function registerLangConfig(
  langId: string,
  langConfig: LangConfig,
): Promise<vscode.Disposable> {
  return vscode.languages.setLanguageConfiguration(langId, langConfig);
}
