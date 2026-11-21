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
  const html = buildReportHtml(record, { species: 'DOG' });
  assert.match(html, /Лейкоциты/);
  assert.match(html, /Эритроциты/);
  assert.match(html, /Тромбоциты/);
  assert.match(html, new RegExp(`Проба<br>.*>${record.sample}<`));
  assert.match(html, /<!DOCTYPE html>/);
});

test('buildReportHtml: шапка — только вид, врач и время анализа; футера нет', () => {
  const html = buildReportHtml(record, { species: 'dog', doctor: 'Петров А. В.' });
  assert.match(html, />Вид</);
  assert.match(html, /Собака/);
  assert.match(html, /Петров А\. В\./);
  assert.match(html, /Время анализа/);
  assert.match(html, new RegExp(`${record.date} ${record.time}`));
  for (const gone of ['Пациент', 'Клиент', 'Возраст', 'Пол', 'Оператор', 'Печать:', 'применим']) {
    assert.doesNotMatch(html, new RegExp(gone), gone);
  }
});

test('buildReportHtml: без вида и врача — прочерки', () => {
  const html = buildReportHtml(record, {});
  assert.doesNotMatch(html, /Собака|Кошка/);
  assert.equal((html.match(/>—</g) || []).length >= 2, true);
});

test('buildReportHtml: вне нормы — стрелка и сплошной маркер (без опоры на цвет)', () => {
  // PLT=142 в этом захвате < 200 (DOG) → флаг + стрелка вниз.
  const html = buildReportHtml(record, { species: 'DOG' });
  assert.match(html, /↓/);
  assert.match(html, /data-marker="out"/);
  assert.match(html, /data-marker="in"/);
  assert.doesNotMatch(html, /#D1495B/i); // цветной флаг на ч/б принтере не нужен
});
