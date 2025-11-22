import { join } from 'path';
import { appendFile, readFile, writeFile } from 'fs/promises';

const LOG_FILE = join(import.meta.dir, '../logs/scripts.log');
const MAX_LINES = 35000; // Keep last ~35k lines (approximately 5MB)

interface LogEntry {
  timestamp: string;
  script: string;
  params: Record<string, any>;
  output: string[];
  exitCode?: number;
}

/**
 * Log script execution to file
 */
export async function logExecution(
  scriptName: string,
  params: Record<string, any>,
  output: string[],
  exitCode?: number
) {
  const timestamp = new Date().toISOString();

  const logLines = [
    '',
    '='.repeat(80),
    `[${timestamp}] Executed: ${scriptName}`,
    `Parameters: ${JSON.stringify(params)}`,
    `Exit Code: ${exitCode ?? 'N/A'}`,
    '-'.repeat(80),
    ...output,
    '='.repeat(80),
    ''
  ];

  const logContent = logLines.join('\n');

  try {
    // Append to log file
    await appendFile(LOG_FILE, logContent);

    // Trim log file if it's too large
    await trimLogFile();
  } catch (error) {
    console.error('Error writing to log file:', error);
  }
}

/**
 * Trim log file to keep only the last MAX_LINES lines
 */
async function trimLogFile() {
  try {
    const file = Bun.file(LOG_FILE);
    if (!(await file.exists())) return;

    const content = await file.text();
    const lines = content.split('\n');

    if (lines.length > MAX_LINES) {
      const trimmed = lines.slice(-MAX_LINES).join('\n');
      await writeFile(LOG_FILE, trimmed);
    }
  } catch (error) {
    console.error('Error trimming log file:', error);
  }
}

/**
 * Get recent log entries
 */
export async function getRecentLogs(count: number = 10): Promise<string> {
  try {
    const file = Bun.file(LOG_FILE);
    if (!(await file.exists())) return 'No logs yet';

    const content = await file.text();
    const lines = content.split('\n');

    // Take last N lines
    const recent = lines.slice(-count * 10).join('\n'); // Approximate lines per entry
    return recent;
  } catch (error) {
    return `Error reading logs: ${error}`;
  }
}
