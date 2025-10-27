# **sync-mcp**

One-Click MCP Configuration Sync Tool. 
[中文](https://github.com/william-garden/sync-mcp/blob//master/docs/zh.md)

## 1. Overview

sync-mcp is a Node.js-based command-line tool designed to solve the pain point of manually syncing universal MCP configurations across multiple IDEs, code editors, and CLI tools. Users can use simple commands to safely synchronize the configuration file of one tool (source) to another tool (target), thereby achieving unified and automated configuration management.

## 2. Technical Specifications

* Environment: Node.js 18+ (requires ESM support and modern APIs).  
* Distribution: Distributed via npm, supports direct execution with npx sync-mcp or global installation with npm i -g sync-mcp.  
* Runtime Dependencies: Only depends on cross-platform file system and CLI interaction libraries; no native compilation environment required.  
* Supported Platforms: Runs stably on Linux, Windows, and macOS.

## 3. Usage

### 3.1. Direct Sync

Execute synchronization directly by providing keywords for the source and target tools.

```bash
npx sync-mcp <source_keyword> <target_keyword>
```

### 3.2. Interactive Sync

When the command is executed without any arguments, it enters interactive mode.

```bash
npx sync-mcp
```

Operation Flow:

1. Select Source:
    ```
    ? Select the configuration source file: (Use arrow keys)  
    > 1. VS Code (~/.vscode/mcp.json)  
        2. Cursor (~/.cursor/mcp.json)  
        3. GitHub Copilot CLI (~/.copilot/mcp-config.json)  
        4. Customize
    ```
2. Select Target:  
    ```   
    ? Select the configuration target file: (Use arrow keys)  
    > 1. VS Code (~/.vscode/mcp.json)  
        2. Cursor (~/.cursor/mcp.json)  
        3. GitHub Copilot CLI (~/.copilot/mcp-config.json)  
        4. Customize (Select a target tool or create a new configuration)
    ```
## 4. Tool Matching Keywords

| Tool Name | Supported Keywords |  
| :--- | :--- |
| Codex | `codex`, `openai`, `codex cli` |  
| Claude Code | `claude`, `claude-code`, `claude code`, `anthropic` |  
| Cursor | `cursor`, `cursor ide` |  
| Gemini CLI | `gemini`, `gemini cli`, `google`, `gcloud` |  
| GitHub Copilot CLI | `copilot`, `copilot` `cli`, `github`, `gh` |  
| Visual Studio Code | `vscode`, `vs code`, `vs-code`, `code` |

## 5. Supported Tools and Configuration Paths

| Tool Name | Linux / macOS Path | Windows Path | Documentation URL |  
| :--- | :--- | :--- | :--- |
| Codex | `~/.codex/config.toml` | `%USERPROFILE%\.codex\config.toml` | [Codex configuration](https://github.com/openai/codex/blob/main/docs/config.md) |
| Claude Code | `~/.claude.json` | `%USERPROFILE%\.claude.json` | [Claude Code MCP guide](https://docs.anthropic.com/en/docs/claude-code) |
| Cursor | `~/.cursor/mcp.json` | `%APPDATA%\Cursor\mcp.json` | [Cursor MCP guide](https://docs.cursor.com/context/mcp) |
| Gemini CLI (gcloud) | `~/.gemini/settings.json` | `%APPDATA%\.gemini\settings.json` | [Gemini CLI MCP server](https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md) |
| GitHub Copilot CLI | `~/.copilot/mcp-config.json` | `%USERPROFILE%\.copilot\mcp-config.json` | [Copilot CLI MCP usage](https://github.com/github/docs/blob/main/content/copilot/how-tos/use-copilot-agents/use-copilot-cli.md) |
| Visual Studio Code | `~/.vscode/mcp.json` | `%APPDATA%\Roaming\Code\User\mcp.json` | [VS Code MCP servers](https://code.visualstudio.com/docs/copilot/copilot-customization/copilot/chat/mcp-servers) |

### 5.1. Codex

Default configuration file: `~/.codex/config.toml`

```toml
# ~/.codex/config.toml  
[mcp_servers.context7]  
command ="cmd"  
args = [  
    "/c", "npx", "-y",  
    "@upstash/context7-mcp",  
    "--api-key="YOUR_API_KEY",  
    "--stdio"  
]  
env = { SystemRoot="C:\\Windows", PROGRAMFILES="C:\\Program Files" }  
startup_timeout_ms = 60_000
```

### 5.2. Claude Code

Default configuration file: `~/.claude.json`

```json
{  
  "mcpServers": {  
    "context7": {  
        "type": "stdio",  
        "command": "npx",  
        "args": [  
            "-y",  
            "@upstash/context7-mcp",  
            "--api-key",  
            "YOUR_API_KEY"  
        ],  
        "env": {}  
    }  
  }  
}
```

### 5.3. Cursor

Default configuration file: `~/.cursor/mcp.json`

```json
{  
    "mcpServers": {  
        "context7": {  
            "command": "npx",  
            "args": ["-y", "@upstash/context7-mcp", "--api-key", "YOUR_API_KEY"]  
        }  
    }  
}
```

### 5.4. Gemini CLI (gcloud)

Default configuration file: ~/.gemini/settings.json

```json
{  
    "mcpServers": {  
        "context7": {  
            "command": "npx",  
            "args": ["-y", "@upstash/context7-mcp", "--api-key", "YOUR_API_KEY"]  
        }  
    }  
}
```

### 5.5. GitHub Copilot CLI

Default configuration file: `~/.copilot/mcp-config.json`

```json
{  
  "mcpServers": {  
        "docs": {  
            "command": "npx",  
            "args": ["-y", "@upstash/context7-mcp", "--api-key", "YOUR_API_KEY"]  
        }  
  }  
}
```

### 5.6. Visual Studio Code

Default configuration file: `~/.vscode/mcp.json`
```json
{  
    "servers": {  
        "context7": {  
            "command": "npx",  
            "args": ["-y", "@upstash/context7-mcp", "--api-key", "YOUR_API_KEY"]  
        }  
    }  
}
```

## 6. Core Features

* **Dual-Mode Operation**: Supports both fast, direct single-line command sync and a guided interactive mode.  
* **Fuzzy Parameter Matching**: Users don't need to remember the exact tool names; the tool automatically matches common keywords.  
* **Cross-Platform Compatibility**: Perfect support for Linux, Windows, and macOS environments, automatically handling different OS path formats.  
* **Automatic Path Detection**: Built-in default configuration paths for mainstream development tools, automatically discovering locally existing configuration files.  
* **Safe Backup Mechanism**: Automatically backs up the target configuration file before performing any overwrite operation, ensuring the operation is reversible and preventing accidental data loss.  
* **Customization and Extension**: Supports manually specifying configuration file paths and can automatically create target files if they do not exist.

## 7. File Backup Mechanism

Safety is one of the core principles of this tool. Before any synchronization operation (i.e., overwriting the target file) occurs, the following backup process **must** be executed:

1. **Safety Principle**: Before any operation writes to the target file, a backup must be completed to ensure the operation is reversible.  
2. **Default Location**: Creates a `~/.sync-mcp/backup/` directory in the user's home directory. If it doesn't exist, it is created automatically.  
3. **Backup Content**: A complete copy of the **current target file**.  
4. **Backup Path**:  
   * Root directory: `~/.sync-mcp/backup/  `
   * Subdirectory structure: `/<timestamp>/<original_directory_structure>/<original_filename>  `
   * `<timestamp>`: Unix timestamp (in milliseconds) when the sync operation was executed, e.g., `1677619200000`  
5. **Example**:  
   * **Operation**: `npx sync-mcp vscode cursor`
   * **Time**: `2025-10-24 18:00:00` (assuming timestamp `1761319200000`)  
   * **Target file**: `~/.cursor/mcp.json` on Linux  
   * **Action**: The program copies `~/.cursor/mcp.json` to `~/.sync-mcp/backup/1761319200000/.cursor/mcp.json ` 
   * This prevents backup files from being overwritten and preserves the original file's path structure, making it easy to find and restore.

## 8. Platform Compatibility

* Operating Systems: Must run stably on mainstream Linux distributions (Ubuntu, CentOS, etc.), as well as Windows 10/11 and macOS.  
* Path Handling: Internal logic must use Node.js `path` module functions like `path.join()` and `path.resolve()` to handle file paths. Hardcoding `/` or `\` is prohibited.