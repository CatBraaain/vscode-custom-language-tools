import * as vscode from "vscode";
import { z } from "zod";

import { RuleSchema, Rule } from "./config-schema";

export interface Config {
  rules: Rule[];
}

export function getConfig(): Config {
  const config = vscode.workspace.getConfiguration("customLanguageTools");
  const result = z.array(RuleSchema).safeParse(config.get("rules") ?? []);
  if (!result.success) {
    vscode.window.showErrorMessage(`Failed to parse configuration: ${result.error.message}`);
  }
  return { rules: result.data ?? [] };
}
