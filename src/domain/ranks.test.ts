import { describe, expect, it } from 'vitest';
import { daysWithEntries, RANKS, rankById, rankSnapshot } from './ranks';

const startOfDay = (value: number) => Math.floor(value / 86_400_000) * 86_400_000;

describe('ranks', () => {
  it('keeps the ladder ordered and starts at Новичок', () => {
    expect(RANKS.map((rank) => rank.order)).toEqual([0, 1, 2, 3]);
    expect(RANKS[0].name).toBe('Новичок');
    expect(rankById('legend').order).toBe(3);
  });

  it('falls back to Новичок for unknown ids', () => {
    expect(rankById('nope' as never).id).toBe('novice');
  });

  it('gives Новичок with zero data and shows the first requirements', () => {
    const snapshot = rankSnapshot({ totalEntries: 0, daysWithEntries: 0, achievementsCount: 0 });
    expect(snapshot.rank.id).toBe('novice');
    expect(snapshot.next?.id).toBe('active');
    expect(snapshot.progress).toBe(0);
    expect(snapshot.missing).toEqual(['записей: 0 / 10', 'дней с записью: 0 / 3', 'ачивок: 0 / 1']);
  });

  it('needs every requirement at once to rank up', () => {
    const entriesOnly = rankSnapshot({ totalEntries: 50, daysWithEntries: 1, achievementsCount: 1 });
    expect(entriesOnly.rank.id).toBe('novice');
    expect(entriesOnly.progress).toBeCloseTo(1 / 3);

    const almost = rankSnapshot({ totalEntries: 10, daysWithEntries: 3, achievementsCount: 1 });
    expect(almost.rank.id).toBe('active');
  });

  it('reaches Легенда at the top of the ladder and stops progressing', () => {
    const top = rankSnapshot({ totalEntries: 120, daysWithEntries: 30, achievementsCount: 9 });
    expect(top.rank.id).toBe('legend');
    expect(top.next).toBeNull();
    expect(top.progress).toBe(1);
    expect(top.missing).toEqual([]);
  });

  it('reports partial progress towards the next rank', () => {
    const snapshot = rankSnapshot({ totalEntries: 20, daysWithEntries: 6, achievementsCount: 2 });
    expect(snapshot.rank.id).toBe('active');
    expect(snapshot.next?.id).toBe('pro');
    expect(snapshot.progress).toBeCloseTo(20 / 40);
  });

  it('counts distinct days only and ignores junk input', () => {
    expect(daysWithEntries([0, 1000, 86_400_000, 86_400_001], startOfDay)).toBe(2);
    const junk = rankSnapshot({ totalEntries: Number.NaN, daysWithEntries: -5, achievementsCount: 1.9 });
    expect(junk.rank.id).toBe('novice');
  });
});
