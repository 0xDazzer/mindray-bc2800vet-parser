import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

import { createParserStream } from '../src/protocol/createParserStream.js';
import { listBinCaptures, readBinFrames, replayChunks } from './helpers/captures.js';

function jsonlFor(binPath) {
  return binPath.replace(/\.bin$/, '.jsonl');
}

async function collect(stream) {
  const out = [];
  stream.on('data', (rec) => out.push(rec));
  await once(stream, 'end');
  return out;
}

test('реплей реальных границ chunk\'ов даёт столько же записей, сколько кадров', async () => {
  for (const bin of listBinCaptures()) {
    const expected = readBinFrames(bin).length;
    const chunks = replayChunks(jsonlFor(bin));

    const parser = createParserStream();
    const collected = collect(parser);
    for (const chunk of chunks) parser.write(chunk);
    parser.end();

    const records = await collected;
    assert.equal(records.length, expected, `несовпадение записей для ${bin}`);
  }
});

test('кадр, разорванный по границам chunk\'ов, собирается корректно', async () => {
  // Берём один полный кадр и режем его по 1 байту — экстремальная фрагментация.
  const bin = listBinCaptures().find((p) => p.includes('12-44-20'));
  const frame = readBinFrames(bin)[0];
  const full = Buffer.concat([Buffer.from([0x02]), Buffer.from(frame, 'ascii'), Buffer.from([0x1a])]);

  const parser = createParserStream();
  const collected = collect(parser);
  for (const byte of full) parser.write(Buffer.from([byte]));
  parser.end();

  const records = await collected;
  assert.equal(records.length, 1);
  assert.equal(records[0].sample, 13);
  assert.equal(records[0].results.WBC.value, 5.8);
});

test('инжектируемая стратегия parse вызывается (открытый конструктор)', async () => {
  let calls = 0;
  const parse = (text) => { calls++; return { text }; };
  const parser = createParserStream({ parse });
  const collected = collect(parser);

  parser.write(Buffer.from([0x02]));
  parser.write(Buffer.from('AHELLO', 'ascii'));
  parser.write(Buffer.from([0x1a]));
  parser.end();

  const records = await collected;
  assert.equal(calls, 1);
  assert.equal(records[0].text, 'AHELLO');
});
