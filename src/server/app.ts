import { Hono } from 'hono';
import { ApiError, errorBody, sendError } from './errors.js';
import { openapiDocument } from './openapi.js';
import { authRoutes } from './routes/auth.js';
import { billingRoutes } from './routes/billing.js';
import { miscRoutes } from './routes/misc.js';
import { orgRoutes } from './routes/org.js';
import { projectRoutes } from './routes/projects.js';
import { syncRoutes } from './routes/sync.js';
import { taskRoutes } from './routes/tasks.js';
import { serveUi } from './static.js';
import type { AppEnv } from './types.js';

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
    const origin = c.req.header('Origin');
    if (origin) {
      c.header('Access-Control-Allow-Origin', origin);
      c.header('Access-Control-Allow-Credentials', 'true');
      c.header('Access-Control-Allow-Headers', 'Content-Type');
      c.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
      c.header('Vary', 'Origin');
    }
    if (c.req.method === 'OPTIONS') return c.body(null, 204);
    return next();
  });

  const api = new Hono<AppEnv>();
  api.route('/', authRoutes);
  api.route('/', orgRoutes);
  api.route('/', projectRoutes);
  api.route('/', taskRoutes);
  api.route('/', syncRoutes);
  api.route('/', billingRoutes);
  api.route('/', miscRoutes);
  app.route('/api/v1', api);

  app.get('/openapi.json', (c) => c.json(openapiDocument));

  app.notFound((c) => {
    if (c.req.path.startsWith('/api/')) {
      return c.json(errorBody('not_found', 'No endpoint matches that path'), 404);
    }
    return serveUi(c);
  });

  app.onError((err, c) => {
    if (err instanceof ApiError) return sendError(c, err);
    console.error(err);
    return c.json(
      { error: { code: 'internal_error', message: err.message, stack: err.stack } },
      500,
    );
  });

  return app;
}
