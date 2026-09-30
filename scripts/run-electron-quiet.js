/**
 * Ejecuta Electron filtrando errores conocidos e inofensivos de Chromium en stderr.
 * Oculta Autofill.enable, Autofill.setAddresses y blink.mojom.Widget para reducir ruido.
 *
 * Uso: node scripts/run-electron-quiet.js
 * (Se usa desde electron:dev cuando se quiere terminal más limpia)
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const FILTER_PATTERNS = [
  'Autofill.enable',
  'Autofill.setAddresses',
  'Request Autofill',
  " wasn't found",
  'blink.mojom.Widget',
  'interface_endpoint_client.cc'
];

function shouldFilter(line) {
  const s = String(line);
  return FILTER_PATTERNS.some(p => s.includes(p));
}

const electron = spawn('npx', ['electron', '.'], {
  cwd: rootDir,
  stdio: ['inherit', 'inherit', 'pipe'],
  shell: true
});

electron.stderr.on('data', (data) => {
  const lines = String(data).split('\n');
  for (const line of lines) {
    if (line.trim() && !shouldFilter(line)) {
      process.stderr.write(line + '\n');
    }
  }
});

electron.on('close', (code) => {
  process.exit(code ?? 0);
});
