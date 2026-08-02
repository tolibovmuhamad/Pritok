import { describe, it, expect } from 'vitest';
import {
  FLOW,
  SYSTEM,
  roomAirflow,
  roundUpToHundred,
  ductCrossSection,
  selectDuct,
  calculateProject,
} from './ventilation.js';
import { SAFO_ROOMS } from './fixtures/safo.js';

describe('нормы расхода одного помещения', () => {
  it('жилая комната: площадь × 3', () => {
    expect(roomAirflow({ type: 'living', area: 20 })).toBe(60);
  });

  it('кухня: фиксировано 90', () => {
    expect(roomAirflow({ type: 'kitchen', area: 25 })).toBe(90);
    expect(roomAirflow({ type: 'kitchen', area: 8 })).toBe(90);
  });

  it('ванная / большой санузел: 50', () => {
    expect(roomAirflow({ type: 'bathroom', area: 6 })).toBe(50);
  });

  it('маленький санузел / туалет: 25', () => {
    expect(roomAirflow({ type: 'toilet', area: 2 })).toBe(25);
  });

  it('прачечная: 75', () => {
    expect(roomAirflow({ type: 'laundry', area: 9 })).toBe(75);
  });

  it('гардероб / кладовая: площадь × 1.5', () => {
    expect(roomAirflow({ type: 'storage', area: 10 })).toBe(15);
  });

  it('коридор / прихожая: переток, 0', () => {
    expect(roomAirflow({ type: 'corridor', area: 30 })).toBe(0);
  });
});

describe('вспомогательные функции', () => {
  it('округление вверх до сотни', () => {
    expect(roundUpToHundred(990.15)).toBe(1000);
    expect(roundUpToHundred(900)).toBe(900);
    expect(roundUpToHundred(901)).toBe(1000);
  });

  it('площадь сечения = расход / 3600 / скорость', () => {
    // 861 м³/ч при 3.5 м/с
    expect(ductCrossSection(861, 3.5)).toBeCloseTo(0.06833, 4);
  });

  it('подбор стандартного воздуховода округляет вверх', () => {
    const duct = selectDuct(150, 2.5); // требуемый Ø ≈ 145 мм
    expect(duct.diameterMm).toBe(160);
    expect(duct.actualVelocity).toBeLessThan(2.5);
  });
});

describe('контрольный пример SAFO (484 м², 28 помещений)', () => {
  const result = calculateProject(SAFO_ROOMS, SYSTEM.BALANCED);

  it('в проекте 28 помещений', () => {
    expect(SAFO_ROOMS).toHaveLength(28);
    expect(result.rooms).toHaveLength(28);
  });

  it('суммарная площадь ≈ 484 м²', () => {
    expect(result.totalArea).toBeCloseTo(484, 1);
  });

  it('приток ≈ 860 м³/ч', () => {
    expect(result.supplyTotal).toBeGreaterThanOrEqual(840);
    expect(result.supplyTotal).toBeLessThanOrEqual(880);
    expect(result.supplyTotal).toBe(861);
  });

  it('вытяжка ≈ 540 м³/ч', () => {
    expect(result.exhaustTotal).toBeGreaterThanOrEqual(520);
    expect(result.exhaustTotal).toBeLessThanOrEqual(560);
    expect(result.exhaustTotal).toBe(539.5);
  });

  it('балансная схема: расход системы = max(приток, вытяжка)', () => {
    expect(result.systemFlow).toBe(861);
  });

  it('рекомендуемая установка = расход × 1.15, вверх до сотни', () => {
    // 861 × 1.15 = 990.15 → 1000
    expect(result.recommendedUnit).toBe(1000);
  });

  it('магистральный воздуховод подобран', () => {
    expect(result.trunkDuct.diameterMm).toBeGreaterThan(0);
    expect(result.trunkDuct.velocity).toBe(3.5);
  });
});

describe('схема «только вытяжка»', () => {
  const result = calculateProject(SAFO_ROOMS, SYSTEM.EXHAUST_ONLY);

  it('расход системы = сумма вытяжки', () => {
    expect(result.systemFlow).toBe(539.5);
  });

  it('рекомендуемая установка = 539.5 × 1.15 → 700', () => {
    // 539.5 × 1.15 = 620.4 → 700
    expect(result.recommendedUnit).toBe(700);
  });
});

describe('устойчивость к некорректным данным', () => {
  it('пустой список даёт нули', () => {
    const r = calculateProject([], SYSTEM.BALANCED);
    expect(r.supplyTotal).toBe(0);
    expect(r.exhaustTotal).toBe(0);
    expect(r.recommendedUnit).toBe(0);
  });

  it('неизвестный тип помещения не ломает расчёт', () => {
    const r = calculateProject([{ type: 'unknown', area: 10 }], SYSTEM.BALANCED);
    expect(r.supplyTotal).toBe(0);
    expect(r.rooms[0].flowDirection).toBe(FLOW.TRANSFER);
  });

  it('отрицательная площадь трактуется как 0', () => {
    expect(roomAirflow({ type: 'living', area: -5 })).toBe(0);
  });
});
