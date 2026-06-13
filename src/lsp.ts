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

export async function registerLsp(langs: string[], command: string): Promise<vscode.Disposable> {
  const [cmd, ...args] = parseArgsStringToArgv(command);

  let restartCount = 0;
  const MAX_RESTART = 3;

  const client = new LanguageClient(
    `Custom LSP: ${command}`,
    {
      command: cmd,
      args,
    } satisfies Executable,
    {
      documentSelector: langs,
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

  Logger.info(`LSP registering\n${JSON.stringify({langs,command})}`);
  await client.start();
  Logger.info(`LSP registered\n${JSON.stringify({langs,command})}`);

  return new vscode.Disposable(async () => {
    Logger.info(`LSP unregistering\n${JSON.stringify({langs,command})}`);
    await client.stop();
    Logger.info(`LSP unregistered\n${JSON.stringify({langs,command})}`);
  });
}
