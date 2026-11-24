import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { createParserStream } from '../src/protocol/createParserStream.js';
import { parseRecord } from '../src/protocol/parseRecord.js';
import { createPdfEngine } from '../src/render/pdfEngine.js';
import { createRendererStream } from '../src/render/createRendererStream.js';
import { listBinCaptures } from '../test/helpers/captures.js';

// Оффлайновый end-to-end прогон БЕЗ устройства и принтера: берём реальный
// .bin-захват как источник, проводим его через тот же parser → renderer, но
// принтер подменяем на запись PDF в out/ (Dependency Inversion в действии).

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'out');
mkdirSync(outDir, { recursive: true });

const binPath = process.argv[2] || listBinCaptures()[0];
if (!binPath) {
  console.error('Нет .bin-захватов в captures/');
  process.exit(1);
}

const pdfEngine = createPdfEngine();

// Принтер-заглушка: вместо CUPS пишет PDF на диск.
const filePrinter = {
  print(pdf, { title } = {}) {
    const file = join(outDir, `${title || 'report'}.pdf`);
    writeFileSync(file, pdf);
    console.log('PDF →', file, `(${pdf.length} bytes)`);
    return Promise.resolve();
  },
};

// Как в боевом index.js: вид — из кадра, остальное вписывается от руки.
const meta = {};

const source = Readable.from([readFileSync(binPath)]);
const parser = createParserStream({ parse: parseRecord });
const renderer = createRendererStream({ pdfEngine, printer: filePrinter, meta });

parser.on('recordError', (err) => console.error('Parse error:', err.message));

try {
  await pipeline(source, parser, renderer);
  console.log('Готово.');
} finally {
  await pdfEngine.close();
}
