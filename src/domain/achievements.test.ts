import { describe, expect, it } from 'vitest';
import type { Batch, ConsumptionEntry, WaterEntry } from '../types';
import { ACHIEVEMENTS } from '../constants/triggers';
import { evaluateUnlockedAchievements } from './achievements';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const NEW_IDS = [
  'still_alive',
  'work_tomorrow',
  'barely_breathing',
  'to_infinity',
  'vampire',
  'speedrun',
  'marathon',
  'collector',
  'pharmacist',
  'architect',
  'diary',
  'rank_active',
  'rank_pro',
  'rank_legend'
] as const;

const NEW_COPY: Record<(typeof NEW_IDS)[number], { name: string; description: string }> = {
  still_alive: { name: 'Ого, ты всё ещё живой', description: '5 инъекций за день. Респект организму.' },
  work_tomorrow: { name: 'Надеюсь, завтра не на работу', description: '3 инъекции после полуночи. Босс будет рад.' },
  barely_breathing: { name: 'Еле-еле, но иду', description: 'Интервал меньше часа. Ты точно в порядке?' },
  to_infinity: { name: 'Бесконечность не предел', description: '10 инъекций за сутки. Buzz Lightyear гордился бы.' },
  vampire: { name: 'Ночная смена', description: 'Все инъекции с 00:00 до 06:00. Сон для слабых.' },
  speedrun: { name: 'Спидраннер', description: '3 инъекции за час. Any% категория?' },
  marathon: { name: 'Марафонец', description: '24 часа с инъекциями каждый час. Выносливость.' },
  collector: { name: 'Коллекционер', description: '5 разных мест за день. Всё тело в деле.' },
  pharmacist: { name: 'Аптечка-тоска', description: 'Закончили партию за 1 день. Скорость света.' },
  architect: { name: 'Архитектор', description: 'Первый раз запланировали партию заранее. Мыслитель.' },
  diary: { name: 'Писатель', description: 'Записали 3 заметки о триггерах. Самоанализ — это круто.' },
  rank_active: { name: 'Ритм', description: 'Досрочно до ранга «Актив».' },
  rank_pro: { name: 'Своя колея', description: 'Хватает регулярности на ранг «Профи».' },
  rank_legend: { name: 'Легенда', description: 'Максимальный ранг. Дальше только продолжать.' }
};

const EXTENDED_IDS = [
  'streak_3',
  'streak_14',
  'variety_8',
  'tested_3',
  'contact_ready',
  'not_alone',
  'phoenix',
  'chronicle'
] as const;

function entry(partial: Partial<ConsumptionEntry> & Pick<ConsumptionEntry, 'id' | 'timestamp'>): ConsumptionEntry {
  return {
    substanceId: 'meph',
    methodId: 'sniff',
    dose: 1,
    doseUnit: 'мг',
    methodDetails: {},
    alone: false,
    createdAt: partial.timestamp,
    updatedAt: partial.timestamp,
    ...partial
  };
}

function water(id: string, timestamp: number): WaterEntry {
  return { id, timestamp, amount: 250, unit: 'мл' };
}

function batch(partial: Partial<Batch> & Pick<Batch, 'id' | 'createdAt' | 'remaining'>): Batch {
  return {
    substanceId: 'meph',
    name: '№1',
    totalWeight: 400,
    weightUnit: 'мг',
    solutionVolume: 20,
    volumeUnit: 'мл',
    concentration: 20,
    active: true,
    ...partial
  };
}

function unlocked(opts: {
  entries?: ConsumptionEntry[];
  water?: WaterEntry[];
  batches?: Batch[];
  now?: number;
  hasEmergencyContact?: boolean;
}) {
  return evaluateUnlockedAchievements({
    entries: opts.entries ?? [],
    water: opts.water ?? [],
    batches: opts.batches ?? [],
    now: opts.now,
    hasEmergencyContact: opts.hasEmergencyContact
  });
}

function has(set: Set<string>, id: string) {
  expect(set.has(id), id).toBe(true);
}

function notHas(set: Set<string>, id: string) {
  expect(set.has(id), id).toBe(false);
}

