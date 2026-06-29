# Custom Language Tools

A unified VSCode extension for configuring custom language settings, formatters, and Language Server Protocol (LSP) servers through a single rule-based configuration system.

## Project Status

This project has been discontinued.

This extension was originally created to solve project-specific lsp/formatter switching by managing lsp/formatter directly.

The original idea was to manage LSP servers as standalone CLI processes instead of having the extension control them, making it easy to switch them on a per-project basis.

In practice, however, this approach proved unreliable. During development, several issues became apparent:

- Some LSP servers require server-specific initializeOptions.
- Some rely on additional protocol interactions (such as dynamic registration) before all features become available.
- Others assume behaviors that are specific to certain clients.

As a result, simply launching an LSP server was not enough to provide a consistent experience across different implementations. Supporting these differences would require server-specific compatibility logic, which conflicted with the goal of providing a simple, generic solution.

For that reason, development of `vscode-custom-language-tools` was discontinued. The concept evolved into `vscode-conditional-config`, which achieves the original goal by auto-switching VS Code settings to switch lsp/formatter extensions.

## Features

### Custom Formatters

- Register custom formatters for any language
- Multiple formatters can be applied sequentially to the same document
- Conditional formatting based on shell command execution results

### Custom LSPs

- Multiple language server management
- Dynamic server registration based on workspace conditions

### Rule-Based Configuration

- Flexible rule system with document selectors
- Conditional activation based on shell commands
- Support for multiple commands per action

## Configuration

The extension uses a rule-based configuration system. Add rules to your settings.json:

### Example

Before using this example, uninstall conflicting extensions and install the ESLint language server:

```sh
code --uninstall-extension charliermarsh.ruff
code --uninstall-extension oxc.oxc-vscode
code --uninstall-extension biomejs.biome

npm i -g vscode-langservers-extracted
```

```json
{
  "customLanguageTools.rules": [
    {
      "name": "Python",
      "document": ["python"],
      "action": {
        "lsp": ["uvx ruff server", "uvx ty server"]
      }
    },
    {
      "name": "Prettier",
      "document": ["javascript", "typescript"],
      "condition": {
        "when": "grep \"\\\"prettier\\\":\" package.json"
      },
      "action": {
        "formatter": "npx prettier --stdin-filepath ${filePath}"
      }
    },
    {
      "name": "VitePlus",
      "document": ["javascript", "typescript"],
      "condition": {
        "when": "grep \"\\\"vite-plus\\\":\" package.json"
      },
      "action": {
        "lsp": ["vp lint --lsp", "vp fmt --lsp"]
      }
    },
    {
      "name": "Oxc",
      "document": ["javascript", "typescript"],
      "condition": {
        "whenNot": [
          "grep \"\\\"prettier\\\":\" package.json",
          "grep \"\\\"vite-plus\\\":\" package.json"
        ]
      },
      "action": {
        "lsp": ["npx oxlint --lsp", "npx oxfmt --lsp"]
      }
    }
  ]
}
```

### Configuration Options

#### `name` (required)

Name for this rule.

#### `document` (required)

Array of target language IDs or [DocumentFilter](https://code.visualstudio.com/api/references/vscode-api#DocumentFilter) objects. Use `"*"` to match all languages.

#### `condition` (optional)

Conditions for applying this rule.

- `when` (optional): Shell command(s) that must return exit code 0 to enable the rule (e.g., `"npm ls biome"`)
- `whenNot` (optional): Shell command(s) that must return exit code 0 to disable the rule (e.g., `"grep vite-plus package.json"`)

#### `action` (required)

Actions applied when the rule is active.

- `formatter` (optional): Formatter command(s). Supports `${filePath}` variable substitution (e.g., `"npx prettier --stdin-filepath ${filePath}"`)
- `lsp` (optional): LSP server command(s) (e.g., `"npx biome lsp-proxy"`)

## Commands

### Restart All Language Services

**Command ID**: `customLanguageTools.restartAll`

Restarts all language services (formatters, LSP servers).

## Similar Concept Projects

- https://github.com/JKillian/vscode-custom-local-formatters
- https://github.com/pepebecker/vscode-lsp-config
- https://github.com/ArturoDent/custom-language-properties
