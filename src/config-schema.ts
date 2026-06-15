import { z } from "zod";

export const RuleSchema = z.object({
  name: z.string().describe("Name for this rule"),
  target: z
    .object({
      langs: z.array(z.string()).describe("Language IDs. '*' matches all languages"),
      files: z
        .string()
        .optional()
        .describe(
          "Command returning newline-separated file paths. (.e.g, 'find . -name '*.ts', 'grep -l TODO .')",
        ),
    })
    .describe("Target files of this rule"),
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

export type DocumentSelector = {
  language: string;
  pattern?: string;
}[];