describe('ACHIEVEMENTS catalog', () => {
  it('keeps the original 10 ids and appends the ironic and rank ones', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(ids.slice(0, 10)).toEqual([
      'first', 'night_owl', 'lone_wolf', 'chemist', 'pulse_racer',
      'fentanyl_slayer', 'missed_shot', 'week_bender', 'clean_7', 'hydrated'
    ]);
    expect(ids.slice(10, 24)).toEqual([...NEW_IDS]);
    expect(ids.slice(24)).toEqual([...EXTENDED_IDS]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every achievement a category and keeps ids unique', () => {
    const categories = new Set(ACHIEVEMENTS.map((a) => a.category));
    expect(categories.size).toBeGreaterThanOrEqual(5);
    for (const id of EXTENDED_IDS) {
      const row = ACHIEVEMENTS.find((a) => a.id === id);
      expect(row, id).toBeTruthy();
      expect(row?.name.length, id).toBeGreaterThan(2);
      expect(row?.description.length, id).toBeGreaterThan(10);
    }
    expect(ACHIEVEMENTS.find((a) => a.id === 'phoenix')?.category).toBe('rare');
    expect(ACHIEVEMENTS.find((a) => a.id === 'streak_3')?.category).toBe('regularity');
    expect(ACHIEVEMENTS.find((a) => a.id === 'tested_3')?.category).toBe('safety');
  });

  it('keeps original backend titles and descriptions for the 11', () => {
    for (const id of NEW_IDS) {
      const row = ACHIEVEMENTS.find((a) => a.id === id);
      expect(row, id).toMatchObject(NEW_COPY[id]);
    }
  });
});

describe('evaluateUnlockedAchievements — existing 10', () => {
  const now = new Date(2026, 7, 13, 15, 0, 0).getTime();

  it('unlocks first on any live entry and skips reversed', () => {
    notHas(unlocked({ now }), 'first');
    has(unlocked({ now, entries: [entry({ id: '1', timestamp: now })] }), 'first');
    notHas(unlocked({ now, entries: [entry({ id: '1', timestamp: now, reversedAt: now })] }), 'first');
  });

  it('unlocks night_owl only at local hour 3', () => {
    has(unlocked({ now, entries: [entry({ id: '1', timestamp: new Date(2026, 7, 13, 3, 20).getTime() })] }), 'night_owl');
    notHas(unlocked({ now, entries: [entry({ id: '1', timestamp: new Date(2026, 7, 13, 2, 59).getTime() })] }), 'night_owl');
  });

  it('unlocks lone_wolf at 3 alone entries, not 1', () => {
    const one = [entry({ id: '1', timestamp: now, alone: true })];
    notHas(unlocked({ now, entries: one }), 'lone_wolf');
    const three = [0, 1, 2].map((i) => entry({ id: String(i), timestamp: now - i * HOUR, alone: true }));
    has(unlocked({ now, entries: three }), 'lone_wolf');
  });

  it('unlocks chemist at 5 unique substances', () => {
    const four = ['a', 'b', 'c', 'd'].map((id, i) => entry({ id, substanceId: id, timestamp: now - i * HOUR }));
    notHas(unlocked({ now, entries: four }), 'chemist');
    has(unlocked({ now, entries: [...four, entry({ id: 'e', substanceId: 'e', timestamp: now })] }), 'chemist');
  });

  it('unlocks pulse / fentanyl / missed from flags', () => {
    has(unlocked({ now, entries: [entry({ id: '1', timestamp: now, pulse: 140 })] }), 'pulse_racer');
    has(unlocked({ now, entries: [entry({ id: '1', timestamp: now, fentanylTestResult: 'negative' })] }), 'fentanyl_slayer');
    has(unlocked({ now, entries: [entry({ id: '1', timestamp: now, missedShot: true })] }), 'missed_shot');
  });

  it('unlocks week_bender on 7 consecutive local days', () => {
    const days = Array.from({ length: 7 }, (_, i) => entry({
      id: String(i),
      timestamp: new Date(2026, 7, 7 + i, 12).getTime()
    }));
    has(unlocked({ now, entries: days }), 'week_bender');
    notHas(unlocked({ now, entries: days.slice(1) }), 'week_bender');
  });

  it('unlocks clean_7 when today and 6 previous days have no entries', () => {
    const lastUse = new Date(2026, 7, 5, 12).getTime();
    has(unlocked({ now, entries: [entry({ id: '1', timestamp: lastUse })] }), 'clean_7');
    notHas(unlocked({ now, entries: [] }), 'clean_7');
    notHas(unlocked({ now, entries: [entry({ id: '1', timestamp: now })] }), 'clean_7');
  });

  it('unlocks hydrated when water exists and entries >= 3', () => {
    const three = [0, 1, 2].map((i) => entry({ id: String(i), timestamp: now - i * HOUR }));
    notHas(unlocked({ now, entries: three }), 'hydrated');
    has(unlocked({ now, entries: three, water: [water('w1', now)] }), 'hydrated');
  });
});

