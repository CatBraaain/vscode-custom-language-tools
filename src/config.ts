import { z } from "zod";

const DocumentFilterSchema = z.object({
  language: z.string().optional(),
  scheme: z.string().optional(),
  pattern: z.string().optional(),
  notebook: z.string().optional(),
});

const CommandInputSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((val) => (Array.isArray(val) ? val : [val]));

export const RuleSchema = z.object({
  name: z.string().describe("Name for this rule"),
  document: z
    .array(z.union([z.string(), DocumentFilterSchema]))
    .describe(
      "Document selector. Can be a language ID string or a DocumentFilter object. '*' matches all languages",
    ),
  condition: z
    .object({
      when: CommandInputSchema.optional().describe(
        "Command(s) returning exit code 0 to enable rule. (.e.g, 'npm ls biome')",
      ),
      whenNot: CommandInputSchema.optional().describe(
        "Command(s) returning exit code 1 to enable rule. (.e.g, 'grep vite-plus package.json')",
      ),
    })
    .optional()
    .default({})
    .describe("Conditions for applying this rule"),
  action: z
    .object({
      lsp: CommandInputSchema.optional().describe(
        "LSP server command(s). (.e.g, 'npx biome lsp-proxy')",
      ),
      formatter: CommandInputSchema.optional().describe(
        "Formatter command(s). Allows ${filePath} variable. (.e.g, 'npx biome format --stdin-file-path=${filePath}')",
      ),
    })
    .describe("Actions applied when rule is active"),
});

export const ConfigSchema = z.object({
  "customLanguageTools.rules": z.array(RuleSchema).default([]).describe("Rule-based configuration"),
});

export type Config = z.infer<typeof ConfigSchema>;
export type Rule = z.infer<typeof RuleSchema>;
