import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { getDb } from './db.js';
import { uiIsBuilt } from './static.js';

const port = Number(process.env.PORT ?? 4100);

getDb();

const app = createApp();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Brightloom is listening on http://localhost:${info.port}`);
  if (!uiIsBuilt()) {
    console.log('The interface is not built. Run pnpm dev for the Vite server, or pnpm build.');
  }
});