describe('evaluateUnlockedAchievements — 11 new', () => {
  const now = new Date(2026, 7, 13, 15, 0, 0).getTime();

  it('still_alive at 5 in a rolling 24h, to_infinity at 10', () => {
    const five = Array.from({ length: 5 }, (_, i) => entry({ id: `s${i}`, timestamp: now - i * HOUR }));
    has(unlocked({ now, entries: five }), 'still_alive');
    notHas(unlocked({ now, entries: five }), 'to_infinity');
    const ten = Array.from({ length: 10 }, (_, i) => entry({ id: `t${i}`, timestamp: now - i * HOUR }));
    has(unlocked({ now, entries: ten }), 'to_infinity');
    const spread = Array.from({ length: 5 }, (_, i) => entry({ id: `x${i}`, timestamp: now - i * (DAY + HOUR) }));
    notHas(unlocked({ now, entries: spread }), 'still_alive');
  });

  it('still_alive persists if the 24h burst is in the past', () => {
    const burstAt = now - 3 * DAY;
    const five = Array.from({ length: 5 }, (_, i) => entry({ id: `p${i}`, timestamp: burstAt - i * HOUR }));
    has(unlocked({ now, entries: five }), 'still_alive');
  });

  it('work_tomorrow needs 3 night entries (00–06) in 24h; 06:00 is day', () => {
    const nights = [0, 1, 2].map((h) => entry({ id: `n${h}`, timestamp: new Date(2026, 7, 13, h, 10).getTime() }));
    has(unlocked({ now, entries: nights }), 'work_tomorrow');
    notHas(unlocked({ now, entries: nights.slice(1) }), 'work_tomorrow');
    const sixAm = entry({ id: 'six', timestamp: new Date(2026, 7, 13, 6, 0).getTime() });
    notHas(unlocked({ now, entries: [...nights.slice(1), sixAm] }), 'work_tomorrow');
  });

  it('barely_breathing on any consecutive pair < 1h', () => {
    const pair = [
      entry({ id: 'a', timestamp: now - 2 * DAY }),
      entry({ id: 'b', timestamp: now - 2 * DAY + 30 * 60 * 1000 })
    ];
    has(unlocked({ now, entries: pair }), 'barely_breathing');
    notHas(unlocked({ now, entries: pair }), 'speedrun');
    const far = [
      entry({ id: 'a', timestamp: now - 2 * HOUR }),
      entry({ id: 'b', timestamp: now })
    ];
    notHas(unlocked({ now, entries: far }), 'barely_breathing');
  });

  it('vampire: some 24h window with entries, all of them 00–06', () => {
    const nights = [1, 2, 4].map((h) => entry({ id: `v${h}`, timestamp: new Date(2026, 7, 13, h, 0).getTime() }));
    has(unlocked({ now, entries: nights }), 'vampire');
    const dayThenNight = [
      entry({ id: 'day', timestamp: new Date(2026, 7, 12, 12, 0).getTime() }),
      ...nights
    ];
    notHas(unlocked({ now, entries: dayThenNight }), 'vampire');
    notHas(unlocked({ now, entries: [] }), 'vampire');
  });

  it('speedrun at 3 entries inside 1h', () => {
    const three = [0, 20, 50].map((m, i) => entry({ id: `r${i}`, timestamp: now - m * 60 * 1000 }));
    has(unlocked({ now, entries: three }), 'speedrun');
    const slow = [0, 20, 70].map((m, i) => entry({ id: `r${i}`, timestamp: now - m * 60 * 1000 }));
    notHas(unlocked({ now, entries: slow }), 'speedrun');
  });

  it('marathon at 24 consecutive local hours with a record each', () => {
    const start = new Date(2026, 7, 12, 0, 10).getTime();
    const full = Array.from({ length: 24 }, (_, i) => entry({ id: `m${i}`, timestamp: start + i * HOUR }));
    has(unlocked({ now, entries: full }), 'marathon');
    notHas(unlocked({ now, entries: full.filter((_, i) => i !== 10) }), 'marathon');
  });

  it('collector at 5 distinct methodDetails.site in 24h, injectionSite as fallback', () => {
    const sites = ['a', 'b', 'c', 'd', 'e'].map((site, i) =>
      entry({ id: site, timestamp: now - i * HOUR, methodDetails: { site } })
    );
    has(unlocked({ now, entries: sites }), 'collector');
    const same = Array.from({ length: 5 }, (_, i) =>
      entry({ id: String(i), timestamp: now - i * HOUR, methodDetails: { site: 'a' } })
    );
    notHas(unlocked({ now, entries: same }), 'collector');
    const fallback = ['a', 'b', 'c', 'd', 'e'].map((site, i) =>
      entry({ id: site, timestamp: now - i * HOUR, injectionSite: site })
    );
    has(unlocked({ now, entries: fallback }), 'collector');
  });

  it('architect on any batch; pharmacist when remaining<=0 same local day as created', () => {
    const created = new Date(2026, 7, 13, 2, 0).getTime();
    const open = batch({ id: 'b1', createdAt: created, remaining: 10 });
    has(unlocked({ now, batches: [open] }), 'architect');
    notHas(unlocked({ now, batches: [open] }), 'pharmacist');
    const empty = batch({ id: 'b2', createdAt: created, remaining: 0 });
    const use = entry({ id: 'u', timestamp: new Date(2026, 7, 13, 14, 0).getTime(), batchId: 'b2' });
    has(unlocked({ now, entries: [use], batches: [empty] }), 'pharmacist');
    const late = entry({ id: 'u', timestamp: new Date(2026, 7, 14, 1, 0).getTime(), batchId: 'b2' });
    notHas(unlocked({ now: late.timestamp, entries: [late], batches: [empty] }), 'pharmacist');
  });

  it('diary at 3 entries with note or trigger', () => {
    const notes = [0, 1, 2].map((i) => entry({ id: `d${i}`, timestamp: now - i * HOUR, notes: 'x' }));
    has(unlocked({ now, entries: notes }), 'diary');
    notHas(unlocked({ now, entries: notes.slice(1) }), 'diary');
    const triggers = [0, 1, 2].map((i) => entry({ id: `t${i}`, timestamp: now - i * HOUR, triggerId: 'stress' }));
    has(unlocked({ now, entries: triggers }), 'diary');
    const blank = entry({ id: 'b', timestamp: now, notes: '   ' });
    notHas(unlocked({ now, entries: [...notes.slice(1), blank] }), 'diary');
  });

  it('counts non-injection methods and ignores reversed for the new set', () => {
    const five = Array.from({ length: 5 }, (_, i) =>
      entry({ id: `n${i}`, timestamp: now - i * HOUR, methodId: 'smoke' })
    );
    has(unlocked({ now, entries: five }), 'still_alive');
    const withReversed = [
      ...five.slice(0, 4),
      entry({ id: 'dead', timestamp: now, methodId: 'smoke', reversedAt: now })
    ];
    notHas(unlocked({ now, entries: withReversed }), 'still_alive');
  });
});

