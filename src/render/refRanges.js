// Референсные диапазоны и раскладка бланка.
// -----------------------------------------------------------------------------
// В протоколе BC-2800Vet референсные интервалы НЕ передаются — прибор хранит их
// сам. Здесь — справочные интервалы для проставления флагов H/L и отрисовки
// шкалы. Виды (DOG/CAT) выбираются метаданными, переданными в renderer.
// УТОЧНИТЕ значения по своей лаборатории/прибору.

/** [min, max] по ключам параметров (как в parseRecord results). */
export const REF_RANGES = {
  DOG: {
    WBC: [6.0, 17.0], 'LYM#': [1.0, 4.8], 'MID#': [0.1, 1.5], 'GRAN#': [3.0, 12.0],
    'LYM%': [12, 30], 'MID%': [2, 9], 'GRAN%': [60, 80], 'EOS%': [0, 10],
    RBC: [5.5, 8.5], HGB: [120, 180], HCT: [37, 55],
    MCV: [60, 77], MCH: [19.5, 25.5], MCHC: [320, 360], 'RDW-CV': [11, 16],
    PLT: [200, 500], MPV: [7, 13],
  },
  CAT: {
    WBC: [5.5, 19.5], 'LYM#': [1.5, 7.0], 'MID#': [0.0, 1.5], 'GRAN#': [2.5, 12.5],
    'LYM%': [20, 55], 'MID%': [1, 9], 'GRAN%': [35, 80], 'EOS%': [0, 12],
    RBC: [5.0, 10.0], HGB: [80, 150], HCT: [24, 45],
    MCV: [39, 55], MCH: [12.5, 17.5], MCHC: [300, 360], 'RDW-CV': [14, 18],
    PLT: [175, 500], MPV: [8, 18],
  },
};

// Раскладка бланка: три группы реального 3-diff анализа (LYM/MID/GRAN), как их
// действительно выдаёт прибор. Параметры, которые прибор не прислал, рисуются
// прочерком. `name` — отображаемое название показателя.
export const REPORT_LAYOUT = [
  {
    name: 'Лейкоциты',
    params: [
      { key: 'WBC',   name: 'Лейкоциты' },
      { key: 'LYM#',  name: 'Лимфоциты (абс.)' },
      { key: 'MID#',  name: 'Средние клетки (абс.)' },
      { key: 'GRAN#', name: 'Гранулоциты (абс.)' },
      { key: 'LYM%',  name: 'Лимфоциты' },
      { key: 'MID%',  name: 'Средние клетки' },
      { key: 'GRAN%', name: 'Гранулоциты' },
      { key: 'EOS%',  name: 'Эозинофилы' },
    ],
  },
  {
    name: 'Эритроциты',
    params: [
      { key: 'RBC',    name: 'Эритроциты' },
      { key: 'HGB',    name: 'Гемоглобин' },
      { key: 'HCT',    name: 'Гематокрит' },
      { key: 'MCV',    name: 'Ср. объём эритроцита' },
      { key: 'MCH',    name: 'Ср. содержание Hb' },
      { key: 'MCHC',   name: 'Ср. концентрация Hb' },
      { key: 'RDW-CV', name: 'Шир. распределения эр. (CV)' },
      { key: 'RDW-SD', name: 'Шир. распределения эр. (SD)' },
    ],
  },
  {
    name: 'Тромбоциты',
    params: [
      { key: 'PLT', name: 'Тромбоциты' },
      { key: 'MPV', name: 'Ср. объём тромбоцита' },
      { key: 'PDW', name: 'Шир. распределения тр.' },
      { key: 'PCT', name: 'Тромбокрит' },
    ],
  },
];

// Протокольные единицы → отображаемые (юникод-надстрочные, как в бланке).
const UNIT_DISPLAY = {
  '10^9/L': '×10⁹/л',
  '10^12/L': '×10¹²/л',
  'g/L': 'г/л',
  'fL': 'фл',
  'pg': 'пг',
  '%': '%',
  '': '',
};

export function displayUnit(protocolUnit) {
  return UNIT_DISPLAY[protocolUnit] ?? protocolUnit;
}

/** Отображаемые названия видов (код из env SPECIES / в будущем — из кадра). */
export const SPECIES_LABELS = { DOG: 'Собака', CAT: 'Кошка' };

/** Название вида для бланка: известный код → по-русски, иначе как есть. */
export function speciesLabel(species) {
  const code = String(species || '').trim();
  return SPECIES_LABELS[code.toUpperCase()] || code;
}

/** Возвращает набор референсов по виду животного (по умолчанию DOG). */
export function rangesForSpecies(species) {
  return REF_RANGES[String(species || 'DOG').toUpperCase()] || REF_RANGES.DOG;
}

/** Строка интервала для показа, напр. «5.5–17». */
export function formatRange(range) {
  if (!range || range.length !== 2) return '';
  return `${range[0]}–${range[1]}`;
}
