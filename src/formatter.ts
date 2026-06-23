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
      const formatter = new DocumentFormatter(toolManager, document, options, token);
      return formatter.format();
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
      const formatter = new DocumentFormatter(toolManager, document, options, token);
      return formatter.format(range);
    },
  } satisfies vscode.DocumentRangeFormattingEditProvider);
}

export class DocumentFormatter {
  constructor(
    private toolManager: ToolManager,
    private document: vscode.TextDocument,
    private options: vscode.FormattingOptions,
    private token: vscode.CancellationToken,
  ) {}

  public async format(range?: vscode.Range): Promise<vscode.TextEdit[]> {
    Logger.info("Format...");
    const editor = vscode.window.visibleTextEditors.find(
      (editor) => editor.document === this.document,
    );
    if (editor) {
      const lspContexts = this.toolManager.ruleContexts.filter(
        (ctx) => ctx.lspClients && vscode.languages.match(ctx.rule.document, this.document),
      );
      for (const ctx of lspContexts) {
        for (const client of ctx.lspClients!) {
          const edits = await this.formatWithLsp(client, range);
          await editor.edit((builder) => {
            for (const edit of edits) {
              builder.replace(edit.range, edit.newText);
            }
          });
        }
      }
    }

    const targetRange =
      range ?? this.document.validateRange(new vscode.Range(0, 0, this.document.lineCount, 0));
    const newText = await this.formatWithCommand(range);
    Logger.info("Format finished");
    return [vscode.TextEdit.replace(targetRange, newText)];
  }

  private async formatWithLsp(
    client: LanguageClient,
    range?: vscode.Range,
  ): Promise<vscode.TextEdit[]> {
    Logger.info("Requesting LSP formatting...");

    const response = await client.sendRequest<vscode.TextEdit[] | null>(
      range ? DocumentRangeFormattingRequest.method : DocumentFormattingRequest.method,
      {
        textDocument: { uri: this.document.uri.toString() },
        range,
        options: {
          tabSize: this.options.tabSize,
          insertSpaces: this.options.insertSpaces,
        },
      } satisfies DocumentFormattingParams | DocumentRangeFormattingParams,
      this.token,
    );
    const edits = (response ?? []).map(
      (edit) =>
        new vscode.TextEdit(
          new vscode.Range(
            new vscode.Position(edit.range.start.line, edit.range.start.character),
            new vscode.Position(edit.range.end.line, edit.range.end.character),
          ),
          edit.newText,
        ),
    );

    Logger.debug(`LSP returned ${edits.length} edit(s)`);
    return edits;
  }

  private async formatWithCommand(range?: vscode.Range): Promise<string> {
    const matchedRules = this.toolManager.ruleContexts
      .filter(
        (ctx) =>
          ctx.conditionMatched &&
          ctx.rule.action.formatter &&
          vscode.languages.match(ctx.rule.document, this.document),
      )
      .map((ctx) => ctx.rule);

    Logger.debug(`Matched formatter rules: [${matchedRules.map((r) => r.name).join(", ")}]`);

    const commands = matchedRules.flatMap((rule) =>
      rule.action.formatter!.map((formatter) =>
        formatter.replace("${filePath}", this.document.fileName),
      ),
    );
    // when edit files outside of workspace, use the first workspace
    const cwd =
      vscode.workspace.getWorkspaceFolder(this.document.uri)?.uri.fsPath ??
      vscode.workspace.workspaceFolders?.at(0)?.uri.fsPath;

    Logger.info("Format");
    Logger.info(`  commands: [${commands.join(", ")}]`);
    Logger.info(`  cwd: ${cwd}`);

    let currentText = this.document.getText(range);

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
}
