import { execa } from "execa";

import * as vscode from "vscode";

import { Logger } from "./logger";

export function registerFormatter(
  langs: string[],
  command: string,
  ruleName: string,
): vscode.Disposable {
  Logger.debug(`${ruleName} - Formatter registering`);
  const fullDisposable = registerFullFormatter(langs, command);
  const rangeDisposable = registerRangeFormatter(langs, command);
  Logger.debug(`${ruleName} - Formatter registered`);

  return new vscode.Disposable(() => {
    Logger.debug(`${ruleName} - Formatter unregistering`);
    fullDisposable.dispose();
    rangeDisposable.dispose();
    Logger.debug(`${ruleName} - Formatter unregistered`);
  });
}

function registerFullFormatter(langs: string[], command: string): vscode.Disposable {
  return vscode.languages.registerDocumentFormattingEditProvider(langs, {
    provideDocumentFormattingEdits(
      document: vscode.TextDocument,
      _options: vscode.FormattingOptions,
      token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.TextEdit[]> {
      return formatDocument(document, command, undefined, token);
    },
  } satisfies vscode.DocumentFormattingEditProvider);
}

function registerRangeFormatter(langs: string[], command: string): vscode.Disposable {
  return vscode.languages.registerDocumentRangeFormattingEditProvider(langs, {
    provideDocumentRangeFormattingEdits(
      document: vscode.TextDocument,
      range: vscode.Range,
      _options: vscode.FormattingOptions,
      token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.TextEdit[]> {
      return formatDocument(document, command, range, token);
    },
  } satisfies vscode.DocumentRangeFormattingEditProvider);
}

async function formatDocument(
  document: vscode.TextDocument,
  command: string,
  range: vscode.Range | undefined,
  _token: vscode.CancellationToken,
): Promise<vscode.TextEdit[]> {
  const resolvedCommand = command.replace("${filePath}", document.fileName);
  const res = await execa({
    input: document.getText(range),
    shell: true,
    reject: false,
  })`${resolvedCommand}`;

  if (res.exitCode !== 0) {
    Logger.warn(
      `Formatter failed (${resolvedCommand}): ${JSON.stringify({ exitCode: res.exitCode, stderr: res.stderr })}`,
    );
    return [];
  } else {
    const targetRange =
      range ?? document.validateRange(new vscode.Range(0, 0, document.lineCount, 0));
    return [vscode.TextEdit.replace(targetRange, res.stdout)];
  }
}
