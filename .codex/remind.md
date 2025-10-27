基本格式和注意点：
1. windows环境下，toml格式（Codex）配置标准:
1.1 固定前缀 command="cmd", args=["/c", "npx", "-y",]
1.2 args下面固定添加 "env = { SystemRoot="C:\\Windows", PROGRAMFILES="C:\\Program Files" }\nstartup_timeout_ms = 60_000"，如果env存在SystemRoot和PROGRAMFILES意外地记得需要添加。
1.3 如果args存在"--stdio"，那json格式的type就是"stdio"

```toml
# ~/.codex/config.toml
[mcp_servers.mcpPackageName]
command ="cmd"
args = [
    "/c", "npx", "-y",
    "mcpPackageName",
    "--api-key="YOUR_API_KEY",
    "--stdio" 
]
env = { SystemRoot="C:\\Windows", PROGRAMFILES="C:\\Program Files", ENV_KEY="ENV_VALUE" }
startup_timeout_ms = 60_000
```

2. macOS环境下，toml格式（Codex）配置标准:
2.1 macOS环境下不需要 command ="cmd"，直接使用command ="npx"，env也不需要设置SystemRoot和PROGRAMFILES

```toml
# ~/.codex/config.toml
[mcp_servers.context7]
command ="npx"
args = [
    "@upstash/context7-mcp",
    "--api-key="YOUR_API_KEY",
    "--stdio"
]
env = { ENV_KEY="ENV_VALUE" }
startup_timeout_ms = 60_000
```

3. 其他的json类型的配置文件mcp的配置key为"mcpServers"，除了 VSCODE的配置key为"servers"



