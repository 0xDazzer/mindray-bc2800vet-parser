import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseRecord, FIELDS } from '../src/protocol/parseRecord.js';
import { listBinCaptures, readBinFrames } from './helpers/captures.js';

// Известный кадр из capture-2026-06-05T12-44-20-552Z.bin
const SAMPLE_FRAME =
  readBinFrames(listBinCaptures().find((p) => p.includes('12-44-20')))[0];

test('каждый .bin-захват разбирается без исключений', () => {
  const captures = listBinCaptures();
  assert.ok(captures.length > 0, 'нет захватов в captures/');
  for (const bin of captures) {
    const frames = readBinFrames(bin);
    assert.ok(frames.length > 0, `нет кадров в ${bin}`);
    for (const frame of frames) {
      const rec = parseRecord(frame);
      assert.equal(typeof rec.sample, 'number');
      assert.equal(Object.keys(rec.results).length, FIELDS.length);
    }
  }
});

test('заголовок: номер пробы, дата (ММ-ДД-ГГГГ), время', () => {
  const rec = parseRecord(SAMPLE_FRAME);
  assert.equal(rec.sample, 13);
  assert.equal(rec.mode, '0');
  assert.equal(rec.date, '2026-06-03'); // ММ=06 ДД=03 → 3 июня
  assert.equal(rec.time, '22:33');
});

test('параметры: значения, делители и единицы', () => {
  const rec = parseRecord(SAMPLE_FRAME);
  assert.equal(rec.results.WBC.value, 5.8);
  assert.equal(rec.results.WBC.unit, '10^9/L');
  assert.equal(rec.results['LYM#'].value, 2.0);
  assert.equal(rec.results['MID#'].value, 0.2);
  assert.equal(rec.results['GRAN#'].value, 3.6);
  assert.equal(rec.results['LYM%'].value, 35.0);
  assert.equal(rec.results['GRAN%'].value, 61.9);
  assert.equal(rec.results.HGB.value, 152);
});

test('недоступные значения (****) → null', () => {
  const rec = parseRecord(SAMPLE_FRAME);
  assert.equal(rec.results.RBC.value, null);
  assert.equal(rec.results.MCHC.value, null);
});

test('гистограммы: 3 × 256 каналов', () => {
  const rec = parseRecord(SAMPLE_FRAME);
  assert.equal(rec.histogram.wbc.length, 256);
  assert.equal(rec.histogram.rbc.length, 256);
  assert.equal(rec.histogram.plt.length, 256);
});

test('кадр без идентификатора "A" бросает ошибку', () => {
  assert.throws(() => parseRecord('0000001300'), /идентификатор/);
});
