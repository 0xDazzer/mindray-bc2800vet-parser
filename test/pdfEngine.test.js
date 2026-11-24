import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createPdfEngine } from '../src/render/pdfEngine.js';
import { buildReportHtml } from '../src/render/HtmlReportBuilder.js';
import { parseRecord } from '../src/protocol/parseRecord.js';
import { listBinCaptures, readBinFrames } from './helpers/captures.js';

// Тест запускает Chromium — медленный, поэтому opt-in через PDF_SMOKE=1.
const enabled = process.env.PDF_SMOKE === '1';

test('htmlToPdf возвращает валидный PDF-буфер', { skip: !enabled }, async () => {
  const record = parseRecord(readBinFrames(listBinCaptures()[0])[0]);
  const html = buildReportHtml(record);

  const engine = createPdfEngine();
  try {
    const pdf = await engine.htmlToPdf(html);
    assert.ok(Buffer.isBuffer(pdf));
    assert.ok(pdf.length > 1000);
    assert.equal(pdf.subarray(0, 5).toString('ascii'), '%PDF-');
  } finally {
    await engine.close();
  }
});

test('htmlToPdf восстанавливается после обрыва связи с Chromium', { skip: !enabled }, async () => {
  const record = parseRecord(readBinFrames(listBinCaptures()[0])[0]);
  const html = buildReportHtml(record);

  const engine = createPdfEngine();
  try {
    await engine.htmlToPdf(html);
    // Имитируем обрыв: убиваем процесс Chromium из-под движка.
    engine._browser.process().kill('SIGKILL');
    await new Promise((r) => setTimeout(r, 500));
    const pdf = await engine.htmlToPdf(html);
    assert.equal(pdf.subarray(0, 5).toString('ascii'), '%PDF-');
  } finally {
    await engine.close();
  }
});