describe('evaluateUnlockedAchievements — extended set', () => {
  const now = new Date(2026, 7, 13, 15, 0, 0).getTime();

  it('streak_3 at three consecutive days, streak_14 at fourteen', () => {
    const days = (count: number) =>
      Array.from({ length: count }, (_, i) => entry({ id: `d${i}`, timestamp: new Date(2026, 7, 1 + i, 12).getTime() }));
    notHas(unlocked({ now, entries: days(2) }), 'streak_3');
    has(unlocked({ now, entries: days(3) }), 'streak_3');
    notHas(unlocked({ now, entries: days(9) }), 'streak_14');
    has(unlocked({ now, entries: days(14) }), 'streak_14');
  });

  it('variety_8 needs eight distinct substances', () => {
    const make = (count: number) =>
      Array.from({ length: count }, (_, i) => entry({ id: `v${i}`, substanceId: `s${i}`, timestamp: now - i * HOUR }));
    notHas(unlocked({ now, entries: make(7) }), 'variety_8');
    has(unlocked({ now, entries: make(8) }), 'variety_8');
  });

  it('tested_3 counts negative fentanyl tests, inconclusive does not count', () => {
    const tests = (results: Array<'negative' | 'inconclusive'>) =>
      results.map((result, i) => entry({ id: `t${i}`, timestamp: now - i * HOUR, fentanylTestResult: result }));
    notHas(unlocked({ now, entries: tests(['negative', 'negative', 'inconclusive']) }), 'tested_3');
    has(unlocked({ now, entries: tests(['negative', 'negative', 'negative']) }), 'tested_3');
  });

  it('contact_ready comes from settings, not from entries', () => {
    notHas(unlocked({ now }), 'contact_ready');
    has(unlocked({ now, hasEmergencyContact: true }), 'contact_ready');
  });

  it('not_alone needs ten entries with alone=false', () => {
    const make = (count: number, alone: boolean) =>
      Array.from({ length: count }, (_, i) => entry({ id: `${alone ? 'a' : 'b'}${i}`, timestamp: now - i * HOUR, alone }));
    notHas(unlocked({ now, entries: make(9, false) }), 'not_alone');
    has(unlocked({ now, entries: [...make(9, false), entry({ id: 'x', timestamp: now - 20 * HOUR, alone: false })] }), 'not_alone');
    notHas(unlocked({ now, entries: make(10, true) }), 'not_alone');
  });

  it('phoenix only after a pause of a month or more', () => {
    const shortGap = [
      entry({ id: 'p1', timestamp: new Date(2026, 5, 1, 12).getTime() }),
      entry({ id: 'p2', timestamp: new Date(2026, 5, 20, 12).getTime() })
    ];
    notHas(unlocked({ now, entries: shortGap }), 'phoenix');
    const longGap = [
      entry({ id: 'p1', timestamp: new Date(2026, 4, 1, 12).getTime() }),
      entry({ id: 'p2', timestamp: new Date(2026, 6, 20, 12).getTime() })
    ];
    has(unlocked({ now, entries: longGap }), 'phoenix');
  });

  it('chronicle at 365 distinct days', () => {
    const many = Array.from({ length: 365 }, (_, i) => entry({ id: `c${i}`, timestamp: now - i * DAY }));
    has(unlocked({ now, entries: many }), 'chronicle');
    notHas(unlocked({ now, entries: many.slice(0, 364) }), 'chronicle');
  });
});

describe('rank achievements', () => {
  const now = Date.parse('2026-11-08T12:00:00');
  const make = (count: number, daySpan: number) =>
    Array.from({ length: count }, (_, i) =>
      entry({
        id: 'r' + i,
        timestamp: now - Math.floor(i / Math.max(1, count / daySpan)) * DAY
      })
    );

  it('unlocks Ритм after 10 entries over 3 days', () => {
    expect(unlocked({ now, entries: make(10, 3) }).has('rank_active')).toBe(true);
    expect(unlocked({ now, entries: make(9, 3) }).has('rank_active')).toBe(false);
  });

  it('unlocks Профи only with 40 entries over 10 days', () => {
    expect(unlocked({ now, entries: make(40, 10) }).has('rank_pro')).toBe(true);
    expect(unlocked({ now, entries: make(40, 5) }).has('rank_pro')).toBe(false);
  });

  it('unlocks Легенда with 120 entries over 30 days', () => {
    expect(unlocked({ now, entries: make(120, 30) }).has('rank_legend')).toBe(true);
  });
});
