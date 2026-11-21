import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { createRendererStream } from '../src/render/createRendererStream.js';

const fakeEngine = { htmlToPdf: async (html) => Buffer.from(`%PDF ${html}`) };
const buildHtml = (record) => `sample-${record.sample}`;
const records = () => Readable.from(
  [1, 2, 3].map((sample) => ({ sample, date: '2026-11-20', time: '10:15' })),
  { objectMode: true },
);

test('ошибка печати с onError не останавливает конвейер', async () => {
  const printed = [];
  const errors = [];
  const printer = {
    async print(_pdf, { title }) {
      if (title === 'OAK-2') throw new Error('нет бумаги');
      printed.push(title);
    },
  };
  await pipeline(records(), createRendererStream({
    pdfEngine: fakeEngine, printer, buildHtml,
    onError: (err, record) => errors.push([record.sample, err.message]),
  }));
  assert.deepEqual(printed, ['OAK-1', 'OAK-3']);
  assert.deepEqual(errors, [[2, 'нет бумаги']]);
});

test('без onError ошибка уходит в поток (прежнее поведение)', async () => {
  const printer = { print: async () => { throw new Error('boom'); } };
  await assert.rejects(
    pipeline(records(), createRendererStream({ pdfEngine: fakeEngine, printer, buildHtml })),
    /boom/,
  );
});
