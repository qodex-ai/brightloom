import { fileURLToPath } from 'node:url';
import path from 'node:path';

// This file lives at src/server/ in development and dist/server/ after a build,
// so the repository root is two levels up in both cases.
const here = path.dirname(fileURLToPath(import.meta.url));

export const rootDir = path.resolve(here, '..', '..');
export const dataDir = path.join(rootDir, 'data');
export const uiDistDir = path.join(rootDir, 'dist', 'ui');
export const openapiFile = path.join(rootDir, 'openapi', 'openapi.json');

export function databaseFile(): string {
  const override = process.env.BRIGHTLOOM_DB;
  if (override) return path.resolve(override);
  return path.join(dataDir, 'brightloom.db');
}
