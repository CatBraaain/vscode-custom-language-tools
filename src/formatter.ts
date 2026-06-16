import { execa } from "execa";
import * as vscode from "vscode";

import { Logger } from "./logger";

export function registerFormatter(
  document: vscode.DocumentSelector,
  command: string,
  ruleName: string,
): vscode.Disposable {
  Logger.debug(`${ruleName} - Formatter registering`);
  const fullDisposable = registerFullFormatter(document, command);
  const rangeDisposable = registerRangeFormatter(document, command);
  Logger.debug(`${ruleName} - Formatter registered`);

  return new vscode.Disposable(() => {
    Logger.debug(`${ruleName} - Formatter unregistering`);
    fullDisposable.dispose();
    rangeDisposable.dispose();
    Logger.debug(`${ruleName} - Formatter unregistered`);
  });
}

function registerFullFormatter(
  document: vscode.DocumentSelector,
  command: string,
): vscode.Disposable {
  return vscode.languages.registerDocumentFormattingEditProvider(document, {
    provideDocumentFormattingEdits(
      document: vscode.TextDocument,
      _options: vscode.FormattingOptions,
      token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.TextEdit[]> {
      return formatDocument(document, command, undefined, token);
    },
  } satisfies vscode.DocumentFormattingEditProvider);
}

function registerRangeFormatter(
  document: vscode.DocumentSelector,
  command: string,
): vscode.Disposable {
  return vscode.languages.registerDocumentRangeFormattingEditProvider(document, {
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
  // when edit files outside of workspace, use the first workspace
  const cwd =
    vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath ??
    vscode.workspace.workspaceFolders?.at(0)?.uri.fsPath;
  const res = await execa({
    input: document.getText(range),
    shell: true,
    cwd,
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
