import { describe, expect, it } from 'vitest';
import { ACCOUNT_NAME_MAX, formatStamp, isEmptySnapshot, snapshotSummary, validateAccountName } from './accounts';

describe('accounts domain', () => {
  it('accepts a normal name and trims it', () => {
    expect(validateAccountName('  Основной  ')).toBeNull();
    expect(validateAccountName('a'.repeat(ACCOUNT_NAME_MAX))).toBeNull();
  });

  it('rejects empty, long and duplicate names', () => {
    expect(validateAccountName('   ')).toBe('Название пустое');
    expect(validateAccountName('a'.repeat(ACCOUNT_NAME_MAX + 1))).toContain(String(ACCOUNT_NAME_MAX));
    expect(validateAccountName(' Основной ', ['основной'])).toBe('Такое имя уже есть');
  });

  it('summarises snapshot counts in readable Russian', () => {
    expect(snapshotSummary({ entries: 1, batches: 0, sleep: 0, mood: 0, food: 0, water: 0 })).toBe('1 запись');
    expect(snapshotSummary({ entries: 3, batches: 2, sleep: 1, mood: 0, food: 0, water: 0 })).toBe(
      '3 записей · 2 партий · 1 сон'
    );
    expect(snapshotSummary({ entries: 0, batches: 0, sleep: 0, mood: 0, food: 0, water: 0 })).toBe('пусто');
  });

  it('detects empty snapshots', () => {
    const empty = { entries: 0, batches: 0, sleep: 0, mood: 0, food: 0, water: 0 };
    expect(isEmptySnapshot(empty)).toBe(true);
    expect(isEmptySnapshot({ ...empty, water: 1 })).toBe(false);
  });

  it('formats timestamps without seconds', () => {
    const stamp = formatStamp(new Date('2026-11-08T09:05:00').getTime());
    expect(stamp).toMatch(/\d{2}\.\d{2}, \d{2}:\d{2}/);
  });
});
