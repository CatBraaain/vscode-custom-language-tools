import { execa, Result, ExecaError } from "execa";
import * as vscode from "vscode";
import { z } from "zod";

import { RuleSchema, Rule } from "./config-schema";
import { Logger } from "./logger";

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
  const isWhenSatisfied = !when || (await executeCommand(when, workspacePath)).exitCode === 0;
  const isWhenNotSatisfied =
    !whenNot || (await executeCommand(whenNot, workspacePath)).exitCode === 1;

  const isSatisfied = isWhenSatisfied && isWhenNotSatisfied;
  Logger.info(`${rule.name} - condition ${isSatisfied ? "matched" : "not matched"}`);

  return isSatisfied;
}

async function executeCommand(
  command: string,
  workspacePath: string,
): Promise<Result | ExecaError> {
  return await execa({
    shell: true,
    stdin: "ignore",
    cwd: workspacePath,
    reject: false,
  })`${command}`;
}
