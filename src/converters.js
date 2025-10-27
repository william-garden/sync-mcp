const JSON_TOOL_CONFIG = {
  claude: { serversKey: 'mcpServers' },
  cursor: { serversKey: 'mcpServers' },
  gemini: { serversKey: 'mcpServers' },
  copilot: { serversKey: 'mcpServers' },
  vscode: { serversKey: 'servers' },
};

const KNOWN_JSON_SERVER_KEYS = new Set([
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
]);

const JSON_EXTRA_BLACKLIST = new Set(['startup_timeout_ms']);

const CODEX_EXTRA_BLACKLIST = new Set([
  'command',
  'args',
  'env',
  'startup_timeout_ms',
  'extra',
  'type',
  'transport',
  'description',
  'cwd',
]);

export const SUPPORTED_TOOL_IDS = ['codex', 'claude', 'cursor', 'gemini', 'copilot', 'vscode'];

export function parseToolConfig(toolId, rawContent) {
  if (typeof rawContent !== 'string') {
    throw new Error('Configuration content must be a string.');
  }

  if (JSON_TOOL_CONFIG[toolId]) {
    return parseJsonTool(toolId, rawContent);
  }

  if (toolId === 'codex') {
    return parseCodexTool(rawContent);
  }

  throw new Error(`Unsupported tool identifier for parsing: ${toolId}`);
}

export function formatToolConfig(toolId, canonicalInput, options = {}) {
  const canonical = ensureCanonical(canonicalInput);
  const meta = options.meta ?? null;

  if (JSON_TOOL_CONFIG[toolId]) {
    return formatJsonTool(toolId, canonical, meta);
  }

  if (toolId === 'codex') {
    return formatCodexTool(canonical, meta);
  }

  throw new Error(`Unsupported tool identifier for formatting: ${toolId}`);
}

function parseJsonTool(toolId, rawContent) {
  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch (error) {
    throw new Error(`Invalid JSON configuration: ${error.message ?? error}`);
  }

  const { serversKey } = JSON_TOOL_CONFIG[toolId];
  const serversSection = parsed?.[serversKey];

  if (serversSection && typeof serversSection !== 'object') {
    throw new Error(`Expected "${serversKey}" to be an object in the configuration file.`);
  }

  const canonicalServers = {};
  if (serversSection) {
    for (const [serverId, serverConfig] of Object.entries(serversSection)) {
      if (!serverConfig || typeof serverConfig !== 'object') {
        continue;
      }
      canonicalServers[serverId] = normalizeCanonicalServer(fromJsonServer(serverConfig));
    }
  }

  const rest = clone(parsed);
  if (rest && typeof rest === 'object') {
    delete rest[serversKey];
  }

  return {
    canonical: { servers: canonicalServers },
    meta: {
      serversKey,
      rest,
      existingServers: clone(serversSection ?? {}),
      order: Array.isArray(serversSection)
        ? []
        : Object.keys(serversSection ?? {}),
    },
  };
}

function formatJsonTool(toolId, canonical, meta) {
  const { serversKey } = JSON_TOOL_CONFIG[toolId];
  const rest = meta?.rest ? clone(meta.rest) : {};
  const existingServers = meta?.existingServers ? clone(meta.existingServers) : {};

  const outputServers = existingServers && typeof existingServers === 'object'
    ? { ...existingServers }
    : {};

  const canonicalServers = canonical.servers ?? {};

  for (const [serverId, canonicalServer] of Object.entries(canonicalServers)) {
    const existingServer = existingServers?.[serverId];
    outputServers[serverId] = buildJsonServer(toolId, canonicalServer, existingServer);
  }

  rest[serversKey] = outputServers;

  return `${JSON.stringify(rest, null, 2)}\n`;
}

