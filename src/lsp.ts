import { parseArgsStringToArgv } from "string-argv";
import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  Executable,
  ErrorAction,
  CloseAction,
} from "vscode-languageclient/node";

import { Logger } from "./logger";

export async function registerLsp(langs: string[], command: string): Promise<vscode.Disposable> {
  const [cmd, ...args] = parseArgsStringToArgv(command);

  const client = new LanguageClient(
    `Custom LSP: ${command}`,
    {
      command: cmd,
      args,
    } satisfies Executable,
    {
      documentSelector: langs,
      errorHandler: {
        error(_error, _message, count) {
          if (count && count <= 3) {
            return { action: ErrorAction.Continue };
          } else {
            return { action: ErrorAction.Shutdown };
          }
        },
        closed() {
          return {
            action: CloseAction.Restart,
            message: "Language server closed unexpectedly. Restarting.",
          };
        },
      },
    } satisfies LanguageClientOptions,
  );

  Logger.info(`LSP registering\n${JSON.stringify({langs,command})}`);
  await client.start();
  Logger.info(`LSP registered\n${JSON.stringify({langs,command})}`);

  return new vscode.Disposable(async () => {
    Logger.info(`LSP unregistering\n${JSON.stringify({langs,command})}`);
    await client.stop();
    Logger.info(`LSP unregistered\n${JSON.stringify({langs,command})}`);
  });
}
