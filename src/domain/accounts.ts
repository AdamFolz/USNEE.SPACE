import type { AccountSnapshotCounts } from '../types';

export const ACCOUNT_NAME_MAX = 24;

export function validateAccountName(raw: string, existing: string[] = []): string | null {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name) return 'Название пустое';
  if (name.length > ACCOUNT_NAME_MAX) return `Не длиннее ${ACCOUNT_NAME_MAX} символов`;
  const taken = existing.some((item) => item.trim().toLowerCase() === name.toLowerCase());
  if (taken) return 'Такое имя уже есть';
  return null;
}

export function snapshotSummary(counts: AccountSnapshotCounts): string {
  const parts: string[] = [];
  if (counts.entries) parts.push(`${counts.entries} ${counts.entries === 1 ? 'запись' : 'записей'}`);
  if (counts.batches) parts.push(`${counts.batches} партий`);
  if (counts.sleep) parts.push(`${counts.sleep} сон`);
  if (counts.mood) parts.push(`${counts.mood} настроение`);
  if (counts.water) parts.push(`${counts.water} вода`);
  if (counts.food) parts.push(`${counts.food} еда`);
  return parts.length ? parts.join(' · ') : 'пусто';
}

export function isEmptySnapshot(counts: AccountSnapshotCounts): boolean {
  return Object.values(counts).every((value) => value === 0);
}

export function formatStamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}
