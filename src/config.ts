import * as vscode from "vscode";
import { z } from "zod";

export function getConfig(): { rules: Rule[] } {
  const config = vscode.workspace.getConfiguration("customLanguageTools");
  const result = z.array(RuleSchema).safeParse(config.get("rules") ?? []);
  if (!result.success) {
    vscode.window.showErrorMessage(`Failed to parse configuration: ${result.error.message}`);
  }
  return { rules: result.data ?? [] };
}

const DocumentFilterSchema = z.object({
  language: z.string().optional(),
  scheme: z.string().optional(),
  pattern: z.string().optional(),
  notebook: z.string().optional(),
});

export const RuleSchema = z.object({
  name: z.string().describe("Name for this rule"),
  document: z
    .array(z.union([z.string(), DocumentFilterSchema]))
    .describe(
      "Document selector. Can be a language ID string or a DocumentFilter object. '*' matches all languages",
    ),
  condition: z
    .object({
      when: z
        .string()
        .optional()
        .describe("Command returning exit code 0 to enable rule. (.e.g, 'npm ls biome')"),
      whenNot: z
        .string()
        .optional()
        .describe(
          "Command returning exit code 0 to disable rule. (.e.g, 'grep vite-plus package.json')",
        ),
    })
    .optional()
    .default({})
    .describe("Conditions for applying this rule"),
  action: z
    .object({
      lsp: z.string().optional().describe("LSP server commands. (.e.g, 'npx biome lsp-proxy')"),
      formatter: z
        .string()
        .optional()
        .describe(
          "Formatter commands. Allows ${filePath} variable. (.e.g, 'npx biome format --stdin-file-path=${filePath}')",
        ),
    })
    .describe("Actions applied when rule is active"),
});

export const ConfigSchema = z.object({
  "customLanguageTools.rules": z.array(RuleSchema).default([]).describe("Rule-based configuration"),
});

export type Config = z.infer<typeof ConfigSchema>;
export type Rule = z.infer<typeof RuleSchema>;