function buildJsonServer(toolId, canonicalServerInput, existingServerInput) {
  const canonicalServer = normalizeCanonicalServer(canonicalServerInput);
  const existingServer = existingServerInput ? fromJsonServer(existingServerInput) : {};
  const result = {};

  const env = mergeEnv(existingServer.env, canonicalServer.env);

  const command = canonicalServer.command ?? existingServer.command;
  if (command) {
    result.command = command;
  }

  const args = canonicalServer.args ?? existingServer.args;
  if (args && args.length > 0) {
    result.args = args;
  } else if (args) {
    result.args = [];
  }

  const cwd = canonicalServer.cwd ?? existingServer.cwd;
  if (cwd) {
    result.cwd = cwd;
  }

  const transport = canonicalServer.transport ?? existingServer.transport;
  if (transport && toolId !== 'claude') {
    result.transport = transport;
  }

  const description = canonicalServer.description ?? existingServer.description;
  if (description) {
    result.description = description;
  }

  if (toolId === 'claude') {
    result.type = canonicalServer.type ?? existingServer.type ?? 'stdio';
  } else if (canonicalServer.type) {
    result.type = canonicalServer.type;
  }

  if (toolId !== 'vscode' || (env && Object.keys(env).length > 0)) {
    result.env = env ?? {};
  } else if (env && Object.keys(env).length > 0) {
    result.env = env;
  }

  const extras = mergeExtras(existingServer.extra, canonicalServer.extra);
  for (const [key, value] of Object.entries(extras)) {
    if (JSON_EXTRA_BLACKLIST.has(key)) {
      continue;
    }
    if (result[key] === undefined) {
      result[key] = value;
    }
  }

  return pruneUndefined(result);
}

function parseCodexTool(rawContent) {
  const canonicalServers = {};
  const existingServers = {};
  const order = [];

  const sectionRegex = /\[mcp_servers\.([^\]]+?)\]\s*([\s\S]*?)(?=(?:\r?\n){1,}(?=\s*\[)|$)/g;

  let match;
  let lastIndex = 0;
  let preamble = '';
  let epilogue = '';

  while ((match = sectionRegex.exec(rawContent)) !== null) {
    const [full, serverIdRaw, block] = match;
    const serverId = serverIdRaw.trim();

    if (match.index > lastIndex && lastIndex === 0) {
      preamble = rawContent.slice(0, match.index);
    }

    const parsedBlock = parseCodexSection(block);
    canonicalServers[serverId] = normalizeCanonicalServer(fromCodexServer(parsedBlock));
    existingServers[serverId] = parsedBlock;
    order.push(serverId);
    lastIndex = match.index + full.length;
  }

  if (lastIndex > 0 && lastIndex < rawContent.length) {
    epilogue = rawContent.slice(lastIndex);
  } else if (lastIndex === 0) {
    preamble = rawContent;
  }

  return {
    canonical: { servers: canonicalServers },
    meta: {
      existingServers,
      preamble,
      epilogue,
      order,
    },
  };
}

function formatCodexTool(canonical, meta) {
  const existingServers = meta?.existingServers ?? {};
  const preamble = meta?.preamble ?? '';
  const epilogue = meta?.epilogue ?? '';
  const canonicalServers = canonical.servers ?? {};

  const orderedIds = buildCodexOrder(meta?.order ?? [], canonicalServers, existingServers);
  const sections = [];

  if (preamble.trim()) {
    sections.push(preamble.trimEnd());
  }

  for (const serverId of orderedIds) {
    const canonicalServer = canonicalServers[serverId];
    const existingServer = existingServers[serverId];
    const codexServer = buildCodexServer(serverId, canonicalServer, existingServer);
    sections.push(renderCodexSection(serverId, codexServer));
  }

  if (epilogue.trim()) {
    sections.push(epilogue.trimStart());
  }

  const output = sections.filter(Boolean).join('\n\n').trimEnd();
  return `${output}\n`;
}

function buildCodexOrder(originalOrder, canonicalServers, existingServers) {
  const seen = new Set();
  const order = [];

  for (const id of originalOrder ?? []) {
    if ((canonicalServers[id] || existingServers[id]) && !seen.has(id)) {
      order.push(id);
      seen.add(id);
    }
  }

  for (const id of Object.keys(canonicalServers)) {
    if (!seen.has(id)) {
      order.push(id);
      seen.add(id);
    }
  }

  for (const id of Object.keys(existingServers)) {
    if (!seen.has(id)) {
      order.push(id);
      seen.add(id);
    }
  }

  return order;
}

