import { spawn } from 'bun';
import { ScriptMetadata } from './types';
import { logExecution } from './logger';

export interface ExecutionStream {
  stream: ReadableStream<string>;
  process: ReturnType<typeof spawn>;
}

/**
 * Execute a script with given parameters and return a stream of output
 */
export function executeScript(
  script: ScriptMetadata,
  params: Record<string, any>,
  workingDir?: string
): ExecutionStream {
  // Build command arguments
  const args: string[] = [];

  for (const param of script.params) {
    const value = params[param.name];
    if (param.required && (value === undefined || value === null || value === '')) {
      throw new Error(`Required parameter '${param.name}' is missing`);
    }
    if (value !== undefined && value !== null && value !== '') {
      args.push(String(value));
    }
  }

  // Determine command based on file extension
  let command: string;
  let cmdArgs: string[];

  if (script.fileName.endsWith('.sh')) {
    command = 'bash';
    cmdArgs = [script.filePath, ...args];
  } else if (script.fileName.endsWith('.js')) {
    command = 'bun';
    cmdArgs = ['run', script.filePath, ...args];
  } else if (script.fileName.endsWith('.ts')) {
    command = 'bun';
    cmdArgs = ['run', script.filePath, ...args];
  } else {
    throw new Error(`Unsupported script type: ${script.fileName}`);
  }

  // Spawn the process
  const proc = spawn({
    cmd: [command, ...cmdArgs],
    cwd: workingDir || process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'ignore',
  });

  // Track output for logging
  const outputLines: string[] = [];

  // Create a readable stream that combines stdout and stderr
  const stream = new ReadableStream<string>({
    async start(controller) {
      try {
        // Read stdout
        if (proc.stdout) {
          const reader = proc.stdout.getReader();
          const decoder = new TextDecoder();

          (async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const text = decoder.decode(value, { stream: true });
                outputLines.push(text);
                controller.enqueue(text);
              }
            } catch (error) {
              console.error('Error reading stdout:', error);
            }
          })();
        }

        // Read stderr
        if (proc.stderr) {
          const reader = proc.stderr.getReader();
          const decoder = new TextDecoder();

          (async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const text = `[stderr] ${decoder.decode(value, { stream: true })}`;
                outputLines.push(text);
                controller.enqueue(text);
              }
            } catch (error) {
              console.error('Error reading stderr:', error);
            }
          })();
        }

        // Wait for process to exit
        await proc.exited;
        const exitMessage = `\n[Process exited with code ${proc.exitCode}]\n`;
        outputLines.push(exitMessage);
        controller.enqueue(exitMessage);
        controller.close();

        // Log execution after completion
        logExecution(script.name, params, outputLines, proc.exitCode || 0);
      } catch (error) {
        const errorMessage = `\n[Error: ${error}]\n`;
        outputLines.push(errorMessage);
        controller.enqueue(errorMessage);
        controller.close();

        // Log error
        logExecution(script.name, params, outputLines);
      }
    },
    cancel() {
      proc.kill();
      // Log cancellation
      outputLines.push('[Process killed by user]');
      logExecution(script.name, params, outputLines);
    }
  });

  return { stream, process: proc };
}
