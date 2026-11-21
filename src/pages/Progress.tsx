import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  Droplets,
  FlaskConical,
  HeartPulse,
  Moon,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  TrendingUp,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ConsumptionEntry, MoodEntry, SleepEntry, Batch, WaterEntry } from '../types';
import { getEntries, getMoods, getSleep, getWater, getBatches } from '../utils/db';
import { startOfDay } from '../utils/date';
import { aggregateSimpleStats, cleanStreak, filterEntriesByPeriod, type StatsPeriod } from '../domain/stats';
import { evaluateUnlockedAchievements } from '../domain/achievements';
import { daysWithEntries, rankSnapshot, regularityScore } from '../domain/ranks';
import { RANK_ICONS, RANK_TONE } from '../constants/rankVisuals';
import { ACHIEVEMENTS } from '../constants/triggers';
import { calculateXpSnapshot, getLevelName, xpForLevel } from '../domain/gamification';
import { useAppStore } from '../stores/appStore';
import { hapticNotification } from '../integrations/telegram';
import { trackEvent } from '../integrations/analytics';
import { ConfettiBurst } from '../components/ConfettiBurst';
import { Button, Surface, TopBar } from '../components/ui';

const DAY = 24 * 60 * 60 * 1000;
const totalAchievements = ACHIEVEMENTS.length;

const periods: Array<{ id: StatsPeriod; label: string }> = [
  { id: '7d', label: '7 дней' },
  { id: '30d', label: '30 дней' },
  { id: 'all', label: 'Всё время' }
];

