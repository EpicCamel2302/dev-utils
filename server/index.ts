import { join } from 'path';
import { discoverScripts } from './parser';
import { executeScript } from './executor';
import { ScriptMetadata } from './types';

const PORT = 3000;
const SCRIPTS_DIR = join(import.meta.dir, '../scripts');
const WEB_DIR = join(import.meta.dir, '../web/dist');

// Cache for scripts (re-scan on each request in dev mode)
let scriptsCache: ScriptMetadata[] = [];

async function loadScripts() {
  scriptsCache = await discoverScripts(SCRIPTS_DIR);
  console.log(`Loaded ${scriptsCache.length} scripts`);
}

// Load scripts on startup
await loadScripts();

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // API Routes
    if (url.pathname === '/api/scripts') {
      // Reload scripts in dev mode
      await loadScripts();

      return new Response(JSON.stringify(scriptsCache), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname.startsWith('/api/execute/')) {
      const scriptName = url.pathname.split('/api/execute/')[1];
      const script = scriptsCache.find(s => s.fileName === scriptName);

      if (!script) {
        return new Response('Script not found', { status: 404 });
      }

      try {
        const body = await req.json();
        const params = body.params || {};
        const workingDir = body.workingDir;

        // Log to console
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🚀 Executing: ${script.name}`);
        console.log(`📝 Parameters:`, params);
        console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
        console.log('='.repeat(60));

        const { stream } = executeScript(script, params, workingDir);

        // Convert ReadableStream to Server-Sent Events
        const sseStream = new ReadableStream({
          async start(controller) {
            const reader = stream.getReader();
            const encoder = new TextEncoder();

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // Send as SSE format
                const sseData = `data: ${JSON.stringify({ output: value })}\n\n`;
                controller.enqueue(encoder.encode(sseData));
              }

              // Send completion event
              const doneData = `data: ${JSON.stringify({ done: true })}\n\n`;
              controller.enqueue(encoder.encode(doneData));
              controller.close();
            } catch (error) {
              const errorData = `data: ${JSON.stringify({ error: String(error) })}\n\n`;
              controller.enqueue(encoder.encode(errorData));
              controller.close();
            }
          }
        });

        return new Response(sseStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          }
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Serve static files from web/dist
    const filePath = join(WEB_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
    const file = Bun.file(filePath);

    if (await file.exists()) {
      return new Response(file);
    }

    // Fallback to index.html for SPA routing
    const indexFile = Bun.file(join(WEB_DIR, 'index.html'));
    if (await indexFile.exists()) {
      return new Response(indexFile);
    }

    return new Response('Not found', { status: 404 });
  }
});

console.log(`🚀 Dev Utils server running at http://localhost:${PORT}`);
console.log(`📁 Scripts directory: ${SCRIPTS_DIR}`);
console.log(`🌐 Web directory: ${WEB_DIR}`);
