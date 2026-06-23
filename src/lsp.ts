import { parseArgsStringToArgv } from "string-argv";
import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  Executable,
  State,
  ErrorAction,
  CloseAction,
  DocumentFormattingRequest,
  DocumentRangeFormattingRequest,
  DocumentOnTypeFormattingRequest,
} from "vscode-languageclient/node";

import { Logger } from "./logger";

export async function registerLsp(
  document: vscode.DocumentSelector,
  command: string,
  ruleName: string,
): Promise<LanguageClient> {
  const [cmd, ...args] = parseArgsStringToArgv(command);

  let restartCount = 0;
  const MAX_RESTART = 3;

  const client = new LanguageClient(
    ruleName,
    {
      command: cmd,
      args,
    } satisfies Executable,
    {
      documentSelector: document as any,
      errorHandler: {
        error(error, _message, _count) {
          return { action: ErrorAction.Continue, message: `${command}: ${JSON.stringify(error)}` };
        },
        closed() {
          restartCount++;

          if (restartCount <= MAX_RESTART) {
            return {
              action: CloseAction.Restart,
            };
          } else {
            return {
              action: CloseAction.DoNotRestart,
              message: `${command}: server closed unexpectedly after ${MAX_RESTART} retries`,
            };
          }
        },
      },
    } satisfies LanguageClientOptions,
  );
  client.onDidChangeState((e) => {
    if (e.newState === State.Running) {
      restartCount = 0;
    }
  });

  Logger.debug(`${ruleName} - LSP registering`);
  await client.start();
  client.getFeature(DocumentFormattingRequest.method)?.clear();
  client.getFeature(DocumentRangeFormattingRequest.method)?.clear();
  client.getFeature(DocumentOnTypeFormattingRequest.method)?.clear();
  Logger.debug(`${ruleName} - LSP registered`);

  return client;
}
