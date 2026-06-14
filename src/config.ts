import { parseArgsStringToArgv } from "string-argv";
import * as vscode from "vscode";
import { z } from "zod";
import { spawn } from "node:child_process";

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
  return {
    rules: result.data ?? [],
  };
}

export async function getMatchedRules(): Promise<Rule[]> {
  const { rules } = getConfig();
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    return rules.filter((rule) => !rule.condition.when);
  }

  const workspacePaths = workspaceFolders.map((w) => w.uri.fsPath);
  const resolvedRules = await Promise.all(
    rules.map(async (rule) => {
      const results = await Promise.all(
        workspacePaths.map((workspacePath) => isConditionSatisfied(rule, workspacePath)),
      );
      return {
        rule,
        matched: results.some(Boolean),
      };
    }),
  );

  return resolvedRules.filter(({ matched }) => matched).map(({ rule }) => rule);
}

async function isConditionSatisfied(rule: Rule, workspacePath: string): Promise<boolean> {
  const { when, whenNot } = rule.condition;
  const isWhenSatisfied = !when || (await executeCommand(when, workspacePath)) === 0;
  const isWhenNotSatisfied = !whenNot || (await executeCommand(whenNot, workspacePath)) === 1;
  return isWhenSatisfied && isWhenNotSatisfied;
}

async function executeCommand(command: string, workspacePath: string): Promise<number> {
  const [cmd, ...args] = parseArgsStringToArgv(command);
  return new Promise<number>((resolve) => {
    const child = spawn(cmd, args, {
      cwd: workspacePath,
      timeout: 5000,
    });
    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}
