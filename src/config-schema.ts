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

export const RuleSchema = z.object({
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
      server: z.array(z.string()).optional().describe("Array of LSP server commands"),
      formatter: z.array(z.string()).optional().describe("Array of formatter commands"),
      config: LangConfigSchema.optional().describe("Language configuration"),
    })
    .describe("Actions to apply when conditions are met"),
});

export const ConfigSchema = z.object({
  "customLanguageTools.rules": z
    .array(RuleSchema)
    .default([])
    .describe("Rule-based configuration"),
});

export type Config = z.infer<typeof ConfigSchema>;
export type Rule = z.infer<typeof RuleSchema>;
export type DocumentSelector = z.infer<typeof DocumentSelectorSchema>;
export type LangConfig = z.infer<typeof LangConfigSchema>;
