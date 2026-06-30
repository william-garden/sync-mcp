import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

import { input, select } from '@inquirer/prompts';
import { formatToolConfig, parseToolConfig, SUPPORTED_TOOL_IDS } from './converters.js';

const TOOLS = [
  {
    id: 'codex',
    name: 'Codex',
    keywords: ['codex', 'openai', 'codex cli'],
    docs: 'https://developers.openai.com/codex/mcp',
    unixPath: ['.codex', 'config.toml'],
    winPath: ['.codex', 'config.toml'],
  },
  {
    id: 'claude',
    name: 'Claude Code',
    keywords: ['claude', 'claude-code', 'claude code', 'anthropic'],
    docs: 'https://code.claude.com/docs/en/mcp',
    unixPath: ['.claude.json'],
    winPath: ['.claude.json'],
  },
  {
    id: 'cursor',
    name: 'Cursor',
    keywords: ['cursor', 'cursor ide'],
    docs: 'https://cursor.com/docs/mcp',
    unixPath: ['.cursor', 'mcp.json'],
    winPath: ['.cursor', 'mcp.json'],
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    keywords: ['gemini', 'gemini cli', 'google', 'gcloud'],
    docs: 'https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md',
    unixPath: ['.gemini', 'settings.json'],
    winPath: ['.gemini', 'settings.json'],
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot CLI',
    keywords: ['copilot', 'copilot cli', 'github', 'gh'],
    docs: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers',
    unixPath: ['.copilot', 'mcp-config.json'],
    winPath: ['.copilot', 'mcp-config.json'],
  },
  {
    id: 'vscode',
    name: 'Visual Studio Code',
    keywords: ['vscode', 'vs code', 'vs-code', 'code'],
    docs: 'https://code.visualstudio.com/docs/agent-customization/mcp-servers',
    macPath: ['Library', 'Application Support', 'Code', 'User', 'mcp.json'],
    unixPath: ['.config', 'Code', 'User', 'mcp.json'],
    winPath: ['Code', 'User', 'mcp.json'],
    winBase: 'appdata',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    keywords: ['opencode', 'open code', 'anomaly'],
    docs: 'https://opencode.ai/docs/mcp-servers',
    unixPath: ['.config', 'opencode', 'opencode.json'],
    winPath: ['opencode', 'opencode.json'],
    winBase: 'localappdata',
  },
];

async function main() {
  const args = process.argv.slice(2);

  try {
    if (args.length === 0) {
      await runInteractiveSync();
    } else if (args.length === 2) {
      await runDirectSync(args[0], args[1]);
    } else {
      printUsage();
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`[sync-mcp] ${error.message ?? error}`);
    process.exitCode = 1;
  }
}

function printUsage() {
  console.log('Usage: npx sync-mcp <source_keyword> <target_keyword>');
  console.log('Run without arguments to start the interactive sync wizard.');
}

async function runDirectSync(sourceKeyword, targetKeyword) {
  const sourceTool = resolveToolByKeyword(sourceKeyword);
  if (!sourceTool) {
    throw new Error(`Unknown source keyword: ${sourceKeyword}`);
  }

  const targetTool = resolveToolByKeyword(targetKeyword);
  if (!targetTool) {
    throw new Error(`Unknown target keyword: ${targetKeyword}`);
  }

  const sourcePath = resolveToolPath(sourceTool);
  const targetPath = resolveToolPath(targetTool);

  console.log(`[sync-mcp] Syncing from ${sourceTool.name} -> ${targetTool.name}`);
  await performSync({ sourcePath, targetPath, sourceTool, targetTool });
}

function clearTerminal() {
  if (!process.stdout.isTTY) {
    return;
  }

  const clearCommand = process.platform === 'win32' ? '\x1Bc' : '\x1B[2J\x1B[3J\x1B[H';
  process.stdout.write(clearCommand);
}

async function runInteractiveSync() {
  clearTerminal();

  console.log("\x1b[41m ***** Welcome to sync-mcp interactive mode.***** \x1b[0m")

  const sourceChoice = await select({
    message: 'Select the configuration source file (选择源配置文件):',
    choices: await buildSourceChoices()
  });

  const { sourcePath, sourceTool } = await resolveSourceSelection(sourceChoice);

  clearTerminal();
  const targetChoice = await select({
    message: 'Select the configuration target file (选择目标配置文件):',
    choices: await buildTargetChoices({
      excludeToolIds: sourceTool ? [sourceTool.id] : [],
      excludePaths: [sourcePath]
    })
  });

  const { targetPath, targetTool } = await resolveTargetSelection(targetChoice);

  clearTerminal();
  await performSync({ sourcePath, targetPath, sourceTool, targetTool });
}

