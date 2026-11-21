import { pipeline } from 'node:stream';
import { createReadableStream } from './src/serial/createReadableStream.js';
import { createParserStream } from './src/protocol/createParserStream.js';
import { parseRecord } from './src/protocol/parseRecord.js';
import { createPdfEngine } from './src/render/pdfEngine.js';
import { createPrinter } from './src/print/createPrinter.js';
import { createRendererStream } from './src/render/createRendererStream.js';

// =============================================================================
// Конвейер (Pipes & Filters):
//   SerialPort (Readable)  →  Parser (Transform)  →  Renderer (Writable)
//      сырые байты            кадры + parse →JSON     JSON → HTML → PDF → печать
//
// PDF живёт только в памяти и уходит прямо в `lp` — на диск не сохраняется.
// Врач и вид животного по проводу не приходят — задаются в env-файле службы.
// =============================================================================

const meta = {
  // TODO: вид брать из кадра анализатора (цифра «режима» в parseRecord), когда
  //       будет известна кодировка; пока — из env, по нему же выбираются референсы.
  species: process.env.SPECIES || '',
  doctor: process.env.DOCTOR || '',
};

const source = createReadableStream();
const parser = createParserStream({ parse: parseRecord });
const pdfEngine = createPdfEngine();
const basePrinter = createPrinter();

const printer = {
  async print(pdf, opts) {
    await basePrinter.print(pdf, opts);
    console.log(`Отправлено на печать: ${opts?.title}`);
  },
};

const renderer = createRendererStream({
  pdfEngine,
  printer,
  meta,
  // Сбой печати/рендера одной пробы не должен останавливать приём следующих.
  onError: (err, record) =>
    console.error(`Проба ${record?.sample} (${record?.date} ${record?.time}): ошибка — ` +
      `${err.message}. Переотправьте результат с анализатора.`),
});

source.on('open', () => console.log(`Слушаю ${source.path} (9600 7O1)`));
source.on('close', () => console.error('Порт закрыт (анализатор/кабель отключён?)'));
parser.on('recordError', (err, frame) =>
  console.error('Parse error:', err.message, '| frame:', JSON.stringify(frame)));

pipeline(source, parser, renderer, async (err) => {
  await pdfEngine.close().catch(() => {});
  if (err) {
    console.error('Pipeline error:', err.message);
    process.exit(1);
  }
});

const shutdown = async () => {
  await pdfEngine.close().catch(() => {});
  if (source.isOpen) source.close(() => process.exit(0));
  else process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
