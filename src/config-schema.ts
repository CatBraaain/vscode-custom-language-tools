import { z } from "zod";

export const RuleSchema = z.object({
  name: z.string().describe("Name for this rule"),
  langs: z.array(z.string()).describe("Language IDs. '*' matches all languages"),
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
