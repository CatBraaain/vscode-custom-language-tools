import { execFile } from "node:child_process";

import { parseArgsStringToArgv } from "string-argv";
import * as vscode from "vscode";

import { DocumentSelector } from "./config-schema";
import { Logger } from "./logger";

export function registerFormatter(
  documentSelector: DocumentSelector,
  command: string,
): vscode.Disposable {
  const [cmd, ...args] = parseArgsStringToArgv(command);

  Logger.info(`Formatter registering\n${JSON.stringify({ documentSelector, command })}`);
  const fullDisposable = registerFullFormatter(documentSelector, cmd, args);
  const rangeDisposable = registerRangeFormatter(documentSelector, cmd, args);
  Logger.info(`Formatter registered\n${JSON.stringify({ documentSelector, command })}`);

  return new vscode.Disposable(() => {
    Logger.info(`Formatter unregistering\n${JSON.stringify({ documentSelector, command })}`);
    fullDisposable.dispose();
    rangeDisposable.dispose();
    Logger.info(`Formatter unregistered\n${JSON.stringify({ documentSelector, command })}`);
  });
}

function registerFullFormatter(
  documentSelector: DocumentSelector,
  cmd: string,
  args: string[],
): vscode.Disposable {
  return vscode.languages.registerDocumentFormattingEditProvider(documentSelector, {
    provideDocumentFormattingEdits(
      document: vscode.TextDocument,
      _options: vscode.FormattingOptions,
      token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.TextEdit[]> {
      return formatDocument(document, cmd, args, undefined, token);
    },
  } satisfies vscode.DocumentFormattingEditProvider);
}

function registerRangeFormatter(
  documentSelector: DocumentSelector,
  cmd: string,
  args: string[],
): vscode.Disposable {
  return vscode.languages.registerDocumentRangeFormattingEditProvider(documentSelector, {
    provideDocumentRangeFormattingEdits(
      document: vscode.TextDocument,
      range: vscode.Range,
      _options: vscode.FormattingOptions,
      token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.TextEdit[]> {
      return formatDocument(document, cmd, args, range, token);
    },
  } satisfies vscode.DocumentRangeFormattingEditProvider);
}

function formatDocument(
  document: vscode.TextDocument,
  cmd: string,
  args: string[],
  range: vscode.Range | undefined,
  token: vscode.CancellationToken,
): Promise<vscode.TextEdit[]> {
  return new Promise<vscode.TextEdit[]>((resolve) => {
    const child = execFile(
      cmd,
      args.map((arg) => arg.replace("${filePath}", document.fileName)),
      {
        maxBuffer: 10 * 1024 * 1024, // 10MB
        timeout: 3_000,
        encoding: "utf8",
      },
      (error, stdout, stderr) => {
        if (token.isCancellationRequested) {
          Logger.debug(`Formatter cancelled (${cmd})`);
          resolve([]);
          return;
        }
        if (error) {
          Logger.error(`Formatter error (${cmd}): ${error.message}`);
          resolve([]);
          return;
        }
        if (stderr) {
          Logger.warn(`Formatter stderr (${cmd}): ${stderr}`);
        }

        const targetRange =
          range ?? document.validateRange(new vscode.Range(0, 0, document.lineCount, 0));
        resolve([vscode.TextEdit.replace(targetRange, stdout)]);
      },
    );

    child.stdin?.end(document.getText(range));

    token.onCancellationRequested(() => {
      child.kill();
    });
  });
}
