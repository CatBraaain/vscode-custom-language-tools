import { parseArgsStringToArgv } from "string-argv";
import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  Executable,
  State,
  ErrorAction,
  CloseAction,
} from "vscode-languageclient/node";

import { Logger } from "./logger";

export async function registerLsp(
  document: vscode.DocumentSelector,
  command: string,
  ruleName: string,
): Promise<vscode.Disposable> {
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
              message: `${command}: server closed unexpectedly after ${restartCount} retries`,
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
  Logger.debug(`${ruleName} - LSP registered`);

  return new vscode.Disposable(async () => {
    Logger.debug(`${ruleName} - LSP unregistering`);
    await client.stop();
    Logger.debug(`${ruleName} - LSP unregistered`);
  });
}
