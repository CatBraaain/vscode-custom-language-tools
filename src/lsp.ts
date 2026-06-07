import { parseArgsStringToArgv } from "string-argv";
import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
  ErrorAction,
  CloseAction,
} from "vscode-languageclient/node";

import { logger } from "./logger";

export async function registerLsp(lang: string, command: string): Promise<vscode.Disposable> {
  const [cmd, ...args] = parseArgsStringToArgv(command);

  logger.info(`Registering LSP for ${lang}: ${command}`);

  const client = new LanguageClient(
    `Custom LSP: ${command}`,
    {
      run: {
        command: cmd,
        args,
        transport: TransportKind.stdio,
      },
      debug: {
        command: cmd,
        args,
        transport: TransportKind.stdio,
      },
    } satisfies ServerOptions,
    {
      documentSelector: [{ scheme: "file", language: lang }],
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

  await client.start();

  return new vscode.Disposable(async () => {
    await client.stop();
  });
}
