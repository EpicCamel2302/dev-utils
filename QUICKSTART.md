# Quick Start Guide

Get up and running in 3 minutes:

## 1. Install Dependencies

```bash
# Root
bun install

# Web
cd web && bun install && cd ..
```

## 2. Build Frontend

```bash
cd web
bun run build
cd ..
```

## 3. Start Server

```bash
bun start
```

Open [http://localhost:3000](http://localhost:3000)

## Dev Mode (Hot Reload)

Terminal 1:
```bash
bun run dev
```

Terminal 2:
```bash
cd web
bun run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Try It Out

The example scripts are ready to use:
- **Hello World** - Simple test (try entering your name)
- **Port Killer** - Kill process on a port
- **Fresh Install** - Clean npm/yarn/pnpm/bun reinstall
- **Git Branch Cleanup** - Remove merged branches

## Add Your First Script

Create `scripts/test.sh`:

```bash
#!/usr/bin/env bash
# @name My Test Script
# @description Does something cool
# @param input:string:required Your input
# @context terminal
# @category testing

echo "You entered: $1"
```

Make it executable:
```bash
chmod +x scripts/test.sh
```

Refresh the web UI and it will appear!
