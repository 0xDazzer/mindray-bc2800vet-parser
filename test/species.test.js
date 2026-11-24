import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SPECIES, speciesByCode, speciesByKey } from '../src/protocol/species.js';
import { REF_RANGES } from '../src/render/refRanges.js';

test('коллекция: 16 видов, ключи и коды уникальны', () => {
  assert.equal(SPECIES.length, 16);
  assert.equal(new Set(SPECIES.map((s) => s.key)).size, SPECIES.length);
  const codes = SPECIES.map((s) => s.code);
  assert.equal(new Set(codes).size, codes.length);
  for (const c of codes) assert.match(c, /^\d{2}$/);
});

test('коды по руководству (прил. D.3.2)', () => {
  assert.equal(speciesByCode('03').key, 'PIG');
  assert.equal(speciesByCode('05').key, 'BUFFALO');
  assert.equal(speciesByCode('07').key, 'ANIMAL1');
  assert.equal(speciesByCode('11').key, 'RAT');
  assert.equal(speciesByCode('12').key, 'MOUSE');
  assert.equal(speciesByCode('14').key, 'CAMEL');
  assert.equal(speciesByCode('10'), null); // код не используется
  assert.equal(speciesByCode(null), null);
  assert.equal(speciesByCode('99'), null);
});

test('у каждого вида есть набор референсов, интервалы корректны', () => {
  for (const { key } of SPECIES) {
    const set = REF_RANGES[key];
    assert.ok(set && set.WBC, key);
    for (const [p, [min, max]] of Object.entries(set)) assert.ok(min < max, `${key} ${p}`);
  }
});

test('поиск по коду и по ключу', () => {
  assert.equal(speciesByCode('16').key, 'MONKEY');
  assert.equal(speciesByKey('cat').label, 'Кошка');
  assert.equal(speciesByKey(''), null);
  assert.equal(speciesByKey('DRAGON'), null);
});
