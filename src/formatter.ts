import { execa } from "execa";
import * as vscode from "vscode";
import type {
  LanguageClient,
  DocumentFormattingParams,
  DocumentRangeFormattingParams,
} from "vscode-languageclient/node";
import {
  DocumentFormattingRequest,
  DocumentRangeFormattingRequest,
} from "vscode-languageclient/node";

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
      options: vscode.FormattingOptions,
      token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.TextEdit[]> {
      return formatDocument(toolManager, document, undefined, options, token);
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
      options: vscode.FormattingOptions,
      token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.TextEdit[]> {
      return formatDocument(toolManager, document, range, options, token);
    },
  } satisfies vscode.DocumentRangeFormattingEditProvider);
}

async function formatDocument(
  toolManager: ToolManager,
  document: vscode.TextDocument,
  range: vscode.Range | undefined,
  options: vscode.FormattingOptions,
  token: vscode.CancellationToken,
): Promise<vscode.TextEdit[]> {
  Logger.info("Format...");
  const editor = vscode.window.visibleTextEditors.find((editor) => editor.document === document);
  if (editor) {
    const lspContexts = toolManager.ruleContexts.filter(
      (ctx) => ctx.lspClients && vscode.languages.match(ctx.rule.document, document),
    );
    for (const ctx of lspContexts) {
      for (const client of ctx.lspClients!) {
        const edits = await formatWithLsp(client, document, options, range, token);
        await editor.edit((builder) => {
          for (const edit of edits) {
            builder.replace(edit.range, edit.newText);
          }
        });
      }
    }
  }

  const targetRange =
    range ?? document.validateRange(new vscode.Range(0, 0, document.lineCount, 0));
  const newText = await formatWithCommands(toolManager, document, document.getText(range));
  Logger.info("Format finished");
  return [vscode.TextEdit.replace(targetRange, newText)];
}

async function formatWithLsp(
  client: LanguageClient,
  document: vscode.TextDocument,
  options: vscode.FormattingOptions,
  range: vscode.Range | undefined,
  token: vscode.CancellationToken,
): Promise<vscode.TextEdit[]> {
  Logger.info("Requesting LSP formatting...");

  const response = await client.sendRequest<vscode.TextEdit[] | null>(
    range ? DocumentRangeFormattingRequest.method : DocumentFormattingRequest.method,
    {
      textDocument: { uri: document.uri.toString() },
      range,
      options: {
        tabSize: options.tabSize,
        insertSpaces: options.insertSpaces,
      },
    } satisfies DocumentFormattingParams | DocumentRangeFormattingParams,
    token,
  );

  if (!response) {
    Logger.warn("LSP returned no formatting edits");
    return [];
  }

  Logger.debug(`LSP returned ${response.length} edit(s)`);
  return response.map(
    (edit) =>
      new vscode.TextEdit(
        new vscode.Range(
          new vscode.Position(edit.range.start.line, edit.range.start.character),
          new vscode.Position(edit.range.end.line, edit.range.end.character),
        ),
        edit.newText,
      ),
  );
}

async function formatWithCommands(
  toolManager: ToolManager,
  document: vscode.TextDocument,
  currentText: string,
): Promise<string> {
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
    } else {
      Logger.warn(
        `Formatter failed (${command}): ${JSON.stringify({ exitCode: res.exitCode, stderr: res.stderr })}`,
      );
      break;
    }
  }

  return currentText;
}
