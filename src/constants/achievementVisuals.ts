import {
  AlarmClock,
  Anchor,
  Atom,
  Award,
  BatteryLow,
  Bike,
  BookOpen,
  Coffee,
  Compass,
  Flame,
  Crown,
  Droplets,
  FlaskConical,
  Gauge,
  HeartPulse,
  Hourglass,
  Infinity as InfinityIcon,
  Moon,
  MoonStar,
  Package,
  Repeat,
  ShieldCheck,
  Sunrise,
  Syringe,
  TestTube,
  Timer,
  UserRound,
  Waves,
  Zap
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  first: Award,
  night_owl: MoonStar,
  lone_wolf: UserRound,
  chemist: Atom,
  pulse_racer: HeartPulse,
  fentanyl_slayer: ShieldCheck,
  missed_shot: Syringe,
  week_bender: Repeat,
  clean_7: Sunrise,
  hydrated: Droplets,
  still_alive: Zap,
  work_tomorrow: Coffee,
  barely_breathing: BatteryLow,
  to_infinity: InfinityIcon,
  vampire: Moon,
  speedrun: Timer,
  marathon: Bike,
  collector: Anchor,
  pharmacist: FlaskConical,
  rank_active: Flame,
  rank_pro: Compass,
  rank_legend: Crown,
  architect: Package,
  diary: BookOpen
};

export const ACHIEVEMENT_FALLBACK_ICON: LucideIcon = Gauge;

export function achievementIcon(id: string): LucideIcon {
  return ACHIEVEMENT_ICONS[id] ?? ACHIEVEMENT_FALLBACK_ICON;
}

export const RANK_LADDER_ICONS = { Crown, Hourglass, TestTube, AlarmClock, Waves };