export function Progress() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ConsumptionEntry[]>([]);
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [sleep, setSleep] = useState<SleepEntry[]>([]);
  const [water, setWater] = useState<WaterEntry[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<StatsPeriod>('7d');
  const emergencyContact = useAppStore((state) => state.settings.emergencyContact);

  useEffect(() => {
    trackEvent('stats_viewed');
    Promise.all([getEntries(), getMoods(), getSleep(), getWater(), getBatches()])
      .then(([e, m, s, w, b]) => {
        setEntries(e);
        setMoods(m);
        setSleep(s);
        setWater(w);
        setBatches(b);
      })
      .catch(() => {
        setEntries([]);
        setMoods([]);
        setSleep([]);
        setWater([]);
        setBatches([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const last7 = useMemo(() => {
    const today = startOfDay(Date.now());
    return Array.from({ length: 7 }, (_, index) => today - (6 - index) * DAY);
  }, []);

  const periodEntries = useMemo(() => filterEntriesByPeriod(entries, period), [entries, period]);
  const simpleStats = useMemo(() => aggregateSimpleStats(periodEntries), [periodEntries]);

  const activeDays = useMemo(() => new Set(entries.map((entry) => startOfDay(entry.timestamp))), [entries]);
  const cleanDays = useMemo(() => cleanStreak(entries, Date.now()), [entries]);
  const moodCount = moods.filter((item) => item.timestamp >= last7[0]).length;
  const sleepMinutes = sleep.filter((item) => item.duration && item.endTime && item.endTime >= last7[0])
    .reduce((sum, item) => sum + (item.duration || 0), 0) / 60_000;
  const waterAmount = water.filter((item) => item.timestamp >= last7[0]).reduce((sum, item) => sum + item.amount, 0);

  const liveEntries = useMemo(() => entries.filter((entry) => !entry.reversedAt), [entries]);
  const unlocked = useMemo(
    () => evaluateUnlockedAchievements({ entries, water, batches, hasEmergencyContact: Boolean(emergencyContact) }),
    [entries, water, batches, emergencyContact]
  );

  // XP / Level calculation
  const xpSnapshot = useMemo(
    () => calculateXpSnapshot({ entries, moods, sleep, water, batches, unlockedAchievements: unlocked }),
    [entries, moods, sleep, water, batches, unlocked]
  );

  const levelName = getLevelName(xpSnapshot.level);
  const nextLevelXp = xpForLevel(xpSnapshot.level + 1);
  const xpToNext = nextLevelXp - xpSnapshot.xpInLevel;

  const regularity = useMemo(
    () => regularityScore(liveEntries.map((entry) => entry.timestamp), startOfDay),
    [liveEntries]
  );

  const rankView = useMemo(
    () =>
      rankSnapshot({
        totalEntries: liveEntries.length,
        daysWithEntries: daysWithEntries(liveEntries.map((entry) => entry.timestamp), startOfDay),
        achievementsCount: unlocked.size,
        regularity
      }),
    [liveEntries, unlocked, regularity]
  );

  // Celebration fires once when level increases between renders
  const prevLevelRef = useRef(xpSnapshot.level);
  const [celebrate, setCelebrate] = useState(0);
  useEffect(() => {
    if (xpSnapshot.level > prevLevelRef.current && prevLevelRef.current > 0) {
      setCelebrate((c) => c + 1);
      hapticNotification('success');
    }
    prevLevelRef.current = xpSnapshot.level;
  }, [xpSnapshot.level]);

  const cards = [
    { icon: CalendarCheck, label: 'Дни без записей', value: cleanDays, suffix: 'подряд', tone: 'text-usnee-success' },
    { icon: HeartPulse, label: 'Самочувствие', value: moodCount, suffix: 'отметок', tone: 'text-usnee-accent' },
    { icon: Moon, label: 'Сон', value: sleepMinutes ? Math.round(sleepMinutes / 60 * 10) / 10 : '—', suffix: 'часов', tone: 'text-usnee-info' },
    { icon: Droplets, label: 'Вода', value: waterAmount || '—', suffix: waterAmount ? 'мл' : 'пока нет', tone: 'text-usnee-cyan' },
    { icon: Timer, label: 'Регулярность', value: `${Math.round(regularity * 100)}%`, suffix: 'дней с записью', tone: 'text-usnee-brand' },
    { icon: FlaskConical, label: 'Ачивки', value: unlocked.size, suffix: `из ${totalAchievements}`, tone: 'text-usnee-warning' }
  ];

  const xpRows = [
    { label: 'Записи', value: xpSnapshot.breakdown.entriesXp },
    { label: 'Серии и дни', value: xpSnapshot.breakdown.streakXp },
    { label: 'Самочувствие', value: xpSnapshot.breakdown.moodXp },
    { label: 'Сон', value: xpSnapshot.breakdown.sleepXp },
    { label: 'Вода', value: xpSnapshot.breakdown.waterXp },
    { label: 'Ачивки', value: xpSnapshot.breakdown.achievementsXp }
  ].filter((row) => row.value > 0);

  return (
    <div className="space-y-5 pb-8">
      <TopBar title="Выписка" eyebrow="ЗА ПОСЛЕДНИЕ 7 ДНЕЙ" />
      {loading ? (
        <div role="status" className="h-72 animate-pulse rounded-card bg-usnee-surface motion-reduce:animate-none" />
      ) : (
        <>
          <Surface className="relative p-4">
            <ConfettiBurst burstKey={celebrate} active={celebrate > 0} />
            <div className="flex items-center gap-2.5">
              <div
                key={celebrate}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-usnee-brand ${celebrate > 0 ? 'animate-level-up animate-ring-pulse' : ''}`}
              >
                <Star className="h-4 w-4 text-white" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <p className="text-body-sm font-bold">
                  Ур. {xpSnapshot.level} · {levelName}
                </p>
                <p className="text-caption text-usnee-text2">до ур. {xpSnapshot.level + 1}: {xpToNext} XP</p>
              </div>
              <div className="flex items-center gap-1 text-usnee-brand" key={`xp-${xpSnapshot.totalXp}`}>
                <Zap className="h-4 w-4 animate-xp-pop" aria-hidden="true" />
                <span className="text-body-md font-bold tabular-nums animate-count-up" key={`num-${xpSnapshot.totalXp}`}>{xpSnapshot.totalXp}</span>
                <span className="text-caption text-usnee-text3">XP</span>
              </div>
            </div>
            <div
              className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-usnee-surface2"
              role="progressbar"
              aria-valuenow={Math.round(xpSnapshot.xpProgress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Прогресс уровня ${Math.round(xpSnapshot.xpProgress * 100)}%`}
            >
              <div
                className="h-full rounded-full bg-usnee-brand transition-all duration-500"
                style={{ width: `${Math.round(xpSnapshot.xpProgress * 100)}%` }}
              />
            </div>
            {xpRows.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-usnee-borderSubtle pt-2.5">
                {xpRows.map((row) => (
                  <li key={row.label} className="flex items-baseline gap-1 text-caption text-usnee-text3">
                    <span>{row.label}</span>
                    <span className="num font-bold text-usnee-text2">{row.value}</span>
                  </li>
                ))}
              </ul>
            )}
          </Surface>

          <Surface className="p-4">
            <div className="flex items-center gap-3">
              {(() => {
                const RankIcon = RANK_ICONS[rankView.rank.id];
                return (
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-usnee-surface2 ${RANK_TONE[rankView.rank.id]}`}>
                    <RankIcon className="h-4 w-4" aria-hidden="true" />
                  </span>
                );
              })()}
              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-bold">Ранг · {rankView.rank.name}</p>
                <p className="text-caption text-usnee-text2">
                  {rankView.next ? `следующий — «${rankView.next.name}»` : 'вершина лестницы'}
                </p>
              </div>
              <span className="num text-caption text-usnee-text3">{Math.round(rankView.progress * 100)}%</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-sm bg-usnee-surface2">
              <div
                className="h-full rounded-sm bg-usnee-brand transition-[width] duration-500"
                style={{ width: `${Math.round(rankView.progress * 100)}%` }}
              />
            </div>
            {rankView.missing.length > 0 ? (
              <ul className="mt-2.5 space-y-1">
                {rankView.missing.map((item) => (
                  <li key={item} className="flex items-baseline justify-between gap-2 text-caption">
                    <span className="text-usnee-text3">{item.split(':')[0]}</span>
                    <span className="num text-usnee-text2">{item.split(':')[1]?.trim()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2.5 text-caption text-usnee-success">Все условия выполнены — ранг держится.</p>
            )}
            <p className="mt-2 text-[11px] leading-snug text-usnee-text3">
              Ранг растёт от регулярности, а не от дозы: записи, дни с записью, ачивки и ритм. Пропал на месяц — лестница ждёт.
            </p>
          </Surface>

          <div className="grid grid-cols-2 gap-3">
            {cards.map(({ icon: Icon, label, value, suffix, tone }, index) => (
              <Surface key={label} className="animate-stagger-in p-4" style={{ animationDelay: `${index * 60}ms` }}>
                <Icon className={`h-5 w-5 ${tone}`} aria-hidden="true" />
                <p className="mt-3 text-caption uppercase text-usnee-text3">{label}</p>
                <p className="mt-1 text-title-xl tabular-nums">{value}</p>
                <p className="text-caption text-usnee-text2">{suffix}</p>
              </Surface>
            ))}
          </div>

          <Surface className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-usnee-brand" aria-hidden="true" />
              <h2 className="text-title-md">Ритм недели</h2>
            </div>
            <div className="mt-4 flex items-end justify-between gap-2" aria-label="Активность за последние 7 дней">
              {last7.map((day) => {
                const hasEntry = activeDays.has(day);
                const label = new Date(day).toLocaleDateString('ru-RU', { weekday: 'short' }).replace('.', '');
                return (
                  <div key={day} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className={`w-full rounded-t-lg transition-[height,background-color] duration-500 ${hasEntry ? 'h-16 bg-usnee-brand/70' : 'h-8 bg-usnee-success/70'}`}
                      title={hasEntry ? 'Есть запись' : 'День без записи'}
                    />
                    <span className="text-caption capitalize text-usnee-text3">{label}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-caption text-usnee-text2">
              Красное — дни с записью, зелёное — дни без. Ритм важнее суммы: ровные столбики говорят больше, чем один рекорд.
            </p>
          </Surface>

          <section className="space-y-3" aria-labelledby="progress-summary">
            <h2 id="progress-summary" className="flex items-center gap-2 text-title-md">
              <BarChart3 className="h-4 w-4 text-usnee-accent" aria-hidden="true" />Сводка
            </h2>
            <div className="flex rounded-full border border-usnee-border bg-usnee-surface2 p-0.5" role="group" aria-label="Период статистики">
              {periods.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={period === item.id}
                  onClick={() => setPeriod(item.id)}
                  className={`min-h-9 flex-1 rounded-full px-3 text-caption font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-usnee-focus ${period === item.id ? 'bg-usnee-brand text-white' : 'text-usnee-text2'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {!entries.length ? (
              <Surface className="p-6 text-center">
                <AlertCircle className="mx-auto h-6 w-6 text-usnee-text3" aria-hidden="true" />
                <p className="mt-2 text-body-sm text-usnee-text2">Недостаточно данных. Добавь первую запись.</p>
                <Button variant="secondary" className="mt-4 w-full" onClick={() => navigate('/add')}>
                  Новая запись
                  <ChevronRight className="ml-auto h-4 w-4" aria-hidden="true" />
                </Button>
              </Surface>
            ) : !periodEntries.length ? (
              <Surface className="p-6 text-center">
                <CalendarDays className="mx-auto h-6 w-6 text-usnee-text3" aria-hidden="true" />
                <p className="mt-2 text-body-sm text-usnee-text2">За выбранный период записей нет.</p>
                <Button variant="secondary" className="mt-4 w-full" onClick={() => setPeriod('all')}>
                  Показать всё время
                  <ChevronRight className="ml-auto h-4 w-4" aria-hidden="true" />
                </Button>
              </Surface>
            ) : (
              <>
                <Surface className="flex items-baseline justify-between px-4 py-3">
                  <span className="text-caption uppercase text-usnee-text3">Всего записей</span>
                  <strong className="text-title-xl tabular-nums">{simpleStats.total}</strong>
                </Surface>
                <section className="space-y-1.5" aria-labelledby="progress-days">
                  <h3 id="progress-days" className="text-caption uppercase text-usnee-text3">По дням</h3>
                  <Surface className="divide-y divide-usnee-borderSubtle px-4 py-1">
                    {simpleStats.byDay.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 py-2 text-body-sm">
                        <span className="truncate">{item.label}</span>
                        <strong className="tabular-nums">{item.count}</strong>
                      </div>
                    ))}
                  </Surface>
                </section>
                <section className="space-y-1.5" aria-labelledby="progress-substances">
                  <h3 id="progress-substances" className="text-caption uppercase text-usnee-text3">По веществам</h3>
                  <Surface className="divide-y divide-usnee-borderSubtle px-4 py-1">
                    {simpleStats.bySubstance.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 py-2 text-body-sm">
                        <span className="truncate">{item.label}</span>
                        <strong className="tabular-nums">{item.count}</strong>
                      </div>
                    ))}
                  </Surface>
                </section>
              </>
            )}
          </section>

          <Surface className="p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-usnee-accent" aria-hidden="true" />
              <div>
                <h2 className="text-title-md">Что делать с цифрами</h2>
                <p className="mt-1 text-body-sm text-usnee-text2">
                  Тайминги, смеси и первая помощь — в базе знаний. Там же признаки передоза без паники и лишних слов.
                </p>
              </div>
            </div>
            <Button variant="secondary" className="mt-4 w-full" onClick={() => navigate('/learn')}>
              Открыть базу знаний
              <ChevronRight className="ml-auto h-4 w-4" aria-hidden="true" />
            </Button>
          </Surface>

          <Surface className="p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-usnee-success" aria-hidden="true" />
              <div>
                <h2 className="text-title-md">Безопасность рядом</h2>
                <p className="mt-1 text-body-sm text-usnee-text2">
                  Проверяй самочувствие, отмечай сон и воду. Эти данные помогают заметить изменения раньше.
                </p>
              </div>
            </div>
            <Button variant="secondary" className="mt-4 w-full" onClick={() => navigate('/profile')}>
              <TrendingUp className="h-4 w-4" aria-hidden="true" /> Открыть инструменты самопомощи
              <ChevronRight className="ml-auto h-4 w-4" aria-hidden="true" />
            </Button>
          </Surface>
        </>
      )}
    </div>
  );
}

export default Progress;