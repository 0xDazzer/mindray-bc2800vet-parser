// =============================================================================
// Виды животных BC-2800Vet.
// -----------------------------------------------------------------------------
// Вид приходит в кадре пробы (поле AnimalType): 2 цифры на позициях 99–100 тела
// кадра (сразу за блоком параметров, в «резерве» хвоста). Коды — из руководства
// оператора BC-2800Vet, приложение D.3.2; коды 00, 01, 02, 04, 06, 13, 15, 16
// подтверждены реальными захватами (materials/captures/, 2026-11-23).
// Код 10 в приборе не используется. ANIMAL1–3 — настраиваемые виды.
// =============================================================================

/** Смещение кода вида в теле кадра (тело начинается с 'A'), ширина — 2 цифры. */
export const SPECIES_CODE_OFFSET = 99;
export const SPECIES_CODE_WIDTH = 2;

export const SPECIES = [
  { key: 'DOG',     code: '00', label: 'Собака' },
  { key: 'CAT',     code: '01', label: 'Кошка' },
  { key: 'HORSE',   code: '02', label: 'Лошадь' },
  { key: 'PIG',     code: '03', label: 'Свинья' },
  { key: 'COW',     code: '04', label: 'Корова' },
  { key: 'BUFFALO', code: '05', label: 'Буйвол' },
  { key: 'GOAT',    code: '06', label: 'Коза' },
  { key: 'ANIMAL1', code: '07', label: 'Пользовательский вид 1' },
  { key: 'ANIMAL2', code: '08', label: 'Пользовательский вид 2' },
  { key: 'ANIMAL3', code: '09', label: 'Пользовательский вид 3' },
  { key: 'RAT',     code: '11', label: 'Крыса' },
  { key: 'MOUSE',   code: '12', label: 'Мышь' },
  { key: 'RABBIT',  code: '13', label: 'Кролик' },
  { key: 'CAMEL',   code: '14', label: 'Верблюд' },
  { key: 'SHEEP',   code: '15', label: 'Овца' },
  { key: 'MONKEY',  code: '16', label: 'Обезьяна' },
];

/** Вид по коду из кадра; null — код неизвестен. */
export function speciesByCode(code) {
  if (code == null) return null;
  return SPECIES.find((s) => s.code === code) || null;
}

/** Вид по ключу (DOG, CAT, …); null — нет такого. */
export function speciesByKey(key) {
  if (!key) return null;
  const k = String(key).trim().toUpperCase();
  return SPECIES.find((s) => s.key === k) || null;
}
