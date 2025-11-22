import { ScriptMetadata, ScriptParam } from './types';
import { readdir } from 'fs/promises';
import { join } from 'path';

/**
 * Parse script metadata from comment blocks
 * Supports both bash (#) and JS (//) comment styles
 */
export async function parseScriptMetadata(filePath: string): Promise<ScriptMetadata | null> {
  try {
    const file = Bun.file(filePath);
    const content = await file.text();
    const lines = content.split('\n');

    const metadata: Partial<ScriptMetadata> = {
      params: [],
      context: 'terminal',
      category: 'uncategorized',
      filePath,
      fileName: filePath.split('/').pop() || ''
    };

    for (const line of lines) {
      const trimmed = line.trim();

      // Match @tag format in comments
      const bashMatch = trimmed.match(/^#\s*@(\w+)\s+(.+)$/);
      const jsMatch = trimmed.match(/^(?:\/\/|\/?\*)\s*@(\w+)\s+(.+)$/);
      const match = bashMatch || jsMatch;

      if (!match) continue;

      const [, tag, value] = match;

      switch (tag) {
        case 'name':
          metadata.name = value.trim();
          break;
        case 'description':
          metadata.description = value.trim();
          break;
        case 'category':
          metadata.category = value.trim();
          break;
        case 'context':
          if (value === 'terminal' || value === 'browser') {
            metadata.context = value;
          }
          break;
        case 'param':
          const param = parseParam(value);
          if (param) {
            metadata.params!.push(param);
          }
          break;
      }
    }

    // Validate required fields
    if (!metadata.name || !metadata.description) {
      return null;
    }

    return metadata as ScriptMetadata;
  } catch (error) {
    console.error(`Error parsing script ${filePath}:`, error);
    return null;
  }
}

/**
 * Parse parameter definition
 * Format: name:type:required[:options] description
 * Example: port:number:required The port number
 * Example: manager:select:optional:npm,yarn,pnpm Package manager
 */
function parseParam(value: string): ScriptParam | null {
  const parts = value.split(' ');
  const definition = parts[0];
  const description = parts.slice(1).join(' ');

  const defParts = definition.split(':');
  if (defParts.length < 3) return null;

  const [name, type, requiredStr, optionsStr] = defParts;

  const param: ScriptParam = {
    name,
    type: type as ScriptParam['type'],
    required: requiredStr === 'required',
    description
  };

  if (optionsStr && type === 'select') {
    param.options = optionsStr.split(',');
  }

  return param;
}

/**
 * Discover all scripts in the scripts directory
 */
export async function discoverScripts(scriptsDir: string): Promise<ScriptMetadata[]> {
  const scripts: ScriptMetadata[] = [];

  try {
    const files = await readdir(scriptsDir);

    for (const file of files) {
      // Skip non-script files
      if (!file.endsWith('.sh') && !file.endsWith('.js') && !file.endsWith('.ts')) {
        continue;
      }

      const filePath = join(scriptsDir, file);
      const metadata = await parseScriptMetadata(filePath);

      if (metadata) {
        scripts.push(metadata);
      }
    }
  } catch (error) {
    console.error('Error discovering scripts:', error);
  }

  return scripts;
}
