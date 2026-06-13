import * as vscode from "vscode";

import { DocumentSelector, LangConfig } from "./config-schema";
import { Logger } from "./logger";

export async function registerLangConfig(
  documentSelector: DocumentSelector,
  langConfig: LangConfig,
): Promise<vscode.Disposable> {
  Logger.info(`Property registering\n${JSON.stringify({ documentSelector, langConfig })}`);

  const items = Array.isArray(documentSelector) ? documentSelector : [documentSelector];
  const langs = items
    .map((e) => (typeof e === "string" ? e : e?.language))
    .filter((lang): lang is string => !!lang);
  const disposables = langs.map((lang) =>
    vscode.languages.setLanguageConfiguration(lang, langConfig),
  );
  Logger.info(`Property registered\n${JSON.stringify({ documentSelector, langConfig })}`);

  return new vscode.Disposable(() => {
    Logger.info(`Property unregistering\n${JSON.stringify({ documentSelector, langConfig })}`);
    disposables.forEach((d) => d.dispose());
    Logger.info(`Property unregistered\n${JSON.stringify({ documentSelector, langConfig })}`);
  });
}
