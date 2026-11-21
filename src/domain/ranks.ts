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
  /** Регулярность: доля дней с записью от дней с первой записи, 0..1. */
  regularity: number;
}

export interface RankInput {
  totalEntries: number;
  daysWithEntries: number;
  achievementsCount: number;
  /** Если не передана — условие регулярности не проверяется. */
  regularity?: number;
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
 * Порог регулярности мягкий: важно не «сколько всего», а держится ли ритм.
 */
export const RANKS: readonly Rank[] = [
  { id: 'novice', name: 'Новичок', order: 0, entries: 0, days: 0, achievements: 0, regularity: 0 },
  { id: 'active', name: 'Актив', order: 1, entries: 10, days: 3, achievements: 1, regularity: 0.2 },
  { id: 'pro', name: 'Профи', order: 2, entries: 40, days: 10, achievements: 4, regularity: 0.35 },
  { id: 'legend', name: 'Легенда', order: 3, entries: 120, days: 30, achievements: 9, regularity: 0.5 }
] as const;

function meets(input: RankInput, rank: Rank): boolean {
  return (
    input.totalEntries >= rank.entries &&
    input.daysWithEntries >= rank.days &&
    input.achievementsCount >= rank.achievements &&
    (typeof input.regularity !== 'number' || input.regularity >= rank.regularity)
  );
}

export function rankById(id: RankId): Rank {
  return RANKS.find((rank) => rank.id === id) ?? RANKS[0];
}

export function rankSnapshot(input: RankInput): RankSnapshot {
  const safe: RankInput = {
    totalEntries: Math.max(0, Math.floor(input.totalEntries) || 0),
    daysWithEntries: Math.max(0, Math.floor(input.daysWithEntries) || 0),
    achievementsCount: Math.max(0, Math.floor(input.achievementsCount) || 0),
    regularity:
      typeof input.regularity === 'number' && Number.isFinite(input.regularity)
        ? Math.min(1, Math.max(0, input.regularity))
        : undefined
  };

  let rank = RANKS[0];
  for (const candidate of RANKS) {
    if (meets(safe, candidate)) rank = candidate;
  }

  const next = RANKS.find((candidate) => candidate.order === rank.order + 1) ?? null;
  if (!next) return { rank, next: null, progress: 1, missing: [] };

  const ratio = (current: number, target: number) => (target <= 0 ? 1 : Math.min(1, current / target));
  const regularity = safe.regularity ?? 1;
  const progress = Math.min(
    ratio(safe.totalEntries, next.entries),
    ratio(safe.daysWithEntries, next.days),
    ratio(safe.achievementsCount, next.achievements),
    ratio(regularity, next.regularity)
  );

  const missing: string[] = [];
  if (safe.totalEntries < next.entries) missing.push(`записей: ${safe.totalEntries} / ${next.entries}`);
  if (safe.daysWithEntries < next.days) missing.push(`дней с записью: ${safe.daysWithEntries} / ${next.days}`);
  if (safe.achievementsCount < next.achievements) {
    missing.push(`ачивок: ${safe.achievementsCount} / ${next.achievements}`);
  }
  if (safe.regularity !== undefined && safe.regularity < next.regularity) {
    missing.push(`регулярность: ${Math.round(safe.regularity * 100)}% / ${Math.round(next.regularity * 100)}%`);
  }

  return { rank, next, progress, missing };
}

export function daysWithEntries(timestamps: number[], startOfDay: (value: number) => number): number {
  return new Set(timestamps.map((timestamp) => startOfDay(timestamp))).size;
}

/**
 * Регулярность: доля дней с записью от числа дней с первой записи до сегодня.
 * 1.0 — писал каждый день, 0.1 — раз в десять дней. Пустая история → 0.
 */
export function regularityScore(
  timestamps: number[],
  startOfDay: (value: number) => number,
  now = Date.now()
): number {
  if (timestamps.length === 0) return 0;
  const days = new Set(timestamps.map((timestamp) => startOfDay(timestamp)));
  const first = Math.min(...timestamps);
  const span = Math.floor((startOfDay(now) - startOfDay(first)) / 86_400_000) + 1;
  if (span <= 0) return 1;
  return Math.min(1, days.size / span);
}
