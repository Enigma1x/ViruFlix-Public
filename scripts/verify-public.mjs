import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ignored = new Set(['node_modules', '.git', 'coverage', 'release', 'releases']);
const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (ignored.has(entry)) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else files.push(full);
  }
}
walk(root);
const textFiles = files.filter((file) => !file.endsWith(path.join('scripts', 'verify-public.mjs')) && !/\.(png|jpg|jpeg|gif|ico|woff2|mp4|zip|exe|dmg|AppImage)$/i.test(file));
const content = textFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
const failures = [];
for (const file of files) if (/^\.env(?:\.|$)/i.test(path.basename(file)) && path.basename(file) !== '.env.example') failures.push(`real env file: ${path.relative(root, file)}`);
const forbidden = [
  [/sb_(?:publishable|secret)_[A-Za-z0-9_-]{12,}/i, 'Supabase key value'],
  [/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\./, 'JWT-like token'],
  [/(?:TMDB_API_KEY|TMDB_ACCESS_TOKEN|MAL_CLIENT_ID|SUPABASE_SERVICE_ROLE_KEY)\s*[:=]\s*['"][A-Za-z0-9_-]{12,}['"]/i, 'provider credential assignment'],
  [/cuevana|webtorrent|torrent|scraper/i, 'removed provider or scraper reference']
];
for (const [pattern, label] of forbidden) if (pattern.test(content)) failures.push(label);
if (!existsSync(path.join(root, 'dist', 'index.html'))) failures.push('dist/index.html is missing; run npm run build:public');
if (failures.length) { console.error('Public verification failed:\n- ' + failures.join('\n- ')); process.exit(1); }
console.log(`Public verification passed: ${files.length} files scanned.`);
