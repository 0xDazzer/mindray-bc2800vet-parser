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
// Метаданные пациента/вида не приходят по проводу — задаются здесь (в реальном
// приложении их вводит оператор перед запуском пробы).
// =============================================================================

const meta = {
  species: process.env.SPECIES || 'DOG',
  patient: process.env.PATIENT || '',
  sex: process.env.SEX || '',
  age: process.env.AGE || '',
  client: process.env.CLIENT || '',
  doctor: process.env.DOCTOR || '',
  operator: process.env.OPERATOR || '',
};

const source = createReadableStream();
const parser = createParserStream({ parse: parseRecord });
const pdfEngine = createPdfEngine();
const printer = createPrinter();
const renderer = createRendererStream({ pdfEngine, printer, meta });

source.on('open', () => console.log('Listening on serial port as 9600 7O1'));
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
