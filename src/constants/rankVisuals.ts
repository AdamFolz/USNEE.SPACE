import { Crown, Flame, Compass, Sprout } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { RankId } from '../domain/ranks';

export const RANK_ICONS: Record<RankId, LucideIcon> = {
  novice: Sprout,
  active: Flame,
  pro: Compass,
  legend: Crown
};

export const RANK_TONE: Record<RankId, string> = {
  novice: 'text-usnee-text2',
  active: 'text-usnee-success',
  pro: 'text-usnee-info',
  legend: 'text-usnee-warning'
};
