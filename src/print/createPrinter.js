import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';

/**
 * Печать PDF через CUPS: байты PDF отправляются в stdin процесса `lp` —
 * то есть печать реализована потоково (Pipes & Filters). Принтер по умолчанию
 * берётся из окружения PRINTER, иначе используется системный принтер по
 * умолчанию (`lp` без -d).
 *
 * @param {{ printer?: string, command?: string }} [options]
 */
export function createPrinter({ printer = process.env.PRINTER, command = 'lp' } = {}) {
  return {
    /**
     * Отправляет PDF на печать. Принимает Buffer или Readable.
     * @param {Buffer|import('node:stream').Readable} pdf
     * @param {{ title?: string }} [opts]
     * @returns {Promise<void>}
     */
    print(pdf, { title } = {}) {
      const args = [];
      if (printer) args.push('-d', printer);
      if (title) args.push('-t', title);

      return new Promise((resolve, reject) => {
        const child = spawn(command, args, { stdio: ['pipe', 'ignore', 'pipe'] });

        let stderr = '';
        child.stderr.on('data', (d) => { stderr += d; });
        child.on('error', reject);
        child.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`${command} вышел с кодом ${code}: ${stderr.trim()}`));
        });

        const source = Buffer.isBuffer(pdf) ? Readable.from(pdf) : pdf;
        source.on('error', reject);
        source.pipe(child.stdin);
      });
    },
  };
}

export default createPrinter;
