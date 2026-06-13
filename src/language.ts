import * as vscode from "vscode";

import { LangConfig } from "./config-schema";
import { Logger } from "./logger";

export async function registerLangConfig(
  langs: string[],
  langConfig: LangConfig,
): Promise<vscode.Disposable> {
  Logger.info(`Property registering\n${JSON.stringify({ langs, langConfig })}`);
  const disposables = langs.map((lang) =>
    vscode.languages.setLanguageConfiguration(lang, langConfig),
  );
  Logger.info(`Property registered\n${JSON.stringify({ langs, langConfig })}`);

  return new vscode.Disposable(() => {
    Logger.info(`Property unregistering\n${JSON.stringify({ langs, langConfig })}`);
    disposables.forEach((d) => d.dispose());
    Logger.info(`Property unregistered\n${JSON.stringify({ langs, langConfig })}`);
  });
}
