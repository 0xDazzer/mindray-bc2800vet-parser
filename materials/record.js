const { SerialPort } = require('serialport');
const fs = require('fs');
const path = require('path');

const DEVICE = process.env.DEVICE || '/dev/ttyUSB0';

// Скрипт-рекордер: читает сырые байты с serialport и пишет их на диск,
// чтобы потом использовать как фикстуры в тестах парсера (см. index.js).
//   captures/capture-<ts>.bin   — весь поток сырых байт (побайтовый реплей)
//   captures/capture-<ts>.jsonl — по строке на каждый data-chunk:
//                                 { t, len, hex } (реплей по границам chunk'ов)

const port = new SerialPort({
  path: DEVICE,
  baudRate: 9600,
  dataBits: 7,
  parity: 'odd',
  stopBits: 1,
  autoOpen: true,
});

// hex-представление буфера (как в index.js)
function hex(buf) {
  return [...buf].map(b => b.toString(16).padStart(2, '0')).join(' ');
}

const dir = path.join(__dirname, 'captures');
fs.mkdirSync(dir, { recursive: true });

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const binPath = path.join(dir, `capture-${ts}.bin`);
const jsonlPath = path.join(dir, `capture-${ts}.jsonl`);

const binStream = fs.createWriteStream(binPath);
const jsonlStream = fs.createWriteStream(jsonlPath);

const startedAt = Date.now();
let totalBytes = 0;
let totalChunks = 0;

port.on('open', () => {
  console.log(`Recording ${DEVICE} → ${binPath}`);
  console.log(`            chunks → ${jsonlPath}`);
  console.log('Press Ctrl+C to stop.');
});

port.on('data', chunk => {
  totalBytes += chunk.length;
  totalChunks += 1;

  // сырые байты — для побайтового реплея всего потока
  binStream.write(chunk);

  // метаданные chunk'а — для реплея по реальным границам фрагментов
  const rec = { t: Date.now() - startedAt, len: chunk.length, hex: hex(chunk) };
  jsonlStream.write(JSON.stringify(rec) + '\n');

  console.log('\nRAW HEX:', rec.hex);
});

port.on('error', err => console.error('Serial error:', err.message));

// Грейсфул-стоп: дописать и закрыть файлы, иначе .bin может оборваться.
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;

  const finish = () => {
    console.log(
      `\nStopped. Captured ${totalBytes} bytes in ${totalChunks} chunks.`
    );
    console.log(`  ${binPath}`);
    console.log(`  ${jsonlPath}`);
    process.exit(0);
  };

  binStream.end();
  jsonlStream.end();

  if (port.isOpen) {
    port.close(finish);
  } else {
    finish();
  }
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
