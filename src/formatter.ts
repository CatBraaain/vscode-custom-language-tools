import { execa } from "execa";
import * as vscode from "vscode";
import type { LanguageClient, DocumentFormattingParams } from "vscode-languageclient/node";
import {
  DocumentFormattingRequest,
  DidChangeTextDocumentNotification,
  DidChangeTextDocumentParams,
} from "vscode-languageclient/node";
import { TextDocument as LspTextDocument } from "vscode-languageserver-textdocument";

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
      .flatMap((ctx) => ctx.lspClients!);

    for (const client of formattableClients) {
      currentText = await this.formatWithLsp(client, currentText);
    }

    return currentText;
  }

  private async formatWithLsp(client: LanguageClient, currentText: string): Promise<string> {
    try {
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
            text: currentText,
          },
        ],
      } satisfies DidChangeTextDocumentParams);

      const response = await client.sendRequest<vscode.TextEdit[] | null>(
        DocumentFormattingRequest.method satisfies string,
        {
          textDocument: { uri: this.document.uri.toString() },
          options: {
            tabSize: this.options.tabSize,
            insertSpaces: this.options.insertSpaces,
          },
        } satisfies DocumentFormattingParams,
        this.token,
      );
      Logger.info(`Format with LSP: ${client.name}`);
      Logger.debug(`  ${JSON.stringify(response)}`);

      const lspTextDocument = LspTextDocument.create(
        this.document.uri.toString(),
        this.document.languageId,
        this.document.version,
        currentText,
      );
      return LspTextDocument.applyEdits(lspTextDocument, response ?? []);
    } catch (e) {
      Logger.debug(`Format with LSP: ${client.name}`);
      Logger.debug(`  error: "${e as string}"`);
      return currentText;
    }
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
