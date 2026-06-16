# Custom Language Tools

A unified VSCode extension for configuring custom language settings, formatters, and Language Server Protocol (LSP) servers through a single rule-based configuration system.

## Features

### Custom Formatters

- Register custom formatters for any language
- Conditional formatting based on shell command execution results

### Custom LSP Config

- Multiple language server management
- Dynamic server registration based on workspace conditions

## Configuration

The extension uses a rule-based configuration system. Add rules to your settings.json:

### Example

Before using this example, uninstall conflicting extensions and install the ESLint language server:

```sh
code --uninstall-extension esbenp.prettier-vscode
code --uninstall-extension dbaeumer.vscode-eslint
code --uninstall-extension oxc.oxc-vscode
code --uninstall-extension biomejs.biome

npm i -g vscode-langservers-extracted
```

```json
{
  "customLanguageTools.rules": [
    {
      "name": "Prettier",
      "langs": ["javascript", "typescript"],
      "condition": {
        "when": "npm ls prettier"
      },
      "action": {
        "formatter": "npx prettier --stdin-filepath ${filePath}"
      }
    },
    {
      "name": "ESLint",
      "langs": ["javascript", "typescript"],
      "condition": {
        "when": "npm ls eslint"
      },
      "action": {
        "lsp": "vscode-eslint-language-server --stdio"
      }
    },
    {
      "name": "Biome",
      "langs": ["javascript", "typescript"],
      "condition": {
        "when": "npm ls @biomejs/biome"
      },
      "action": {
        "formatter": "npx @biomejs/biome format --stdin-file-path=${filePath}",
        "lsp": "npx @biomejs/biome lsp-proxy"
      }
    },
    {
      "name": "VitePlus",
      "langs": ["javascript", "typescript"],
      "condition": {
        "when": "npm ls vite-plus"
      },
      "action": {
        "formatter": "vp fmt --stdin-filepath=${filePath}",
        "lsp": "vp lint --lsp"
      }
    },
    {
      "name": "Oxc",
      "langs": ["javascript", "typescript"],
      "condition": {
        "whenNot": "npm ls prettier eslint @biomejs/biome vite-plus"
      },
      "action": {
        "formatter": "npx oxfmt --stdin-filepath=${filePath}",
        "lsp": "npx oxlint --lsp"
      }
    }
  ]
}
```

### Configuration Options

#### `name` (required)

Name for this rule.

#### `langs` (required)

Array of target language IDs. Use `"*"` to match all languages.

#### `condition` (optional)

Conditions for applying this rule.

- `when` (optional): Shell command that must return exit code 0 to enable the rule (e.g., `"npm ls biome"`)
- `whenNot` (optional): Shell command that must return exit code 0 to disable the rule (e.g., `"grep vite-plus package.json"`)

#### `action` (required)

Actions applied when the rule is active.

- `formatter` (optional): Formatter command string. Supports `${filePath}` variable substitution (e.g., `"npx prettier --stdin-filepath ${filePath}"`)
- `lsp` (optional): LSP server command string (e.g., `"npx biome lsp-proxy"`)

## Commands

### Restart All Language Services

**Command ID**: `customLanguageTools.restartAll`

Restarts all language services (formatters, LSP servers).
