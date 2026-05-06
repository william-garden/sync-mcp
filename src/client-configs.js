/**
 * MCP 客户端配置路径和格式信息
 *
 * 本文件收集了所有支持的 MCP 客户端的配置文件路径和格式信息。
 */

/**
 * 支持的客户端列表及其配置信息
 */
export const CLIENT_CONFIGS = [
  {
    id: 'codex',
    name: 'Codex',
    vendor: 'OpenAI',
    keywords: ['codex', 'openai', 'codex cli'],
    docs: 'https://github.com/openai/codex/blob/main/docs/config.md',
    configPath: {
      unix: '~/.codex/config.toml',
      windows: '%USERPROFILE%\\.codex\\config.toml',
    },
    format: 'toml',
    serversKey: 'mcp_servers',
    schema: {
      example: `[mcp_servers.server-name]
command = "npx"
args = [
  "-y",
  "package-name",
  "--api-key",
  "YOUR_API_KEY"
]
env = { KEY = "value" }
startup_timeout_ms = 60_000`,
      fields: {
        command: { type: 'string', required: true, description: '可执行命令' },
        args: { type: 'array', required: false, description: '命令参数数组' },
        env: { type: 'object', required: false, description: '环境变量（内联表格式）' },
        startup_timeout_ms: { type: 'number', required: false, default: 60000, description: '启动超时（毫秒）' },
      },
      notes: [
        '使用 npx 命令时自动添加 -y 标志',
        '跨平台支持（Linux, macOS, Windows）',
      ],
    },
  },
  {
    id: 'claude',
    name: 'Claude Code',
    vendor: 'Anthropic',
    keywords: ['claude', 'claude-code', 'claude code', 'anthropic'],
    docs: 'https://docs.claude.com/en/docs/claude-code/settings',
    configPath: {
      unix: '~/.claude.json',
      windows: '%USERPROFILE%\\.claude.json',
    },
    format: 'json',
    serversKey: 'mcpServers',
    schema: {
      example: `{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "package-name"],
      "env": {},
      "type": "stdio"
    }
  }
}`,
      fields: {
        command: { type: 'string', required: true, description: '可执行命令' },
        args: { type: 'array', required: false, description: '命令参数数组' },
        env: { type: 'object', required: false, description: '环境变量对象' },
        type: { type: 'string', required: true, default: 'stdio', description: '连接类型（强制为 stdio）' },
        cwd: { type: 'string', required: false, description: '工作目录' },
        description: { type: 'string', required: false, description: '服务器描述' },
      },
      notes: [
        'Claude Code 强制使用 type: "stdio"',
      ],
    },
  },
  {
    id: 'cursor',
    name: 'Cursor',
    vendor: 'Cursor',
    keywords: ['cursor', 'cursor ide'],
    docs: 'https://docs.cursor.com/context/mcp',
    configPath: {
      unix: '~/.cursor/mcp.json',
      windows: '%USERPROFILE%\\.cursor\\mcp.json',
    },
    format: 'json',
    serversKey: 'mcpServers',
    schema: {
      example: `{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "package-name"],
      "env": {},
      "transport": "stdio"
    }
  }
}`,
      fields: {
        command: { type: 'string', required: true, description: '可执行命令' },
        args: { type: 'array', required: false, description: '命令参数数组' },
        env: { type: 'object', required: false, description: '环境变量对象' },
        transport: { type: 'string', required: false, description: '传输方式' },
        cwd: { type: 'string', required: false, description: '工作目录' },
        description: { type: 'string', required: false, description: '服务器描述' },
      },
      notes: [],
    },
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    vendor: 'Google',
    keywords: ['gemini', 'gemini cli', 'google', 'gcloud'],
    docs: 'https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md',
    configPath: {
      unix: '~/.gemini/settings.json',
      windows: '%APPDATA%\\.gemini\\settings.json',
    },
    format: 'json',
    serversKey: 'mcpServers',
    schema: {
      example: `{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "package-name"],
      "env": {}
    }
  }
}`,
      fields: {
        command: { type: 'string', required: true, description: '可执行命令' },
        args: { type: 'array', required: false, description: '命令参数数组' },
        env: { type: 'object', required: false, description: '环境变量对象' },
        transport: { type: 'string', required: false, description: '传输方式' },
        cwd: { type: 'string', required: false, description: '工作目录' },
        description: { type: 'string', required: false, description: '服务器描述' },
      },
      notes: [],
    },
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot CLI',
    vendor: 'GitHub',
    keywords: ['copilot', 'copilot cli', 'github', 'gh'],
    docs: 'https://github.com/github/docs/blob/main/content/copilot/how-tos/use-copilot-agents/use-copilot-cli.md',
    configPath: {
      unix: '~/.copilot/mcp-config.json',
      windows: '%USERPROFILE%\\.copilot\\mcp-config.json',
    },
    format: 'json',
    serversKey: 'mcpServers',
    schema: {
      example: `{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "package-name"],
      "env": {}
    }
  }
}`,
      fields: {
        command: { type: 'string', required: true, description: '可执行命令' },
        args: { type: 'array', required: false, description: '命令参数数组' },
        env: { type: 'object', required: false, description: '环境变量对象' },
        transport: { type: 'string', required: false, description: '传输方式' },
        cwd: { type: 'string', required: false, description: '工作目录' },
        description: { type: 'string', required: false, description: '服务器描述' },
      },
      notes: [],
    },
  },
  {
    id: 'vscode',
    name: 'Visual Studio Code',
    vendor: 'Microsoft',
    keywords: ['vscode', 'vs code', 'vs-code', 'code'],
    docs: 'https://code.visualstudio.com/docs/copilot/copilot-customization/copilot/chat/mcp-servers',
    configPath: {
      unix: '~/.vscode/mcp.json',
      windows: '%APPDATA%\\Code\\User\\mcp.json',
    },
    format: 'json',
    serversKey: 'servers', // 注意：VS Code 使用 "servers" 而不是 "mcpServers"
    schema: {
      example: `{
  "servers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "package-name"],
      "env": {}
    }
  }
}`,
      fields: {
        command: { type: 'string', required: true, description: '可执行命令' },
        args: { type: 'array', required: false, description: '命令参数数组' },
        env: { type: 'object', required: false, description: '环境变量对象（仅在有内容时包含）' },
        transport: { type: 'string', required: false, description: '传输方式' },
        cwd: { type: 'string', required: false, description: '工作目录' },
        description: { type: 'string', required: false, description: '服务器描述' },
      },
      notes: [
        'VS Code 使用 "servers" 键而不是 "mcpServers"',
        '仅在 env 对象有内容时才包含该字段',
      ],
    },
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    vendor: 'Anomaly',
    keywords: ['opencode', 'open code'],
    docs: 'https://opencode.ai/docs/mcp-servers',
    configPath: {
      unix: '~/.opencode/opencode.json',
      windows: '%USERPROFILE%\\.opencode\\opencode.json',
    },
    format: 'json',
    serversKey: 'mcpServers',
    schema: {
      example: `{
  "mcpServers": {
    "server-name": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "package-name"],
      "env": {}
    }
  }
}`,
      fields: {
        type: { type: 'string', required: true, default: 'stdio', description: '服务器类型 (stdio 或 sse)' },
        command: { type: 'string', required: true, description: '可执行命令（仅 stdio 类型）' },
        args: { type: 'array', required: false, description: '命令参数数组' },
        env: { type: 'object', required: false, description: '环境变量对象' },
        url: { type: 'string', required: false, description: '远程服务器 URL（仅 sse 类型）' },
        timeout: { type: 'number', required: false, default: 5000, description: '请求超时（毫秒）' },
        cwd: { type: 'string', required: false, description: '工作目录' },
        description: { type: 'string', required: false, description: '服务器描述' },
      },
      notes: [
        '支持 stdio（本地命令）和 sse（远程服务）两种类型',
        'stdio 类型需要指定 command，sse 类型需要指定 url',
      ],
    },
  },
];

