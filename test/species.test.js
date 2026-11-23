import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SPECIES, speciesByCode, speciesByKey } from '../src/protocol/species.js';

test('коллекция: 13 видов, ключи и коды уникальны', () => {
  assert.equal(SPECIES.length, 13);
  assert.equal(new Set(SPECIES.map((s) => s.key)).size, SPECIES.length);
  const codes = SPECIES.map((s) => s.code).filter((c) => c !== null);
  assert.equal(new Set(codes).size, codes.length);
  for (const c of codes) assert.match(c, /^\d{2}$/);
});

test('заглушки (код ещё не известен) не совпадают ни с каким кодом', () => {
  for (const key of ['RAT', 'MOUSE', 'PIG', 'BUFFALO', 'CAMEL']) {
    assert.equal(speciesByKey(key).code, null, key);
  }
  assert.equal(speciesByCode(null), null);
  assert.equal(speciesByCode('99'), null);
});

test('поиск по коду и по ключу', () => {
  assert.equal(speciesByCode('16').key, 'MONKEY');
  assert.equal(speciesByKey('cat').label, 'Кошка');
  assert.equal(speciesByKey(''), null);
  assert.equal(speciesByKey('DRAGON'), null);
});
