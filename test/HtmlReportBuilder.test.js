import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildReportHtml, buildRow } from '../src/render/HtmlReportBuilder.js';
import { parseRecord } from '../src/protocol/parseRecord.js';
import { listBinCaptures, readBinFrames } from './helpers/captures.js';

// Захват 12-44-20 — код вида «01», кошка.
const record = parseRecord(
  readBinFrames(listBinCaptures().find((p) => p.includes('12-44-20')))[0]);
const withSpecies = (species) => ({ ...record, species });

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
  const html = buildReportHtml(record);
  assert.match(html, /Лейкоциты/);
  assert.match(html, /Эритроциты/);
  assert.match(html, /Тромбоциты/);
  assert.match(html, new RegExp(`Проба<br>.*>${record.sample}<`));
  assert.match(html, /<!DOCTYPE html>/);
});

test('buildReportHtml: шапка — только вид, врач и время анализа; футера нет', () => {
  const html = buildReportHtml(record, { doctor: 'Петров А. В.' });
  assert.match(html, />Вид</);
  assert.match(html, /Кошка/); // вид — из кадра, не из meta
  assert.match(html, /Петров А\. В\./);
  assert.match(html, /Время анализа/);
  assert.match(html, new RegExp(`${record.date} ${record.time}`));
  for (const gone of ['Пациент', 'Клиент', 'Возраст', 'Пол', 'Оператор', 'Печать:', 'применим']) {
    assert.doesNotMatch(html, new RegExp(gone), gone);
  }
});

test('buildReportHtml: вид неизвестен — «Вид» с прочерком, интервалов и шкалы нет', () => {
  const html = buildReportHtml(withSpecies(null), {});
  assert.match(html, />Вид</);
  assert.doesNotMatch(html, /Собака|Кошка/);
  assert.equal((html.match(/>—</g) || []).length >= 2, true);
  assert.doesNotMatch(html, /data-marker/);
  assert.doesNotMatch(html, /[↑↓]/);
  assert.doesNotMatch(html, /5\.5–19\.5/); // кошачий интервал WBC
});

test('buildReportHtml: вид без интервалов (лошадь) — вид в шапке, интервалы пустые', () => {
  const html = buildReportHtml(withSpecies('HORSE'));
  assert.match(html, /Лошадь/);
  assert.doesNotMatch(html, /data-marker/);
  assert.doesNotMatch(html, /[↑↓]/);
  assert.doesNotMatch(html, /\d–\d/);
});

test('buildReportHtml: собака и кошка — свои интервалы', () => {
  const dog = buildReportHtml(withSpecies('DOG'));
  assert.match(dog, /Собака/);
  assert.match(dog, /6–17/);      // WBC DOG
  const cat = buildReportHtml(withSpecies('CAT'));
  assert.match(cat, /Кошка/);
  assert.match(cat, /5\.5–19\.5/); // WBC CAT
});

test('buildReportHtml: вне нормы — стрелка и сплошной маркер (без опоры на цвет)', () => {
  // Как собака: WBC=5.8 < 6 → ↓; LYM%=35 > 30 → ↑.
  const html = buildReportHtml(withSpecies('DOG'));
  assert.match(html, /↓/);
  assert.match(html, /data-marker="out"/);
  assert.match(html, /data-marker="in"/);
  assert.doesNotMatch(html, /#D1495B/i); // цветной флаг на ч/б принтере не нужен
});
