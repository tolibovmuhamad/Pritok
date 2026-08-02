/**
 * Приток — расчётное ядро вентиляции.
 *
 * Чистый модуль без зависимостей от UI. Всё считается синхронно на входных
 * данных: список помещений + тип системы -> нормы расхода, баланс,
 * рекомендуемая установка и подбор сечений воздуховодов.
 *
 * Единицы: площадь — м², высота — м, расход воздуха — м³/ч, скорость — м/с,
 * сечение — мм (диаметр круглого воздуховода) и мм² (площадь сечения).
 */

/**
 * Направление воздушного потока помещения.
 * @readonly
 * @enum {string}
 */
export const FLOW = {
  SUPPLY: 'supply', // приток
  EXHAUST: 'exhaust', // вытяжка
  TRANSFER: 'transfer', // переток (не создаёт нагрузки)
};

/**
 * Типы систем вентиляции.
 * @readonly
 * @enum {string}
 */
export const SYSTEM = {
  EXHAUST_ONLY: 'exhaust_only', // только вытяжка
  BALANCED: 'balanced', // приток + вытяжка
};

/**
 * Справочник типов помещений и правил расчёта расхода.
 *
 * Каждое правило описывает направление потока и функцию нормы `rate(room)`,
 * возвращающую расход в м³/ч. Так формулы живут в одном месте и легко
 * проверяются юнит-тестами.
 */
export const ROOM_TYPES = {
  living: {
    id: 'living',
    label: 'Жилая комната',
    flow: FLOW.SUPPLY,
    // Приток: площадь × 3 м³/ч
    rate: (room) => area(room) * 3,
  },
  kitchen: {
    id: 'kitchen',
    label: 'Кухня',
    flow: FLOW.EXHAUST,
    // Вытяжка: фиксировано 90 м³/ч
    rate: () => 90,
  },
  bathroom: {
    id: 'bathroom',
    label: 'Ванная / большой санузел',
    flow: FLOW.EXHAUST,
    rate: () => 50,
  },
  toilet: {
    id: 'toilet',
    label: 'Маленький санузел / туалет',
    flow: FLOW.EXHAUST,
    rate: () => 25,
  },
  laundry: {
    id: 'laundry',
    label: 'Прачечная',
    flow: FLOW.EXHAUST,
    rate: () => 75,
  },
  storage: {
    id: 'storage',
    label: 'Гардероб / кладовая',
    flow: FLOW.EXHAUST,
    // Вытяжка: площадь × 1.5 м³/ч
    rate: (room) => area(room) * 1.5,
  },
  corridor: {
    id: 'corridor',
    label: 'Коридор / прихожая',
    flow: FLOW.TRANSFER,
    // Переток: собственной нагрузки нет
    rate: () => 0,
  },
};

/** Список типов для выпадающих списков в UI. */
export const ROOM_TYPE_LIST = Object.values(ROOM_TYPES).map((t) => ({
  id: t.id,
  label: t.label,
  flow: t.flow,
}));

/** Скорости воздуха по умолчанию, м/с. */
export const DEFAULT_VELOCITY = {
  trunk: 3.5, // магистраль
  branch: 2.5, // ответвление у комнаты
};

/** Запас на рекомендуемую установку (+15 %). */
export const INSTALL_RESERVE = 1.15;

/**
 * Стандартный ряд диаметров круглых воздуховодов, мм.
 * Используется для округления расчётного сечения к ближайшему большему.
 */
export const STANDARD_DIAMETERS = [
  100, 125, 140, 160, 180, 200, 224, 250, 280, 315, 355, 400, 450, 500, 560, 630,
];

/** Безопасно берёт площадь помещения (>= 0). */
function area(room) {
  const a = Number(room && room.area);
  return Number.isFinite(a) && a > 0 ? a : 0;
}

/**
 * Норма расхода одного помещения, м³/ч.
 * @param {{type: string, area?: number}} room
 * @returns {number}
 */
