import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
export const CAPTURES_DIR = join(here, '..', '..', 'captures');

const START = 0x41; // 'A'
const isTerminator = (b) => b <= 0x1f || b === 0x7f;

/** Список .bin-захватов (полные пути). */
export function listBinCaptures() {
  return readdirSync(CAPTURES_DIR)
    .filter((f) => f.endsWith('.bin'))
    .sort()
    .map((f) => join(CAPTURES_DIR, f));
}

/** Извлекает тела кадров (строки, начинающиеся с 'A') из буфера захвата. */
export function extractFrames(buffer) {
  const frames = [];
  let buf = buffer;
  while (true) {
    const start = buf.indexOf(START);
    if (start === -1) break;
    buf = buf.subarray(start);
    let term = -1;
    for (let i = 1; i < buf.length; i++) {
      if (isTerminator(buf[i])) { term = i; break; }
    }
    if (term === -1) break;
    frames.push(buf.subarray(0, term).toString('ascii'));
    buf = buf.subarray(term + 1);
  }
  return frames;
}

/** Читает .bin и возвращает тела кадров. */
export function readBinFrames(binPath) {
  return extractFrames(readFileSync(binPath));
}

/**
 * Восстанавливает реальные chunk'и из .jsonl-захвата (по полю hex), чтобы
 * проигрывать поток ровно по тем границам фрагментов, как пришли с устройства.
 */
export function replayChunks(jsonlPath) {
  return readFileSync(jsonlPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const { hex } = JSON.parse(line);
      return Buffer.from(hex.split(' ').map((h) => parseInt(h, 16)));
    });
}
