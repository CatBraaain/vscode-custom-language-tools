import { execa } from "execa";
import * as vscode from "vscode";
import type { LanguageClient, DocumentFormattingParams } from "vscode-languageclient/node";
import {
  DocumentFormattingRequest,
  DidChangeTextDocumentNotification,
  DidChangeTextDocumentParams,
} from "vscode-languageclient/node";

import { Logger } from "./logger";
import { ToolManager } from "./tool-manager";

export function registerFormatter(
  document: vscode.DocumentSelector,
  toolManager: ToolManager,
): vscode.Disposable {
  Logger.debug("Formatter registering");
  const formatService = vscode.languages.registerDocumentFormattingEditProvider(document, {
    provideDocumentFormattingEdits(
      document: vscode.TextDocument,
      options: vscode.FormattingOptions,
      token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.TextEdit[]> {
      const formatter = new DocumentFormatter(toolManager, document, options, token);
      return formatter.format();
    },
  } satisfies vscode.DocumentFormattingEditProvider);
  Logger.debug("Formatter registered");

  return new vscode.Disposable(() => {
    Logger.debug("Formatter unregistering");
    formatService.dispose();
    Logger.debug("Formatter unregistered");
  });
}

export class DocumentFormatter {
  constructor(
    private toolManager: ToolManager,
    private document: vscode.TextDocument,
    private options: vscode.FormattingOptions,
    private token: vscode.CancellationToken,
  ) {}

  public async format(): Promise<vscode.TextEdit[]> {
    Logger.info("Format...");

    const originalText = this.document.getText();
    let currentText = originalText;

    currentText = await this.formatWithLsps(currentText);
    currentText = await this.formatWithCommands(currentText);

    Logger.info("Format finished");
    if (currentText === originalText) {
      return [];
    } else {
      const fullRange = this.document.validateRange(
        new vscode.Range(0, 0, this.document.lineCount, 0),
      );
      return [new vscode.TextEdit(fullRange, currentText)];
    }
  }

  private async formatWithLsps(currentText: string): Promise<string> {
    const formattableClients = this.toolManager.ruleContexts
      .filter((ctx) => ctx.lspClients && vscode.languages.match(ctx.rule.document, this.document))
      .flatMap((ctx) =>
        ctx.lspClients!.filter(
          (client) => client.initializeResult?.capabilities.documentFormattingProvider,
        ),
      );

    for (const client of formattableClients) {
      Logger.info(`Format with LSP: ${client.name}`);
      currentText = await this.formatWithLsp(client, currentText);
      await this.notifyLSPDidChange(client, currentText);
    }

    return currentText;
  }

  private async formatWithLsp(client: LanguageClient, currentText: string): Promise<string> {
    const response = await client.sendRequest<vscode.TextEdit[] | null>(
      DocumentFormattingRequest.method,
      {
        textDocument: { uri: this.document.uri.toString() },
        options: {
          tabSize: this.options.tabSize,
          insertSpaces: this.options.insertSpaces,
        },
      } satisfies DocumentFormattingParams,
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
    return this.getEditedText(currentText, edits);
  }

  private getEditedText(text: string, edits: vscode.TextEdit[]): string {
    const chunks: string[] = [];

    const sorted = edits
      .map((e) => ({
        start: this.getOffsetFromPosition(text, e.range.start),
        end: this.getOffsetFromPosition(text, e.range.end),
        text: e.newText,
      }))
      .sort((a, b) => a.start - b.start);

    let lastIndex = 0;
    for (const e of sorted) {
      chunks.push(text.slice(lastIndex, e.start));
      chunks.push(e.text);
      lastIndex = e.end;
    }
    chunks.push(text.slice(lastIndex));

    return chunks.join("");
  }

  private getOffsetFromPosition(text: string, position: vscode.Position): number {
    const lines = text.split("\n");
    let offset = 0;
    for (let i = 0; i < position.line; i++) {
      offset += lines[i].length + 1;
    }
    offset += position.character;
    return offset;
  }

  private async notifyLSPDidChange(client: LanguageClient, newText: string): Promise<void> {
    await client.sendNotification(DidChangeTextDocumentNotification.method, {
      textDocument: {
        uri: this.document.uri.toString(),
        version: this.document.version,
      },
      contentChanges: [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: this.document.lineCount, character: 0 },
          },
          rangeLength: this.document.getText().length,
          text: newText,
        },
      ],
    } satisfies DidChangeTextDocumentParams);
    Logger.debug(`Sent didChange notification to LSP server`);
  }

  private async formatWithCommands(inputText: string): Promise<string> {
    const formatterRules = this.toolManager.ruleContexts
      .filter(
        (ctx) =>
          ctx.conditionMatched &&
          ctx.rule.action.formatter &&
          vscode.languages.match(ctx.rule.document, this.document),
      )
      .map((ctx) => ctx.rule);

    Logger.debug(`Matched formatter rules: [${formatterRules.map((r) => r.name).join(", ")}]`);

    // when edit files outside of workspace, use the first workspace
    const cwd =
      vscode.workspace.getWorkspaceFolder(this.document.uri)?.uri.fsPath ??
      vscode.workspace.workspaceFolders?.at(0)?.uri.fsPath;

    let currentText = inputText;

    for (const rule of formatterRules) {
      const commands = rule.action.formatter!.map((formatter) =>
        formatter.replace("${filePath}", this.document.fileName),
      );
      for (const command of commands) {
        Logger.info(`Format with CLI: ${rule.name} (${command})`);

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
    }

    return currentText;
  }
}
