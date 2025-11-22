# Dev Utils

A web-based script runner for developer utilities. Create scripts, run them from a clean web interface, with parameter inputs and real-time output logging.

## Features

- 🎯 **Web UI** - Browse and run scripts from your browser
- 📝 **Parameter Forms** - Auto-generated forms from script metadata
- 📊 **Real-time Output** - Stream stdout/stderr directly to the UI
- 📋 **Execution Logging** - All script runs logged to `scripts.log` (auto-trimmed to ~5MB)
- 🏷️ **Categories** - Organize scripts by category
- ⚡ **Fast** - Built with Bun for maximum performance
- 🔍 **Auto-discovery** - Just drop scripts in the `scripts/` folder

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) installed on your system

### Installation

1. Install dependencies:

```bash
# Install root dependencies
bun install

# Install web dependencies
cd web
bun install
cd ..
```

2. Build the frontend:

```bash
cd web
bun run build
cd ..
```

3. Start the server:

```bash
bun start
```

4. Open your browser to [http://localhost:3000](http://localhost:3000)

## Development Mode

For development with hot reload:

```bash
# Terminal 1 - Run the Bun server with watch mode
bun run dev

# Terminal 2 - Run Vite dev server
cd web
bun run dev
```

Then open [http://localhost:5173](http://localhost:5173) (Vite proxies API requests to port 3000)

## Creating Scripts

Scripts are auto-discovered from the `scripts/` directory. Add metadata at the top of your script using comment annotations:

### Bash Script Example

```bash
#!/usr/bin/env bash
# @name Port Killer
# @description Kill processes running on a specific port
# @param port:number:required The port number to kill
# @context terminal
# @category debugging

PORT=$1
# ... rest of your script
```

### JavaScript/TypeScript Example

```javascript
#!/usr/bin/env bun
/**
 * @name Hello World
 * @description Simple greeting script
 * @param name:string:required Your name
 * @param excited:boolean:optional Add excitement
 * @context terminal
 * @category testing
 */

const name = process.argv[2];
// ... rest of your script
```

### Metadata Tags

- `@name` - Display name in the UI (required)
- `@description` - What the script does (required)
- `@category` - Category for grouping (default: "uncategorized")
- `@context` - Either "terminal" or "browser" (default: "terminal")
- `@param` - Parameter definition (see below)

### Parameter Format

```
@param name:type:required|optional[:options] Description
```

**Types:**
- `string` - Text input
- `number` - Number input
- `boolean` - Checkbox
- `select` - Dropdown (requires options)

**Examples:**
```bash
# @param port:number:required The port number to kill
# @param path:string:optional Path to project (defaults to current dir)
# @param manager:select:optional:npm,yarn,pnpm Package manager to use
# @param verbose:boolean:optional Enable verbose output
```

## Project Structure

```
dev-utils/
├── scripts/              # Your executable scripts
│   ├── port-killer.sh
│   ├── fresh-install.sh
│   └── ...
├── server/              # Bun backend
│   ├── index.ts        # Main server
│   ├── parser.ts       # Script metadata parser
│   ├── executor.ts     # Script execution
│   └── types.ts        # TypeScript types
├── web/                # Vue frontend
│   ├── src/
│   │   ├── App.vue
│   │   ├── components/
│   │   └── main.js
│   ├── dist/           # Built files (served by Bun)
│   └── package.json
└── package.json        # Root package.json
```

## Included Example Scripts

- **Port Killer** - Kill processes on a specific port
- **Fresh Install** - Clean reinstall of node_modules
- **Git Branch Cleanup** - Remove merged branches
- **Hello World** - Simple test script

## Adding Your Own Scripts

1. Create a new `.sh`, `.js`, or `.ts` file in the `scripts/` directory
2. Add metadata annotations at the top
3. Make it executable: `chmod +x scripts/your-script.sh`
4. Refresh the web UI - it will auto-discover your script!

## Logging

All script executions are automatically logged to `scripts.log` in the root directory. The log file includes:
- Timestamp
- Script name and parameters
- Complete output (stdout/stderr)
- Exit code

The log file is automatically trimmed to keep only the last ~35,000 lines (approximately 5MB) to prevent disk space issues.

**Viewing logs:**
```bash
# View the entire log
cat scripts.log

# View recent executions
tail -n 100 scripts.log

# Follow in real-time
tail -f scripts.log
```

## Configuration

### Change Server Port

Edit `server/index.ts`:
```typescript
const PORT = 3000; // Change this
```

### Change Scripts Directory

Edit `server/index.ts`:
```typescript
const SCRIPTS_DIR = join(import.meta.dir, '../scripts'); // Change this
```

### Change Log File Settings

Edit `server/logger.ts`:
```typescript
const MAX_LINES = 35000; // Maximum lines to keep in log file (~5MB)
```

## Security Note

This tool is designed for **localhost use only**. Do not expose it to the internet without adding proper authentication and security measures.

## Tips

- Use meaningful categories to organize your scripts
- Add helpful descriptions to parameters
- Test your scripts standalone before adding to dev-utils
- Use the `dryRun` parameter pattern for destructive operations
- Scripts receive parameters as command-line arguments in order

## Troubleshooting

**Scripts not appearing?**
- Check that the script has proper metadata (`@name` and `@description` are required)
- Ensure the file has a `.sh`, `.js`, or `.ts` extension
- Check the server console for parsing errors

**Script won't execute?**
- Verify the script is executable (`chmod +x scripts/your-script.sh`)
- Check for syntax errors by running the script directly
- Look for errors in the output log in the UI

**Output not streaming?**
- Ensure your script writes to stdout/stderr
- Flush output buffers if needed
- Check browser console for SSE connection issues

## Future Ideas

See [ideas.md](ideas.md) for a list of potential scripts to implement.

## License

MIT
