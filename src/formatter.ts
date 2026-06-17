import { execa } from "execa";
import * as vscode from "vscode";

import { Logger } from "./logger";
import { ToolManager } from "./tool-manager";

export function registerFormatter(
  document: vscode.DocumentSelector,
  toolManager: ToolManager,
): vscode.Disposable {
  Logger.debug("Formatter registering");
  const fullDisposable = registerFullFormatter(document, toolManager);
  const rangeDisposable = registerRangeFormatter(document, toolManager);
  Logger.debug("Formatter registered");

  return new vscode.Disposable(() => {
    Logger.debug("Formatter unregistering");
    fullDisposable.dispose();
    rangeDisposable.dispose();
    Logger.debug("Formatter unregistered");
  });
}

function registerFullFormatter(
  document: vscode.DocumentSelector,
  toolManager: ToolManager,
): vscode.Disposable {
  return vscode.languages.registerDocumentFormattingEditProvider(document, {
    provideDocumentFormattingEdits(
      document: vscode.TextDocument,
      _options: vscode.FormattingOptions,
      token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.TextEdit[]> {
      return formatDocument(toolManager, document, undefined, token);
    },
  } satisfies vscode.DocumentFormattingEditProvider);
}

function registerRangeFormatter(
  document: vscode.DocumentSelector,
  toolManager: ToolManager,
): vscode.Disposable {
  return vscode.languages.registerDocumentRangeFormattingEditProvider(document, {
    provideDocumentRangeFormattingEdits(
      document: vscode.TextDocument,
      range: vscode.Range,
      _options: vscode.FormattingOptions,
      token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.TextEdit[]> {
      return formatDocument(toolManager, document, range, token);
    },
  } satisfies vscode.DocumentRangeFormattingEditProvider);
}

async function formatDocument(
  toolManager: ToolManager,
  document: vscode.TextDocument,
  range: vscode.Range | undefined,
  _token: vscode.CancellationToken,
): Promise<vscode.TextEdit[]> {
  const matchedRules = toolManager.ruleContexts
    .filter(
      (ctx) =>
        ctx.conditionMatched &&
        ctx.rule.action.formatter &&
        vscode.languages.match(ctx.rule.document, document),
    )
    .map((ctx) => ctx.rule);

  Logger.debug(`Matched formatter rules: [${matchedRules.map((r) => r.name).join(", ")}]`);

  const commands = matchedRules.flatMap((rule) =>
    rule.action.formatter!.map((formatter) => formatter.replace("${filePath}", document.fileName)),
  );
  // when edit files outside of workspace, use the first workspace
  const cwd =
    vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath ??
    vscode.workspace.workspaceFolders?.at(0)?.uri.fsPath;

  Logger.info("Format");
  Logger.info(`  commands: [${commands.join(", ")}]`);
  Logger.info(`  cwd: ${cwd}`);
  let currentText = document.getText(range);
  for (const command of commands) {
    const res = await execa({
      input: currentText,
      shell: true,
      cwd,
      reject: false,
      stripFinalNewline: false,
    })`${command}`;

    if (res.exitCode === 0) {
      currentText = res.stdout;
      continue;
    } else {
      Logger.warn(
        `Formatter failed (${command}): ${JSON.stringify({ exitCode: res.exitCode, stderr: res.stderr })}`,
      );
      break;
    }
  }

  const targetRange =
    range ?? document.validateRange(new vscode.Range(0, 0, document.lineCount, 0));
  return [vscode.TextEdit.replace(targetRange, currentText)];
}
