import { createReadStream } from 'node:fs';
import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createParserStream } from '../src/protocol/createParserStream.js';

// Usage: node scripts/parse-capture.js <capture.bin | ->
const args = process.argv.slice(2);
const usage = 'Usage: node scripts/parse-capture.js <capture.bin | ->';

if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
  console.log(usage);
} else if (args.length !== 1) {
  console.error(usage);
  process.exitCode = 1;
} else {
  const source = args[0] === '-' ? process.stdin : createReadStream(args[0]);
  const parser = createParserStream();
  parser.on('recordError', (error) => {
    console.error(`Parse error: ${error.message}`);
    process.exitCode = 1;
  });

  const serialize = new Writable({
    objectMode: true,
    write(record, _encoding, callback) {
      process.stdout.write(`${JSON.stringify(record)}\n`, callback);
    },
  });

  try {
    await pipeline(source, parser, serialize);
  } catch (error) {
    console.error(`Capture error: ${error.message}`);
    process.exitCode = 1;
  }
}
