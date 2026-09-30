import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vite = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const env = { ...process.env, VITE_DEMO_MODE: 'true', VITE_PUBLIC_API_BASE_URL: process.env.VITE_PUBLIC_API_BASE_URL || '' };
const result = spawnSync(process.execPath, [vite, 'build'], { cwd: root, env, stdio: 'inherit' });
process.exit(result.status ?? 1);
