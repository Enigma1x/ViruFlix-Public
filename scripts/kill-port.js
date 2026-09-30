/**
 * Script para matar procesos en un puerto específico
 * 
 * Uso: node scripts/kill-port.js [puerto]
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const port = process.argv[2] || '5173';

async function killPort() {
  try {
    if (process.platform === 'win32') {
      // Windows
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      const lines = stdout.split('\n').filter(line => line.trim());
      const pids = new Set();
      
      lines.forEach(line => {
        const match = line.match(/\s+(\d+)\s*$/);
        if (match) {
          pids.add(match[1]);
        }
      });
      
      if (pids.size === 0) {
        console.log(`Puerto ${port} no está en uso`);
        return;
      }
      
      for (const pid of pids) {
        try {
          await execAsync(`taskkill /PID ${pid} /F`);
          console.log(`Proceso ${pid} terminado`);
        } catch (err) {
          // Ignorar errores si el proceso ya no existe
        }
      }
    } else {
      // Linux/Mac
      try {
        await execAsync(`lsof -ti:${port} | xargs kill -9`);
        console.log(`Procesos en puerto ${port} terminados`);
      } catch (error) {
        console.log(`Puerto ${port} no está en uso`);
      }
    }
  } catch (error) {
    // Si no hay procesos, está bien
    if (!error.message.includes('no está en uso')) {
      console.log(`Puerto ${port} no está en uso o ya fue liberado`);
    }
  }
}

killPort();