/**
 * 所有 JSON 格式客户端支持的服务器配置字段
 */
export const JSON_SERVER_FIELDS = [
  'type',
  'command',
  'args',
  'env',
  'transport',
  'cwd',
  'description',
  'allowStop',
  'allowedExecutables',
  'allowedArgs',
  'timeoutMs',
  'timeout_ms',
  'workingDirectory',
  'meta',
];

/**
 * TOML 格式（Codex）支持的服务器配置字段
 */
export const TOML_SERVER_FIELDS = [
  'command',
  'args',
  'env',
  'startup_timeout_ms',
];

/**
 * 获取客户端配置信息
 * @param {string} clientId - 客户端 ID
 * @returns {object|undefined} 客户端配置信息
 */
export function getClientConfig(clientId) {
  return CLIENT_CONFIGS.find(config => config.id === clientId);
}

/**
 * 获取所有支持的客户端 ID
 * @returns {string[]} 客户端 ID 列表
 */
export function getSupportedClientIds() {
  return CLIENT_CONFIGS.map(config => config.id);
}

/**
 * 获取所有 JSON 格式的客户端
 * @returns {object[]} JSON 格式客户端列表
 */
export function getJsonClients() {
  return CLIENT_CONFIGS.filter(config => config.format === 'json');
}

/**
 * 获取所有 TOML 格式的客户端
 * @returns {object[]} TOML 格式客户端列表
 */
export function getTomlClients() {
  return CLIENT_CONFIGS.filter(config => config.format === 'toml');
}

/**
 * 格式汇总信息
 */
export const FORMAT_SUMMARY = {
  json: {
    clients: ['claude', 'cursor', 'gemini', 'copilot', 'opencode', 'vscode'],
    description: 'JSON 格式配置文件',
    commonStructure: {
      mcpServers: '大多数客户端使用此键（claude, cursor, gemini, copilot, opencode）',
      servers: 'VS Code 使用此键',
    },
  },
  toml: {
    clients: ['codex'],
    description: 'TOML 格式配置文件',
    commonStructure: {
      mcp_servers: 'Codex 使用此键',
    },
  },
};

/**
 * 打印配置摘要到控制台
 */
export function printConfigSummary() {
  console.log('=== MCP 客户端配置文件信息 ===\n');

  for (const config of CLIENT_CONFIGS) {
    console.log(`📦 ${config.name} (${config.vendor})`);
    console.log(`   ID: ${config.id}`);
    console.log(`   格式: ${config.format.toUpperCase()}`);
    console.log(`   服务器键: ${config.serversKey}`);
    console.log(`   配置路径:`);
    console.log(`     - Unix/macOS: ${config.configPath.unix}`);
    console.log(`     - Windows: ${config.configPath.windows}`);
    console.log(`   文档: ${config.docs}`);
    console.log('');
  }
}