function buildCodexServer(serverId, canonicalServerInput, existingServerInput) {
  if (!canonicalServerInput && existingServerInput) {
    return normalizeCodexExisting(existingServerInput);
  }

  const canonicalServer = normalizeCanonicalServer(fromCodexServer(canonicalServerInput ?? {}));
  const existingServer = normalizeCodexExisting(existingServerInput ?? {});

  const baseCommand = canonicalServer.command ?? existingServer.command ?? 'npx';
  const baseArgs = canonicalServer.args ?? existingServer.args ?? [];
  const baseEnv = mergeEnv(existingServer.env, canonicalServer.env);

  const envWithDefaults = ensureCodexEnv(baseEnv);
  const argsWithFlags = ensureCommandArgs(baseCommand, baseArgs);

  const extras = mergeExtras(existingServer.extra, canonicalServer.extra);
  const timeoutFromExtras = typeof extras.startup_timeout_ms === 'number'
    ? extras.startup_timeout_ms
    : undefined;
  delete extras.startup_timeout_ms;
  const remainingExtras = Object.keys(extras).length > 0 ? extras : undefined;

  const output = {
    command: process.platform === 'win32' ? 'cmd' : baseCommand,
    args: process.platform === 'win32'
      ? ['/c', baseCommand, ...argsWithFlags]
      : argsWithFlags,
    env: envWithDefaults,
    startup_timeout_ms: chooseStartupTimeout(timeoutFromExtras, existingServer.startup_timeout_ms),
    extra: remainingExtras,
  };

  return output;
}

function ensureCodexEnv(envInput) {
  const env = { ...(envInput ?? {}) };

  if (process.platform === 'win32') {
    const systemRoot = env.SystemRoot ?? process.env.SystemRoot ?? 'C:\\Windows';
    const programFiles = env.PROGRAMFILES ?? process.env.PROGRAMFILES ?? 'C:\\Program Files';
    env.SystemRoot = systemRoot;
    env.PROGRAMFILES = programFiles;
  }

  return env;
}

function chooseStartupTimeout(timeoutFromExtras, existingValue) {
  if (typeof timeoutFromExtras === 'number') {
    return timeoutFromExtras;
  }
  if (typeof existingValue === 'number') {
    return existingValue;
  }
  return 60_000;
}

function ensureCommandArgs(command, argsInput) {
  const args = Array.isArray(argsInput) ? argsInput.map(String) : [];

  if (command === 'npx' && !args.some((item) => item === '-y')) {
    return ['-y', ...args];
  }

  return args;
}

function normalizeCodexExisting(existing) {
  if (!existing || typeof existing !== 'object') {
    return {
      command: undefined,
      args: [],
      env: {},
      startup_timeout_ms: undefined,
      extra: {},
    };
  }

  const result = {
    command: typeof existing.command === 'string' ? existing.command : undefined,
    args: Array.isArray(existing.args) ? existing.args.map(String) : [],
    env: normalizeEnv(existing.env),
    startup_timeout_ms: typeof existing.startup_timeout_ms === 'number'
      ? existing.startup_timeout_ms
      : undefined,
    extra: {},
  };

  for (const [key, value] of Object.entries(existing)) {
    if (!['command', 'args', 'env', 'startup_timeout_ms'].includes(key)) {
      result.extra[key] = value;
    }
  }

  return result;
}

function renderCodexSection(serverId, serverConfig) {
  const lines = [`[mcp_servers.${serverId}]`];

  lines.push(`command = "${escapeTomlString(serverConfig.command ?? '')}"`);

  const args = serverConfig.args ?? [];
  if (args.length === 0) {
    lines.push('args = []');
  } else {
    lines.push('args = [');
    args.forEach((value, index) => {
      const suffix = index === args.length - 1 ? '' : ',';
      lines.push(`  "${escapeTomlString(value)}"${suffix}`);
    });
    lines.push(']');
  }

  const envPairs = Object.entries(serverConfig.env ?? {});
  if (envPairs.length === 0) {
    lines.push('env = {}');
  } else {
    const envContent = envPairs
      .map(([key, value]) => `${key}="${escapeTomlString(value)}"`)
      .join(', ');
    lines.push(`env = { ${envContent} }`);
  }

  lines.push(`startup_timeout_ms = ${formatNumberWithUnderscores(serverConfig.startup_timeout_ms ?? 60_000)}`);

  if (serverConfig.extra && Object.keys(serverConfig.extra).length > 0) {
    for (const [key, value] of Object.entries(serverConfig.extra)) {
      if (value === undefined) {
        continue;
      }
      lines.push(`${key} = ${formatTomlValue(value)}`);
    }
  }

  return lines.join('\n');
}

