# Unified Language Config

統合カスタム言語設定拡張機能 - フォーマッター、言語プロパティ、LSP設定を一つの拡張機能で管理します。

## 機能

### 1. Custom Formatter

- 任意の言語に対してカスタムフォーマッターを登録
- プラットフォーム別コマンド対応（Windows/macOS/Linux）
- 条件付きフォーマット:
  - 設定ファイルの有無判定
  - ファイル内の特定文字列パターン（正規表現）による判定
- ドキュメント全体および範囲フォーマットをサポート

### 2. Custom Language Properties

- 言語構成の動的設定（コメント、ブラケット、自動閉じ括弧）
- 既存言語拡張の設定ファイル解析
- settings.json編集時の自動補完

### 3. Custom LSP Config

- 複数言語サーバー管理
- Language Client統合
- LSP遅延起動（ファイルオープン時）
- LSPプロジェクト単位起動（マルチルートワークスペース対応）

## インストール

VS Code Marketplaceからインストールするか、`.vsix`ファイルを手動でインストールします。

## 設定

### Formatter設定

```json
{
  "customLanguageConfig.formatters": [
    {
      "command": "npx prettier --stdin",
      "languages": ["javascript", "typescript"],
      "requiresConfigFile": ".prettierrc",
      "containsPattern": "@format"
    }
  ]
}
```

### Language Properties設定

```json
{
  "customLanguageConfig.languageProperties": {
    "javascript": {
      "comments": {
        "lineComment": "#",
        "blockComment": ["/*", "*/"]
      },
      "autoClosingPairs": [{ "open": "{", "close": "}" }]
    }
  }
}
```

### LSP設定

```json
{
  "customLanguageConfig.lsp": {
    "servers": [
      {
        "language": "typescript",
        "command": "node",
        "args": ["./node_modules/typescript-language-server/lib/cli.js", "--stdio"]
      }
    ]
  }
}
```

## 移行ガイド

既存の拡張機能（custom-formatter、custom-language-properties、custom-lsp-config）から移行する場合は、[MIGRATION.md](docs/MIGRATION.md)を参照してください。

## 既知の問題

- なし

## 貢献

貢献を歓迎します。プルリクエストを送信してください。

## ライセンス

MIT License - [LICENSE](LICENSE)を参照してください。
