/**
 * Контрольный пример «SAFO» — квартира 484 м², 28 помещений.
 *
 * Ожидаемый результат при балансной схеме:
 *   приток  ≈ 860 м³/ч
 *   вытяжка ≈ 540 м³/ч
 *
 * Значения площадей подобраны так, чтобы суммы совпадали с проектным
 * расчётом квартиры. Используется как регрессионный тест расчётного ядра.
 */
export const SAFO_ROOMS = [
  // --- Жилые комнаты (приток, площадь × 3) ---
  { id: 1, name: 'Гостиная', type: 'living', area: 42, height: 3.2 },
  { id: 2, name: 'Спальня хозяйская', type: 'living', area: 32, height: 3.2 },
  { id: 3, name: 'Спальня 2', type: 'living', area: 24, height: 3.2 },
  { id: 4, name: 'Спальня 3', type: 'living', area: 22, height: 3.2 },
  { id: 5, name: 'Спальня 4', type: 'living', area: 20, height: 3.2 },
  { id: 6, name: 'Детская', type: 'living', area: 18, height: 3.2 },
  { id: 7, name: 'Кабинет', type: 'living', area: 16, height: 3.2 },
  { id: 8, name: 'Столовая', type: 'living', area: 28, height: 3.2 },
  { id: 9, name: 'Гостевая', type: 'living', area: 15, height: 3.2 },
  { id: 10, name: 'Библиотека', type: 'living', area: 14, height: 3.2 },
  { id: 11, name: 'Игровая', type: 'living', area: 18, height: 3.2 },
  { id: 12, name: 'Тренажёрный зал', type: 'living', area: 20, height: 3.2 },
  { id: 13, name: 'Медиа-комната', type: 'living', area: 18, height: 3.2 },
  // Сумма жилой площади = 287 м²  →  приток 287 × 3 = 861 м³/ч

  // --- Кухня (вытяжка, 90) ---
  { id: 14, name: 'Кухня', type: 'kitchen', area: 22, height: 3.2 },

  // --- Ванные / большие санузлы (вытяжка, 50) ---
  { id: 15, name: 'Ванная хозяйская', type: 'bathroom', area: 8, height: 3.2 },
  { id: 16, name: 'Ванная гостевая', type: 'bathroom', area: 7, height: 3.2 },
  { id: 17, name: 'Ванная 3', type: 'bathroom', area: 6, height: 3.2 },
  { id: 18, name: 'Ванная 4', type: 'bathroom', area: 5, height: 3.2 },

  // --- Туалеты (вытяжка, 25) ---
  { id: 19, name: 'Туалет 1', type: 'toilet', area: 3, height: 3.2 },
  { id: 20, name: 'Туалет 2', type: 'toilet', area: 2.5, height: 3.2 },

  // --- Прачечная (вытяжка, 75) ---
  { id: 21, name: 'Постирочная', type: 'laundry', area: 9, height: 3.2 },

  // --- Гардеробные / кладовые (вытяжка, площадь × 1.5) ---
  { id: 22, name: 'Гардеробная хозяйская', type: 'storage', area: 28, height: 3.2 },
  { id: 23, name: 'Гардеробная 2', type: 'storage', area: 20, height: 3.2 },
  { id: 24, name: 'Гардеробная 3', type: 'storage', area: 15, height: 3.2 },
  { id: 25, name: 'Кладовая', type: 'storage', area: 12, height: 3.2 },
  { id: 26, name: 'Кладовая 2', type: 'storage', area: 8, height: 3.2 },
  // Сумма площади хранения = 83 м²  →  вытяжка 83 × 1.5 = 124.5 м³/ч

  // --- Коридоры / прихожая (переток, 0) ---
  { id: 27, name: 'Коридор', type: 'corridor', area: 30, height: 3.2 },
  { id: 28, name: 'Прихожая', type: 'corridor', area: 21.5, height: 3.2 },
];

// Проверка суммы площади: 287 + 22 + 26 + 5.5 + 9 + 83 + 51.5 = 484 м²