function parseCodexSection(block) {
  const sanitized = stripTomlComments(block);
  const assignments = {};

  const assignmentRegex = /([A-Za-z0-9_\-]+)\s*=\s*([\s\S]*?)(?:(?:\r?\n){1,}(?=[A-Za-z0-9_\-]+\s*=)|$)/g;
  let match;
  while ((match = assignmentRegex.exec(sanitized)) !== null) {
    const key = match[1].trim();
    const valueRaw = match[2].trim();
    assignments[key] = parseTomlValue(valueRaw);
  }

  return assignments;
}

// Strips TOML comments while keeping quoted content intact.
function stripTomlComments(input) {
  const lines = input.split(/\r?\n/);
  const output = [];

  for (const line of lines) {
    let inString = false;
    let escaped = false;
    let result = '';

    for (const char of line) {
      if (escaped) {
        result += char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        result += char;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        result += char;
        continue;
      }

      if (char === '#' && !inString) {
        break;
      }

      result += char;
    }

    output.push(result);
  }

  return output.join('\n');
}

function parseTomlValue(rawValue) {
  if (!rawValue) {
    return undefined;
  }

  if (rawValue.startsWith('[')) {
    return parseTomlArray(rawValue);
  }

  if (rawValue.startsWith('{')) {
    return parseTomlInlineTable(rawValue);
  }

  if (rawValue.startsWith('"') || rawValue.startsWith("'")) {
    return parseTomlString(rawValue);
  }

  if (rawValue === 'true' || rawValue === 'false') {
    return rawValue === 'true';
  }

  return parseTomlNumber(rawValue);
}

function parseTomlArray(value) {
  const normalized = value
    .replace(/\r?\n/g, ' ')
    .replace(/,\s*\]/g, ']');

  try {
    return JSON.parse(normalized);
  } catch (error) {
    throw new Error(`Unable to parse TOML array: ${error.message ?? error}`);
  }
}

function parseTomlInlineTable(value) {
  const normalized = value
    .replace(/([A-Za-z0-9_\-]+)\s*=/g, '"$1":')
    .replace(/\r?\n/g, ' ')
    .replace(/,\s*\}/g, '}');

  try {
    return JSON.parse(normalized);
  } catch (error) {
    throw new Error(`Unable to parse TOML inline table: ${error.message ?? error}`);
  }
}

