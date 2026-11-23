// =============================================================================
// Виды животных BC-2800Vet.
// -----------------------------------------------------------------------------
// Вид приходит в кадре пробы: 2 цифры на позициях 99–100 тела кадра (сразу за
// блоком параметров, в «резерве» хвоста). Кодировка в руководстве не описана —
// установлена по реальным захватам (materials/captures/, 2026-11-23).
//
// code: null — вид есть в анализаторе, но код ещё не снят (заглушка): такой вид
// никогда не совпадёт с кадром, проба получит species = null («вид неизвестен»).
// =============================================================================

/** Смещение кода вида в теле кадра (тело начинается с 'A'), ширина — 2 цифры. */
export const SPECIES_CODE_OFFSET = 99;
export const SPECIES_CODE_WIDTH = 2;

export const SPECIES = [
  { key: 'DOG',     code: '00', label: 'Собака' },
  { key: 'CAT',     code: '01', label: 'Кошка' },
  { key: 'HORSE',   code: '02', label: 'Лошадь' },
  { key: 'COW',     code: '04', label: 'Корова' },
  { key: 'GOAT',    code: '06', label: 'Козёл' },
  { key: 'RABBIT',  code: '13', label: 'Кролик' },
  { key: 'SHEEP',   code: '15', label: 'Овца' },
  { key: 'MONKEY',  code: '16', label: 'Обезьяна' },
  // Заглушки — коды определить по захватам.
  { key: 'RAT',     code: null, label: 'Крыса' },
  { key: 'MOUSE',   code: null, label: 'Мышь' },
  { key: 'PIG',     code: null, label: 'Свинья' },
  { key: 'BUFFALO', code: null, label: 'Бык' },
  { key: 'CAMEL',   code: null, label: 'Верблюд' },
];

/** Вид по коду из кадра; null — код неизвестен. */
export function speciesByCode(code) {
  if (code == null) return null;
  return SPECIES.find((s) => s.code !== null && s.code === code) || null;
}

/** Вид по ключу (DOG, CAT, …); null — нет такого. */
export function speciesByKey(key) {
  if (!key) return null;
  const k = String(key).trim().toUpperCase();
  return SPECIES.find((s) => s.key === k) || null;
}