export function roomAirflow(room) {
  const def = ROOM_TYPES[room && room.type];
  if (!def) return 0;
  const value = def.rate(room);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Округление вверх до ближайшей сотни.
 * @param {number} value
 * @returns {number}
 */
export function roundUpToHundred(value) {
  return Math.ceil(value / 100) * 100;
}

/**
 * Требуемая площадь сечения воздуховода, м².
 * S = расход / 3600 / скорость.
 * @param {number} flow расход участка, м³/ч
 * @param {number} velocity скорость, м/с
 * @returns {number}
 */
export function ductCrossSection(flow, velocity) {
  if (!(flow > 0) || !(velocity > 0)) return 0;
  return flow / 3600 / velocity;
}

/**
 * Подбор стандартного круглого воздуховода под расход.
 * Считает требуемую площадь сечения, эквивалентный диаметр и округляет
 * вверх к ближайшему стандартному диаметру.
 * @param {number} flow расход участка, м³/ч
 * @param {number} velocity скорость, м/с
 * @returns {{
 *   flow: number,
 *   velocity: number,
 *   crossSectionM2: number,
 *   requiredDiameterMm: number,
 *   diameterMm: number|null,
 *   actualVelocity: number|null
 * }}
 */
export function selectDuct(flow, velocity) {
  const crossSectionM2 = ductCrossSection(flow, velocity);
  const requiredDiameterMm = crossSectionM2 > 0
    ? Math.sqrt((4 * crossSectionM2) / Math.PI) * 1000
    : 0;

  let diameterMm = null;
  for (const d of STANDARD_DIAMETERS) {
    if (d >= requiredDiameterMm) {
      diameterMm = d;
      break;
    }
  }
  // Расход выше самого крупного стандартного диаметра — берём максимальный.
  if (diameterMm === null && requiredDiameterMm > 0) {
    diameterMm = STANDARD_DIAMETERS[STANDARD_DIAMETERS.length - 1];
  }

  // Фактическая скорость в выбранном воздуховоде.
  let actualVelocity = null;
  if (diameterMm) {
    const dM = diameterMm / 1000;
    const sM2 = (Math.PI * dM * dM) / 4;
    actualVelocity = flow / 3600 / sM2;
  }

  return {
    flow: round(flow, 1),
    velocity,
    crossSectionM2: round(crossSectionM2, 5),
    requiredDiameterMm: round(requiredDiameterMm, 1),
    diameterMm,
    actualVelocity: actualVelocity === null ? null : round(actualVelocity, 2),
  };
}

/** Округление до n знаков. */
function round(value, digits = 2) {
  const k = 10 ** digits;
  return Math.round(value * k) / k;
}

/**
 * Полный расчёт проекта.
 *
 * @param {Array<{id?: string|number, name?: string, type: string, area?: number, height?: number, people?: number}>} rooms
 * @param {string} [systemType=SYSTEM.BALANCED] тип системы (см. SYSTEM)
 * @param {object} [options]
 * @param {{trunk?: number, branch?: number}} [options.velocity] скорости, м/с
 * @returns {{
 *   systemType: string,
 *   rooms: Array<object>,
 *   totalArea: number,
 *   supplyTotal: number,
 *   exhaustTotal: number,
 *   systemFlow: number,
 *   recommendedUnit: number,
 *   trunkDuct: object,
 *   balance: number
 * }}
 */
export function calculateProject(
  rooms,
  systemType = SYSTEM.BALANCED,
  options = {},
) {
  const velocity = {
    trunk: options.velocity?.trunk ?? DEFAULT_VELOCITY.trunk,
    branch: options.velocity?.branch ?? DEFAULT_VELOCITY.branch,
  };

  const list = Array.isArray(rooms) ? rooms : [];

  let supplyTotal = 0;
  let exhaustTotal = 0;
  let totalArea = 0;

  const detailed = list.map((room) => {
    const def = ROOM_TYPES[room.type];
    const flow = roomAirflow(room);
    const direction = def ? def.flow : FLOW.TRANSFER;

    if (direction === FLOW.SUPPLY) supplyTotal += flow;
    else if (direction === FLOW.EXHAUST) exhaustTotal += flow;

    totalArea += area(room);

    return {
      ...room,
      typeLabel: def ? def.label : 'Неизвестно',
      flowDirection: direction,
      airflow: round(flow, 1),
      // Ответвление подбираем по расходу самого помещения.
      branchDuct: selectDuct(flow, velocity.branch),
    };
  });

  // Расход системы зависит от схемы.
  const systemFlow =
    systemType === SYSTEM.EXHAUST_ONLY
      ? exhaustTotal
      : Math.max(supplyTotal, exhaustTotal);

  const recommendedUnit = roundUpToHundred(systemFlow * INSTALL_RESERVE);

  return {
    systemType,
    rooms: detailed,
    totalArea: round(totalArea, 2),
    supplyTotal: round(supplyTotal, 1),
    exhaustTotal: round(exhaustTotal, 1),
    systemFlow: round(systemFlow, 1),
    recommendedUnit,
    // Магистраль рассчитываем на расход системы.
    trunkDuct: selectDuct(systemFlow, velocity.trunk),
    // Небаланс притока и вытяжки (для балансной схемы полезно видеть).
    balance: round(supplyTotal - exhaustTotal, 1),
  };
}
