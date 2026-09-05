import fs from 'node:fs';
import path from 'node:path';
import { openapiDocument } from '../server/openapi.js';
import { openapiFile } from '../server/paths.js';

fs.mkdirSync(path.dirname(openapiFile), { recursive: true });
fs.writeFileSync(openapiFile, `${JSON.stringify(openapiDocument, null, 2)}\n`);
console.log(`Wrote ${openapiFile}`);
