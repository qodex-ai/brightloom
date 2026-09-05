import fs from 'node:fs';
import path from 'node:path';
import type { Context } from 'hono';
import { uiDistDir } from './paths.js';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

export function uiIsBuilt(): boolean {
  return fs.existsSync(path.join(uiDistDir, 'index.html'));
}

export function serveUi(c: Context): Response {
  const requested = decodeURIComponent(new URL(c.req.url).pathname);
  const candidate = path.join(uiDistDir, requested);
  const inside = candidate.startsWith(uiDistDir + path.sep);

  if (inside && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    const type = TYPES[path.extname(candidate)] ?? 'application/octet-stream';
    return new Response(fs.readFileSync(candidate), { headers: { 'content-type': type } });
  }

  const index = path.join(uiDistDir, 'index.html');
  if (!fs.existsSync(index)) {
    return new Response('The interface has not been built. Run pnpm build.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
  return new Response(fs.readFileSync(index), {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
