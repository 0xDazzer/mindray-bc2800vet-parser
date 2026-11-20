import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildReportHtml, buildRow } from '../src/render/HtmlReportBuilder.js';
import { parseRecord } from '../src/protocol/parseRecord.js';
import { listBinCaptures, readBinFrames } from './helpers/captures.js';

const record = parseRecord(
  readBinFrames(listBinCaptures().find((p) => p.includes('12-44-20')))[0]);

test('buildRow: значение в норме → нет флага, маркер 20–80%', () => {
  const row = buildRow('WBC', 'Лейкоциты', { value: 11, unit: '10^9/L', decimals: 1 }, [6, 17]);
  assert.equal(row.status, 'normal');
  assert.equal(row.v, '11.0');
  // (11-6)/(17-6)=0.4545 → 20 + 0.4545*60 ≈ 47.3%
  assert.equal(row.leftPct, '47.3%');
  assert.equal(row.hasMarker, true);
});

test('buildRow: выше нормы → status high, маркер прижат к правому краю (clamp 96)', () => {
  const row = buildRow('PLT', 'Тромбоциты', { value: 900, unit: '10^9/L', decimals: 0 }, [200, 500]);
  assert.equal(row.status, 'high');
  assert.equal(row.leftPct, '96.0%');
});

test('buildRow: ниже нормы → status low, clamp 4', () => {
  const row = buildRow('PLT', 'Тромбоциты', { value: 10, unit: '10^9/L', decimals: 0 }, [200, 500]);
  assert.equal(row.status, 'low');
  assert.equal(row.leftPct, '4.0%');
});

test('buildRow: недоступное значение (null) → прочерк, без маркера', () => {
  const row = buildRow('RBC', 'Эритроциты', { value: null, unit: '10^12/L', decimals: 2 }, [5, 8]);
  assert.equal(row.v, '—');
  assert.equal(row.hasMarker, false);
});

test('buildReportHtml: содержит три группы и номер пробы', () => {
  const html = buildReportHtml(record, { species: 'DOG', patient: 'Барс' });
  assert.match(html, /Лейкоциты/);
  assert.match(html, /Эритроциты/);
  assert.match(html, /Тромбоциты/);
  assert.match(html, /№ пробы/);
  assert.match(html, /Барс/);
  assert.match(html, /<!DOCTYPE html>/);
});

test('buildReportHtml: значение вне нормы окрашивается флаговым цветом', () => {
  // PLT=142 в этом захвате < 200 (DOG) → должен быть флаг + стрелка вниз.
  const html = buildReportHtml(record, { species: 'DOG' });
  assert.match(html, /#D1495B/); // флаговый цвет присутствует
  assert.match(html, /↓/);
});
