import { z } from "zod";

const DocumentFilterSchema = z
  .object({
    language: z.string().optional(),
    notebookType: z.string().optional(),
    pattern: z.string().optional(),
    scheme: z.string().optional(),
  })
  .describe("DocumentFilter");
const LanguageIDSchema = z.string().describe("Language ID (e.g., 'javascript', 'typescript')");
const DocumentFilterOrLanguageIDSchema = z.union([DocumentFilterSchema, LanguageIDSchema]);
const DocumentSelectorSchema = z.union([
  DocumentFilterOrLanguageIDSchema,
  z.array(DocumentFilterOrLanguageIDSchema),
]);

export const RuleSchema = z.object({
  name: z.string().describe("Name for this rule"),
  condition: z
    .object({
      documentSelector: DocumentSelectorSchema.describe(
        [
          "Array of DocumentFilter or LanguageID for target files.",
          "(.e.g, ['javascript', 'typescript', { language: 'json', pattern: '**/package.json' }])",
          "see details in https://code.visualstudio.com/api/references/vscode-api#DocumentFilter",
        ].join("\n"),
      ),
      when: z
        .string()
        .optional()
        .describe(
          "Command executed to determine whether this rule is active (true if exit code is 0)",
        ),
      whenNot: z
        .string()
        .optional()
        .describe(
          "Command executed to determine whether this rule is active (true if exit code is 1)",
        ),
    })
    .describe("Conditions for applying this rule"),
  action: z
    .object({
      lsp: z.array(z.string()).optional().describe("Array of LSP server commands"),
      formatter: z.array(z.string()).optional().describe("Array of formatter commands"),
    })
    .describe("Actions to apply when conditions are met"),
});

export const ConfigSchema = z.object({
  "customLanguageTools.rules": z.array(RuleSchema).default([]).describe("Rule-based configuration"),
});

export type Config = z.infer<typeof ConfigSchema>;
export type Rule = z.infer<typeof RuleSchema>;
export type DocumentSelector = z.infer<typeof DocumentSelectorSchema>;
