# Custom Language Tools

A unified VSCode extension for configuring custom language settings, formatters, and Language Server Protocol (LSP) servers through a single rule-based configuration system.

## Features

### Custom Formatters

- Register custom formatters for any language
- Conditional formatting based on:
  - Configuration file presence
  - Specific string patterns in files
- Full document and range formatting support

### Custom Language Properties

- Dynamic language configuration:
  - Comment definitions (line and block)
  - Bracket pairs
  - Auto-closing character pairs
- Integration with existing language extension settings
- Auto-completion when editing settings.json

### Custom LSP Config

- Multiple language server management

## Configuration

The extension uses a rule-based configuration system. Add rules to your settings.json:

### Example

Each rule defines conditions (`when`) and actions (`use`):

```json
{
  "customLanguageTools.rules": [
    {
      "when": {
        "langs": ["javascript", "typescript"],
        "required": {
          "file": "package.json",
          "contains": "prettier"
        }
      },
      "use": {
        "formatter": ["npx prettier --stdin-filepath ${filePath}"]
      }
    },
    {
      "when": {
        "langs": ["javascript", "typescript"],
        "required": {
          "file": "package.json",
          "contains": "eslint"
        }
      },
      "use": {
        "lsp": ["npx vscode-eslint-language-server --stdio"]
      }
    },
    {
      "when": {
        "langs": ["javascript", "typescript"],
        "required": {
          "file": "package.json",
          "contains": "biome@biomejs/biome"
        }
      },
      "use": {
        // "formatter": ["npx biome@biomejs/biome --stdin-file-path=${filePath}"],
        "lsp": ["npx biome lsp-proxy"]
      }
    },
    {
      "when": {
        "langs": ["javascript", "typescript"],
        "required": {
          "file": "package.json",
          "contains": "vite-plus",
          "notContains": "prettier|biome"
        }
      },
      "use": {
        "formatter": ["npx oxfmt --fix"],
        "lsp": ["npx oxlint --lsp"]
      }
    }
  ]
}
```

### Configuration Options

#### `when` - Conditions

- `langs` (required): Array of target language IDs
- `required` (optional): Conditions for rule activation
  - `file` (required): Regex pattern for required file (e.g., `package\\.json`)
  - `contains` (optional): Regex pattern that must be contained in the file
  - `notContains` (optional): Regex pattern that must NOT be contained in the file

#### `use` - Actions

- `formatter` (optional): Array of formatter command strings
- `lsp` (optional): Array of LSP server command strings
- `langConfig` (optional): Language-specific configuration
  - `comments`: Comment configuration
    - `lineComment`: Line comment token
    - `blockComment`: `[start, end]` block comment delimiters
  - `brackets`: Array of `[open, close]` bracket pairs
  - `autoClosingPairs`: Array of `{open, close}` auto-closing pairs

## Commands

### Restart All Language Services

**Command ID**: `customLanguageTools.restartAll`

Restarts all language services (formatters, LSP servers, language configurations).