async function buildSourceChoices() {
  const choices = [];
  const detected = await detectExistingConfigs();

  for (const { tool, configPath } of detected) {
    choices.push({
      name: `${tool.name} (${formatPathForDisplay(configPath)})`,
      value: { type: 'tool', toolId: tool.id }
    });
  }

  choices.push({
    name: 'Customize (手动指定路径)',
    value: { type: 'custom-path' }
  });

  return choices;
}

async function buildTargetChoices(options = {}) {
  const { excludeToolIds = [], excludePaths = [] } = options;
  const normalizedExcludePaths = excludePaths
    .filter(Boolean)
    .map((entry) => normalizeForComparison(entry));
  const choices = [];
  const detected = await detectExistingConfigs();

  for (const { tool, configPath } of detected) {
    if (excludeToolIds.includes(tool.id)) {
      continue;
    }

    if (normalizedExcludePaths.includes(normalizeForComparison(configPath))) {
      continue;
    }

    choices.push({
      name: `${tool.name} (${formatPathForDisplay(configPath)})`,
      value: { type: 'tool', toolId: tool.id }
    });
  }

  choices.push({
    name: 'Customize (选择一个目标工具或创建新配置)',
    value: { type: 'custom-tool' }
  });

  return choices;
}

async function resolveSourceSelection(selection) {
  if (selection.type === 'tool') {
    const tool = getToolById(selection.toolId);
    return { sourceTool: tool, sourcePath: resolveToolPath(tool) };
  }

  const customPath = await input({
    message: 'Enter the absolute source file path (输入源配置文件的绝对路径):',
    validate: async (value) => {
      if (!value?.trim()) {
        return 'Path is required.';
      }
      const resolved = path.resolve(value.trim());
      if (!(await fileExists(resolved))) {
        return `File not found: ${resolved}`;
      }
      return true;
    }
  });

  const resolvedPath = path.resolve(customPath.trim());
  const inferredTool = inferToolByPath(resolvedPath);
  if (inferredTool) {
    console.log(`[sync-mcp] Detected ${inferredTool.name} configuration.`);
  }

  return { sourceTool: inferredTool ?? null, sourcePath: resolvedPath };
}

async function resolveTargetSelection(selection) {
  if (selection.type === 'tool') {
    const tool = getToolById(selection.toolId);
    return { targetTool: tool, targetPath: resolveToolPath(tool) };
  }

  const targetToolId = await select({
    message: 'Select the target tool (选择目标工具):',
    choices: TOOLS.map((tool) => ({
      name: `${tool.name} (${formatPathForDisplay(resolveToolPath(tool))})`,
      value: tool.id
    }))
  });

  const targetTool = getToolById(targetToolId);
  return { targetTool, targetPath: resolveToolPath(targetTool) };
}

