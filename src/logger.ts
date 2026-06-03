import * as vscode from "vscode";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

export class Logger {
  private outputChannel: vscode.OutputChannel;
  private minLevel: LogLevel;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel("Unified Language Config");
    this.minLevel = this.getLogLevelFromConfig();
  }

  private getLogLevelFromConfig(): LogLevel {
    const levelStr = vscode.workspace
      .getConfiguration("customLanguageConfig")
      .get<string>("logLevel", "info");
    const levelMap: { [key: string]: LogLevel } = {
      debug: LogLevel.DEBUG,
      info: LogLevel.INFO,
      warn: LogLevel.WARN,
      error: LogLevel.ERROR,
      critical: LogLevel.CRITICAL,
    };
    return levelMap[levelStr.toLowerCase()] || LogLevel.INFO;
  }

  private formatMessage(level: string, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `\n  Context: ${JSON.stringify(context, null, 2)}` : "";
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  debug(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.outputChannel.appendLine(this.formatMessage("DEBUG", message, context));
    }
  }

  info(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.outputChannel.appendLine(this.formatMessage("INFO", message, context));
    }
  }

  warn(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.outputChannel.appendLine(this.formatMessage("WARN", message, context));
    }
  }

  error(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.outputChannel.appendLine(this.formatMessage("ERROR", message, context));
      if (context instanceof Error) {
        this.outputChannel.appendLine(`  Stack: ${context.stack}`);
      }
    }
  }

  critical(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.CRITICAL)) {
      this.outputChannel.appendLine(this.formatMessage("CRITICAL", message, context));
      if (context instanceof Error) {
        this.outputChannel.appendLine(`  Stack: ${context.stack}`);
      }
    }
  }

  show(): void {
    this.outputChannel.show();
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}

export const logger = new Logger();
