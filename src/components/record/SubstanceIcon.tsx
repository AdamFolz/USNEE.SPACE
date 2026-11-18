import {
  Cloud,
  Cookie,
  Droplets,
  Eye,
  Flower2,
  Heart,
  Leaf,
  Moon,
  Pill,
  Snowflake,
  Sparkles,
  Sprout,
  Waves,
  Wind,
  Wine,
  Zap
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SUBSTANCE_ICONS } from '../../constants/substanceVisuals';

const ICONS: Record<string, LucideIcon> = {
  Zap,
  Heart,
  Pill,
  Snowflake,
  Leaf,
  Sprout,
  Wind,
  Cookie,
  Cloud,
  Droplets,
  Moon,
  Eye,
  Sparkles,
  Flower2,
  Waves,
  Wine
};

export interface SubstanceIconProps {
  substanceId: string;
  color?: string;
  className?: string;
}

/** Иконка вещества: цвет остаётся точкой-маркером, форма — узнаваемой. */
export function SubstanceIcon({ substanceId, color, className }: SubstanceIconProps) {
  const Icon = ICONS[SUBSTANCE_ICONS[substanceId] ?? ''] ?? Pill;
  return (
    <span className={className ?? 'flex h-6 w-6 shrink-0 items-center justify-center'} style={{ color }} aria-hidden="true">
      <Icon className="h-4 w-4" strokeWidth={2} />
    </span>
  );
}
