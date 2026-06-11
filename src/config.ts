import * as vscode from "vscode";
import { z } from "zod";

import { RuleSchema, Rule, Required } from "./config-schema";

export interface Config {
  rules: Rule[];
}

export function getConfig(): Config {
  const config = vscode.workspace.getConfiguration("customLanguageConfig");
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
  const resolvedRules = await Promise.all(
    rules.map(async (rule) => ({
      rule,
      matched: rule.when.required === undefined || (await isRequiredSatisfied(rule.when.required)),
    })),
  );
  return resolvedRules.filter(({ matched }) => matched).map(({ rule }) => rule);
}

async function isRequiredSatisfied(required: Required): Promise<boolean> {
  const files = await vscode.workspace.findFiles("**/*");
  const filePattern = new RegExp(required.file);
  const matchedFilePaths = files
    .filter((uri) => filePattern.test(uri.fsPath))
    .map((uri) => uri.fsPath);
  if (matchedFilePaths.length === 0) {
    return false;
  }

  if (required.contains || required.notContains) {
    const matchedFileContents = await Promise.all(
      matchedFilePaths.map(async (filePath) => {
        const uri = vscode.Uri.file(filePath);
        const bytes = await vscode.workspace.fs.readFile(uri);
        const content = Buffer.from(bytes).toString("utf8");
        return content;
      }),
    );

    const satisfiedContains = required.contains
      ? matchedFileContents.some((content) => content.includes(required.contains!))
      : true;
    const satisfiedNotContains = required.notContains
      ? matchedFileContents.every((content) => !content.includes(required.notContains!))
      : true;

    return satisfiedContains && satisfiedNotContains;
  } else {
    return true;
  }
}
