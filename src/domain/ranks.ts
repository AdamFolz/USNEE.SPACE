export type RankId = 'novice' | 'active' | 'pro' | 'legend';

export interface Rank {
  id: RankId;
  name: string;
  order: number;
  /** Записи всего. */
  entries: number;
  /** Разные дни с записями. */
  days: number;
  /** Открытые ачивки. */
  achievements: number;
}

export interface RankInput {
  totalEntries: number;
  daysWithEntries: number;
  achievementsCount: number;
}

export interface RankSnapshot {
  rank: Rank;
  next: Rank | null;
  progress: number;
  missing: string[];
}

/**
 * Лестница рангов. Растёт от регулярности, а не от дозы:
 * пишет каждый день — растёт, пропал — стоит.
 */
export const RANKS: readonly Rank[] = [
  { id: 'novice', name: 'Новичок', order: 0, entries: 0, days: 0, achievements: 0 },
  { id: 'active', name: 'Актив', order: 1, entries: 10, days: 3, achievements: 1 },
  { id: 'pro', name: 'Профи', order: 2, entries: 40, days: 10, achievements: 4 },
  { id: 'legend', name: 'Легенда', order: 3, entries: 120, days: 30, achievements: 9 }
] as const;

function meets(input: RankInput, rank: Rank): boolean {
  return (
    input.totalEntries >= rank.entries &&
    input.daysWithEntries >= rank.days &&
    input.achievementsCount >= rank.achievements
  );
}

export function rankById(id: RankId): Rank {
  return RANKS.find((rank) => rank.id === id) ?? RANKS[0];
}

export function rankSnapshot(input: RankInput): RankSnapshot {
  const safe: RankInput = {
    totalEntries: Math.max(0, Math.floor(input.totalEntries) || 0),
    daysWithEntries: Math.max(0, Math.floor(input.daysWithEntries) || 0),
    achievementsCount: Math.max(0, Math.floor(input.achievementsCount) || 0)
  };

  let rank = RANKS[0];
  for (const candidate of RANKS) {
    if (meets(safe, candidate)) rank = candidate;
  }

  const next = RANKS.find((candidate) => candidate.order === rank.order + 1) ?? null;
  if (!next) return { rank, next: null, progress: 1, missing: [] };

  const ratio = (current: number, target: number) => (target <= 0 ? 1 : Math.min(1, current / target));
  const progress = Math.min(
    ratio(safe.totalEntries, next.entries),
    ratio(safe.daysWithEntries, next.days),
    ratio(safe.achievementsCount, next.achievements)
  );

  const missing: string[] = [];
  if (safe.totalEntries < next.entries) missing.push(`записей: ${safe.totalEntries} / ${next.entries}`);
  if (safe.daysWithEntries < next.days) missing.push(`дней с записью: ${safe.daysWithEntries} / ${next.days}`);
  if (safe.achievementsCount < next.achievements) {
    missing.push(`ачивок: ${safe.achievementsCount} / ${next.achievements}`);
  }

  return { rank, next, progress, missing };
}

export function daysWithEntries(timestamps: number[], startOfDay: (value: number) => number): number {
  return new Set(timestamps.map((timestamp) => startOfDay(timestamp))).size;
}
