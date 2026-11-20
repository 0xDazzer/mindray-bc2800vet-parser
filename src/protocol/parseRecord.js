// =============================================================================
// Протокол Mindray BC-2800 / BC-2800Vet (RS-232, Приложение Г руководства)
// -----------------------------------------------------------------------------
// Кадр пробы (режим без подтверждения — по умолчанию):
//   [STX 0x02] 'A' <тело> [EOF 0x1A] [ETX 0x03]
//   'A' (0x41) = идентификатор текста «проба» (есть также 'B'/'C' для КК).
// Передача: 9600 7-O-1.
//
// Заголовок тела (порядок ФИКСИРОВАН независимо от формата на ЖКД):
//   Код пробы 8 цифр · Режим 1 цифра · ММ 2 · ДД 2 · ГГГГ 4 · ЧЧ 2 · ММ 2
//   ВНИМАНИЕ: дата идёт в порядке ММ-ДД-ГГГГ, секунды vet-прошивка не шлёт.
//
// Этот модуль — ЧИСТАЯ функция парсинга одного кадра (без I/O), пригодная для
// модульных тестов на реальных захватах из captures/.
// =============================================================================

/** Идентификатор кадра пробы. */
export const RECORD_ID = 'A';

// [имя, ширина, делитель, единица]. Порядок и десятичные точки — по Приложению Г.
// '*' в поле означает «значение недоступно» → null.
export const FIELDS = [
  ['WBC',     4, 10,   '10^9/L'],
  ['LYM#',    4, 10,   '10^9/L'],
  ['MID#',    4, 10,   '10^9/L'],   // Mon# (моноциты+эоз+баз) для 3-diff
  ['GRAN#',   4, 10,   '10^9/L'],
  ['LYM%',    3, 10,   '%'],
  ['MID%',    3, 10,   '%'],
  ['GRAN%',   3, 10,   '%'],
  ['RBC',     4, 100,  '10^12/L'],
  ['HGB',     3, 1,    'g/L'],
  ['MCHC',    4, 1,    'g/L'],
  ['MCV',     4, 10,   'fL'],
  ['MCH',     4, 10,   'pg'],
  ['RDW-CV',  3, 10,   '%'],
  ['HCT',     3, 10,   '%'],
  ['PLT',     4, 1,    '10^9/L'],
  ['MPV',     3, 10,   'fL'],
  ['PDW',     3, 10,   ''],
  ['PCT',     3, 1000, '%'],
  ['RDW-SD',  4, 10,   'fL'],
  ['EOS%',    3, 10,   '%'],        // vet-специфичный параметр
];

// Гистограммы: 3 × 256 каналов (WBC, RBC, PLT), по 3 цифры на канал.
export const HIST_CHANNELS = 256;

// Кол-во знаков после запятой по делителю (для форматирования отображения).
function decimalsForDivisor(div) {
  return div > 1 ? Math.round(Math.log10(div)) : 0;
}

/**
 * Разбирает один кадр пробы (без STX/EOF — только тело, начинающееся с 'A').
 *
 * @param {string} frameText  тело кадра, декодированное в ASCII
 * @returns {{sample:number, mode:string, date:string, time:string,
 *            results:Object, histogram:Object, aux:number[]}}
 */
export function parseRecord(frameText) {
  let p = 0;
  const take = (n) => frameText.slice(p, (p += n));

  if (take(1) !== RECORD_ID) {
    throw new Error(`нет идентификатора кадра «${RECORD_ID}»`);
  }

  const sample = parseInt(take(8), 10);  // Код пробы
  const mode = take(1);                  // Режим анализа 0..5
  const MM = take(2), DD = take(2), YYYY = take(4); // ММ-ДД-ГГГГ!
  const HH = take(2), Min = take(2);

  const results = {};
  for (const [name, width, div, unit] of FIELDS) {
    const raw = take(width);
    const available = !raw.includes('*');
    results[name] = {
      value: available ? parseInt(raw, 10) / div : null,
      unit,
      decimals: decimalsForDivisor(div),
    };
  }

  // Хвост: резерв + флаги (Rm,R1-R4,Pm,Ps,Pl) + области L1..L8 + 3 гистограммы.
  // Гистограммы — последние 3×256 трёхзначных групп перед терминатором.
  const tail = (frameText.slice(p).match(/.../g) || [])
    .map((v) => Number(v.replace(/\*/g, '0')));
  const need = 3 * HIST_CHANNELS;
  let histogram = { wbc: [], rbc: [], plt: [] };
  let aux = tail;
  if (tail.length >= need) {
    const h = tail.slice(tail.length - need);
    histogram = {
      wbc: h.slice(0, HIST_CHANNELS),
      rbc: h.slice(HIST_CHANNELS, 2 * HIST_CHANNELS),
      plt: h.slice(2 * HIST_CHANNELS),
    };
    aux = tail.slice(0, tail.length - need); // флаги + области (сырьём)
  }

  return {
    sample,
    mode,
    date: `${YYYY}-${MM}-${DD}`,
    time: `${HH}:${Min}`,
    results,
    histogram,
    aux,
  };
}

export default parseRecord;
