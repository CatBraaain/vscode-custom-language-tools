import * as vscode from "vscode";
import { z } from "zod";

export async function getMatchedRules(): Promise<Rule[]> {
  const rules: Rule[] =
    vscode.workspace.getConfiguration("customLanguageConfig").get("rules") ?? [];
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

const LangConfigSchema = z.object({
  comments: z
    .object({
      lineComment: z.string().describe("Line comment token").optional(),
      blockComment: z
        .tuple([
          z.string().describe("Block comment start token"),
          z.string().describe("Block comment end token"),
        ])
        .describe("Block comment delimiters")
        .optional(),
    })
    .describe("Comment configuration")
    .optional(),
  brackets: z
    .array(
      z.tuple([z.string().describe("Opening bracket"), z.string().describe("Closing bracket")]),
    )
    .describe("Bracket pairs")
    .optional(),
  autoClosingPairs: z
    .array(
      z.object({
        open: z.string().describe("Opening character"),
        close: z.string().describe("Closing character"),
      }),
    )
    .describe("Auto-closing character pairs")
    .optional(),
});

const Required = z.object({
  file: z.string().describe("Required file regex pattern (e.g. package\\.json, tsconfig\\.json)"),
  contains: z.string().optional().describe("Pattern that must be contained in the file (regex)"),
});

const RuleSchema = z.object({
  when: z.object({
    langs: z.array(z.string()).describe("Target language IDs"),
    required: Required.optional().describe("Required file and content matching conditions"),
  }),

  use: z.object({
    lsp: z.array(z.string()).optional().describe("Array of lsp commands"),
    formatter: z.array(z.string()).optional().describe("Array of formatter commands"),
    langConfig: LangConfigSchema.optional().describe("Language properties configuration"),
  }),
});

export const ConfigSchema = z.object({
  logLevel: z
    .enum(["debug", "info", "warn", "error", "critical"])
    .default("info")
    .describe("Log level for extension output"),
  rules: z.array(RuleSchema).default([]).describe("Rule-based configuration"),
});

export type Config = z.infer<typeof ConfigSchema>;
export type Rule = z.infer<typeof RuleSchema>;
export type LangConfig = z.infer<typeof LangConfigSchema>;
export type Required = z.infer<typeof Required>;