function parseTomlString(value) {
  try {
    return JSON.parse(value.replace(/'/g, '"'));
  } catch (error) {
    throw new Error(`Unable to parse TOML string: ${error.message ?? error}`);
  }
}

function parseTomlNumber(value) {
  const sanitized = value.replace(/_/g, '');
  if (sanitized.includes('.')) {
    return Number.parseFloat(sanitized);
  }
  return Number.parseInt(sanitized, 10);
}

function formatTomlValue(value) {
  if (typeof value === 'string') {
    return `"${escapeTomlString(value)}"`;
  }
  if (typeof value === 'number') {
    return formatNumberWithUnderscores(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (Array.isArray(value)) {
    const content = value.map((item) => `"${escapeTomlString(String(item))}"`).join(', ');
    return `[${content}]`;
  }
  if (value && typeof value === 'object') {
    const content = Object.entries(value)
      .map(([key, val]) => `${key}="${escapeTomlString(String(val))}"`)
      .join(', ');
    return `{ ${content} }`;
  }
  return '""';
}

function formatNumberWithUnderscores(value) {
  const numeric = Number.isFinite(value) ? Math.round(value) : 0;
  return numeric.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '_');
}

function escapeTomlString(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function fromJsonServer(server) {
  if (!server || typeof server !== 'object') {
    return {
      command: undefined,
      args: [],
      env: {},
      type: undefined,
      transport: undefined,
      cwd: undefined,
      description: undefined,
      extra: {},
    };
  }

  const extras = {};
  for (const [key, value] of Object.entries(server)) {
    if (!KNOWN_JSON_SERVER_KEYS.has(key)) {
      extras[key] = value;
    }
  }

  return {
    command: typeof server.command === 'string' ? server.command : undefined,
    args: Array.isArray(server.args) ? server.args.map(String) : [],
    env: normalizeEnv(server.env),
    type: typeof server.type === 'string' ? server.type : undefined,
    transport: typeof server.transport === 'string' ? server.transport : undefined,
    cwd: typeof server.cwd === 'string' ? server.cwd : undefined,
    description: typeof server.description === 'string' ? server.description : undefined,
    extra: extras,
  };
}

function fromCodexServer(server) {
  if (!server || typeof server !== 'object') {
    return {};
  }

  const extras = {};
  if (server.extra && typeof server.extra === 'object') {
    Object.assign(extras, server.extra);
  }

  let command = typeof server.command === 'string' ? server.command : undefined;
  let args = Array.isArray(server.args) ? server.args.map(String) : [];

  if (command) {
    const normalized = command.toLowerCase();
    const stripped = normalized.endsWith('.exe') ? normalized.slice(0, -4) : normalized;
    if (stripped === 'cmd' && args.length >= 2) {
      const firstArg = String(args[0]).trim().toLowerCase();
      if (firstArg === '/c' || firstArg === '/k') {
        command = String(args[1]);
        args = args.slice(2);
      }
    }
  }

  const result = {
    command,
    args,
    env: normalizeEnv(server.env),
    extra: extras,
  };

  if (typeof server.startup_timeout_ms === 'number') {
    result.extra ??= {};
    result.extra.startup_timeout_ms = server.startup_timeout_ms;
  }

  for (const [key, value] of Object.entries(server)) {
    if (CODEX_EXTRA_BLACKLIST.has(key)) {
      continue;
    }
    if (!['command', 'args', 'env', 'startup_timeout_ms'].includes(key)) {
      result.extra[key] = value;
    }
  }

  if (!result.args?.length && Array.isArray(server.args)) {
    result.args = server.args.map(String);
  }

  if (!result.env && server.env) {
    result.env = normalizeEnv(server.env);
  }

  if (!result.args) {
    result.args = [];
  }

  if (!result.env) {
    result.env = {};
  }

  return result;
}

function normalizeCanonical(canonical) {
  if (!canonical || typeof canonical !== 'object') {
    return { servers: {} };
  }

  const result = { servers: {} };
  for (const [serverId, serverConfig] of Object.entries(canonical.servers ?? {})) {
    result.servers[serverId] = normalizeCanonicalServer(serverConfig);
  }
  return result;
}

function ensureCanonical(canonical) {
  const normalized = normalizeCanonical(canonical);
  return {
    servers: normalized.servers ?? {},
  };
}

function normalizeCanonicalServer(server) {
  const result = {
    command: undefined,
    args: [],
    env: {},
    type: undefined,
    transport: undefined,
    cwd: undefined,
    description: undefined,
    extra: {},
  };

  if (!server || typeof server !== 'object') {
    return result;
  }

  if (server.command) {
    result.command = String(server.command);
  }

  if (Array.isArray(server.args)) {
    result.args = server.args.map(String);
  } else if (typeof server.args === 'string') {
    result.args = [server.args];
  }

  result.env = normalizeEnv(server.env);

  if (server.type) {
    result.type = String(server.type);
  }

  if (!result.type && result.args?.includes('--stdio')) {
    result.type = 'stdio';
  }

  if (server.transport) {
    result.transport = String(server.transport);
  }

  if (server.cwd) {
    result.cwd = String(server.cwd);
  }

  if (server.description) {
    result.description = String(server.description);
  }

  if (server.extra && typeof server.extra === 'object') {
    result.extra = { ...server.extra };
  }

  return pruneUndefined(result);
}

function normalizeEnv(env) {
  if (!env || typeof env !== 'object') {
    return {};
  }

  const result = {};
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined || value === null) {
      continue;
    }
    result[key] = String(value);
  }
  return result;
}

function mergeEnv(base, override) {
  const result = {};
  for (const [key, value] of Object.entries(base ?? {})) {
    if (value !== undefined && value !== null) {
      result[key] = String(value);
    }
  }
  for (const [key, value] of Object.entries(override ?? {})) {
    if (value !== undefined && value !== null) {
      result[key] = String(value);
    }
  }
  return result;
}

function mergeExtras(base, override) {
  return {
    ...(base ?? {}),
    ...(override ?? {}),
  };
}

function pruneUndefined(object) {
  if (!object || typeof object !== 'object') {
    return object;
  }

  const result = {};
  for (const [key, value] of Object.entries(object)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

function clone(value) {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}