async function performSync({ sourcePath, targetPath, sourceTool, targetTool }) {
  const resolvedSource = path.resolve(sourcePath);
  const resolvedTarget = path.resolve(targetPath);

  if (resolvedSource === resolvedTarget) {
    console.log('[sync-mcp] Source and target files are identical. No action taken.');
    return;
  }

  if (!(await fileExists(resolvedSource))) {
    throw new Error(`The source configuration file (${formatPathForDisplay(resolvedSource)}) does not exist.`);
  }

  await mkdir(path.dirname(resolvedTarget), { recursive: true });
  const backupLocation = await backupFile(resolvedTarget);

  const canConvert = Boolean(
    sourceTool &&
    targetTool &&
    SUPPORTED_TOOL_IDS.includes(sourceTool.id) &&
    SUPPORTED_TOOL_IDS.includes(targetTool.id)
  );

  let conversionPerformed = false;

  if (canConvert) {
    try {
      const sourceContent = await readFile(resolvedSource, 'utf-8');
      const sourceParsed = parseToolConfig(sourceTool.id, sourceContent);

      let targetMeta = undefined;
      if (await fileExists(resolvedTarget)) {
        try {
          const targetContent = await readFile(resolvedTarget, 'utf-8');
          const targetParsed = parseToolConfig(targetTool.id, targetContent);
          targetMeta = targetParsed.meta;
        } catch (error) {
          console.warn(`[sync-mcp] Warning: unable to parse existing ${targetTool.name} configuration. A fresh file will be generated.`);
        }
      }

      const output = formatToolConfig(targetTool.id, sourceParsed.canonical, { meta: targetMeta });
      await writeFile(resolvedTarget, output, 'utf-8');
      conversionPerformed = true;
    } catch (error) {
      throw new Error(`Failed to convert ${sourceTool.name} configuration for ${targetTool.name}: ${error.message ?? error}`);
    }
  }

  if (!conversionPerformed) {
    await copyFile(resolvedSource, resolvedTarget);
  }

  const sourceLabel = sourceTool ? sourceTool.name : formatPathForDisplay(resolvedSource);
  const targetLabel = targetTool ? targetTool.name : formatPathForDisplay(resolvedTarget);
  const action = conversionPerformed ? 'Converted' : 'Copied';

  console.log(`[sync-mcp] ${action} ${sourceLabel} -> ${targetLabel}.`);
  if (backupLocation) {
    console.log(`[sync-mcp] Backup stored at ${backupLocation}`);
  }
}

async function backupFile(targetPath) {
  if (!(await fileExists(targetPath))) {
    return null;
  }

  const backupRoot = path.join(os.homedir(), '.sync-mcp', 'backup');
  const timestampDir = path.join(backupRoot, String(Date.now()));
  const relativeTarget = path.relative(path.parse(targetPath).root, path.resolve(targetPath));
  const backupDestination = path.join(timestampDir, relativeTarget);

  await mkdir(path.dirname(backupDestination), { recursive: true });
  await copyFile(targetPath, backupDestination);

  return backupDestination;
}

async function detectExistingConfigs() {
  const results = [];

  for (const tool of TOOLS) {
    const configPath = resolveToolPath(tool);
    if (await fileExists(configPath)) {
      results.push({ tool, configPath });
    }
  }

  return results;
}

function resolveToolByKeyword(keyword) {
  if (!keyword) {
    return null;
  }

  const normalized = keyword.trim().toLowerCase();
  return TOOLS.find((tool) =>
    tool.id === normalized ||
    tool.name.toLowerCase() === normalized ||
    tool.keywords.some((alias) => alias.toLowerCase() === normalized)
  ) ?? null;
}

function inferToolByPath(filePath) {
  const normalized = normalizeForComparison(filePath);
  return TOOLS.find((tool) => {
    const defaultPath = normalizeForComparison(resolveToolPath(tool));
    if (defaultPath === normalized) {
      return true;
    }

    return normalized.includes(tool.id) || normalized.includes(tool.name.toLowerCase().replace(/\s+/g, ''));
  }) ?? null;
}

function getToolById(id) {
  const tool = TOOLS.find((entry) => entry.id === id);
  if (!tool) {
    throw new Error(`Unsupported tool identifier: ${id}`);
  }
  return tool;
}

async function fileExists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveToolPath(tool) {
  if (process.platform === 'win32') {
    const base = tool.winBase === 'localappdata' ? getLocalAppDataDirectory() : getAppDataDirectory();
    return path.resolve(path.join(base, ...tool.winPath));
  }

  const segments = process.platform === 'darwin' && tool.macPath
    ? tool.macPath
    : tool.unixPath;

  return path.resolve(path.join(os.homedir(), ...segments));
}

function getAppDataDirectory() {
  if (process.env.APPDATA) {
    return process.env.APPDATA;
  }
  return path.join(os.homedir(), 'AppData', 'Roaming');
}

function getLocalAppDataDirectory() {
  if (process.env.LOCALAPPDATA) {
    return process.env.LOCALAPPDATA;
  }
  return path.join(os.homedir(), 'AppData', 'Local');
}

function normalizeForComparison(filePath) {
  return path.resolve(filePath).toLowerCase().replace(/\\+/g, '/');
}

function formatPathForDisplay(filePath) {
  const resolved = path.resolve(filePath);
  const home = os.homedir();
  if (resolved.startsWith(home)) {
    return `~${resolved.slice(home.length)}`;
  }
  return resolved;
}

main();








