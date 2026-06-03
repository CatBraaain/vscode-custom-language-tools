import { execFile } from "node:child_process";

import { parseArgsStringToArgv } from "string-argv";
import * as vscode from "vscode";

import { logger } from "./logger";

export function registerFormatter(lang: string, command: string): vscode.Disposable {
  const [cmd, ...args] = parseArgsStringToArgv(command);

  const fullDisposable = registerFullFormatter(lang, cmd, args);
  const rangeDisposable = registerRangeFormatter(lang, cmd, args);

  return new vscode.Disposable(() => {
    fullDisposable.dispose();
    rangeDisposable.dispose();
  });
}

function registerFullFormatter(lang: string, cmd: string, args: string[]): vscode.Disposable {
  return vscode.languages.registerDocumentFormattingEditProvider(lang, {
    provideDocumentFormattingEdits(
      document: vscode.TextDocument,
      _options: vscode.FormattingOptions,
      token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.TextEdit[]> {
      return formatDocument(document, cmd, args, undefined, token);
    },
  } satisfies vscode.DocumentFormattingEditProvider);
}

function registerRangeFormatter(lang: string, cmd: string, args: string[]): vscode.Disposable {
  return vscode.languages.registerDocumentRangeFormattingEditProvider(lang, {
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
          logger.debug(`Formatter cancelled (${cmd})`);
          resolve([]);
          return;
        }
        if (error) {
          logger.error(`Formatter error (${cmd}): ${error.message}`);
          resolve([]);
          return;
        }
        if (stderr) {
          logger.warn(`Formatter stderr (${cmd}): ${stderr}`);
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
