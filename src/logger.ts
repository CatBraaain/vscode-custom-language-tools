import * as vscode from "vscode";

export class Logger {
  private static _instance: Logger;
  private outputChannel: vscode.LogOutputChannel;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel("Unified Language Config", { log: true });
  }

  static get instance(): Logger {
    Logger._instance ??= new Logger();
    return Logger._instance;
  }

  static debug(message: string, ...args: any[]): void {
    Logger.instance.outputChannel.debug(message, ...args);
  }

  static info(message: string, ...args: any[]): void {
    Logger.instance.outputChannel.info(message, ...args);
  }

  static warn(message: string, ...args: any[]): void {
    Logger.instance.outputChannel.warn(message, ...args);
  }

  static error(errorOrMessage: string | Error, ...args: any[]): void {
    Logger.instance.outputChannel.error(errorOrMessage, ...args);
  }

  static show(): void {
    Logger.instance.outputChannel.show();
  }

  static dispose(): void {
    Logger.instance.outputChannel.dispose();
  }
}
