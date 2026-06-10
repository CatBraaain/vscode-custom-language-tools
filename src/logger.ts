import * as vscode from "vscode";
import { getConfig } from "./config";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private static _instance: Logger;
  private outputChannel: vscode.OutputChannel;
  private minLevel: LogLevel;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel("Unified Language Config");
    this.minLevel = this.getLogLevelFromConfig();
  }

  static get instance(): Logger {
    if (!Logger._instance) {
      Logger._instance = new Logger();
    }
    return Logger._instance;
  }

  private getLogLevelFromConfig(): LogLevel {
    const { logLevel } = getConfig();
    const levelMap: { [key: string]: LogLevel } = {
      debug: LogLevel.DEBUG,
      info: LogLevel.INFO,
      warn: LogLevel.WARN,
      error: LogLevel.ERROR,
    };
    return levelMap[logLevel.toLowerCase()] || LogLevel.INFO;
  }

  private formatMessage(level: string, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `\n  Context: ${JSON.stringify(context, null, 2)}` : "";
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  static debug(message: string, context?: any): void {
    if (Logger.instance.shouldLog(LogLevel.DEBUG)) {
      Logger.instance.outputChannel.appendLine(
        Logger.instance.formatMessage("DEBUG", message, context),
      );
    }
  }

  static info(message: string, context?: any): void {
    if (Logger.instance.shouldLog(LogLevel.INFO)) {
      Logger.instance.outputChannel.appendLine(
        Logger.instance.formatMessage("INFO", message, context),
      );
    }
  }

  static warn(message: string, context?: any): void {
    if (Logger.instance.shouldLog(LogLevel.WARN)) {
      Logger.instance.outputChannel.appendLine(
        Logger.instance.formatMessage("WARN", message, context),
      );
    }
  }

  static error(message: string, context?: any): void {
    if (Logger.instance.shouldLog(LogLevel.ERROR)) {
      Logger.instance.outputChannel.appendLine(
        Logger.instance.formatMessage("ERROR", message, context),
      );
      if (context instanceof Error) {
        Logger.instance.outputChannel.appendLine(`  Stack: ${context.stack}`);
      }
    }
  }

  static show(): void {
    Logger.instance.outputChannel.show();
  }

  static dispose(): void {
    Logger.instance.outputChannel.dispose();
  }
}
