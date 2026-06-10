import { z } from "zod";

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

export const RuleSchema = z.object({
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

export const LogLevelSchema = z
  .enum(["debug", "info", "warn", "error"])
  .default("info")
  .describe("Log level for extension output");

export const ConfigSchema = z.object({
  "customLanguageConfig.logLevel": LogLevelSchema,
  "customLanguageConfig.rules": z
    .array(RuleSchema)
    .default([])
    .describe("Rule-based configuration"),
});

export type Config = z.infer<typeof ConfigSchema>;
export type LogLevel = z.infer<typeof LogLevelSchema>;
export type Rule = z.infer<typeof RuleSchema>;
export type LangConfig = z.infer<typeof LangConfigSchema>;
export type Required = z.infer<typeof Required>;
