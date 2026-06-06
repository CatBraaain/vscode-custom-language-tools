import * as vscode from "vscode";

export async function getMatchedRules(): Promise<Rule[]> {
  const rules: Rule[] =
    vscode.workspace.getConfiguration("customLanguageConfig").get("rules") ?? [];
  const resolvedRules = await Promise.all(
    rules.map(async (rule) => ({
      rule,
      matched:
        rule.when.required === undefined ||
        (await isRequiredSatisfied(rule.when.required)),
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

  if (required.contains) {
    const matchedFileContents = await Promise.all(
      matchedFilePaths.map(async (filePath) => {
        const uri = vscode.Uri.file(filePath);
        const bytes = await vscode.workspace.fs.readFile(uri);
        const content = Buffer.from(bytes).toString("utf8");
        return content;
      }),
    );
    const contentPattern = new RegExp(required.contains);
    return matchedFileContents.some((content) => contentPattern.test(content));
  } else {
    return true;
  }
}

export type Config = {
  rules: Rule[];
};

export type Rule = {
  when: When;
  use: Use;
};

export type When = {
  langs?: string[];
  required?: Required;
};

export type Required = {
  file: string; // regex
  contains?: string; // regex (applied to the matched file)
};

export type Use = {
  lsp?: string[]; // cli commands
  formatter?: string[]; // cli commands
  langConfig?: LangConfig;
};

export type LangConfig = {
  comments?: {
    lineComment?: string;
    blockComment?: [string, string];
  };
  brackets?: [string, string][];
  autoClosingPairs?: {
    open: string;
    close: string;
  }[];
};
