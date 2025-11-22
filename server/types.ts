export interface ScriptMetadata {
  name: string;
  description: string;
  category: string;
  context: 'terminal' | 'browser';
  params: ScriptParam[];
  filePath: string;
  fileName: string;
}

export interface ScriptParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  required: boolean;
  description?: string;
  options?: string[]; // For select type
  default?: string | number | boolean;
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode?: number;
}
