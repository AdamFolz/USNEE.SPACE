import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Droplets,
  Fingerprint,
  FlaskConical,
  ListPlus,
  LockKeyhole,
  Moon,
  Phone,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wind,
  Zap
} from 'lucide-react';
import { Button, Surface, TopBar } from '../components/ui';
import {
  FIRST_AID_STEPS,
  EMERGENCY_NUMBERS,
  INTERACTIONS,
  OVERDOSE_SIGNS,
  RECOVERY_CARDS,
  ROUTE_KNOWLEDGE,
  ROUTE_ONSET,
  searchTimings
} from '../constants/knowledge';

const lessons = [
  {
    id: 'start',
    icon: Zap,
    eyebrow: '01 · БЫСТРЫЙ СТАРТ',
    title: 'С чего начать',
    text: 'Нажми «Новая запись», выбери только то, что знаешь. Остальное потом.',
    steps: ['Открой «Новая запись»', 'Выбери вещество и способ', 'Сохрани — запись останется на устройстве']
  },
  {
    id: 'data',
    icon: LockKeyhole,
    eyebrow: '02 · ТВОИ ДАННЫЕ',
    title: 'На этом телефоне',
    text: 'Пишет без сети: записи сначала живут на этом устройстве. Если синхронизация подключена, это будет явно показано.',
    steps: ['Сеть не нужна для записи', 'PIN включается в настройках', 'Экспорт можно зашифровать паролем']
  },
  {
    id: 'safety',
    icon: ShieldCheck,
    eyebrow: '03 · БЕЗОПАСНОСТЬ',
    title: 'Инструменты рядом',
    text: 'SOS, NORS-таймер и справка не заменяют экстренные службы. Они помогают быстро сориентироваться, когда это важно.',
    steps: ['Настрой контакт для SOS', 'Используй таймер наблюдения', 'При угрозе жизни звони в экстренные службы']
  },
  {
    id: 'bulk',
    icon: ListPlus,
    eyebrow: '05 · ПАЧКОЙ',
    title: 'Вспомнил вечером',
    text: 'Если день был плотный — не вписывай по одной. Открой «Пачкой за день»: строки сохранятся по очереди, сломанная не отменит остальные.',
    steps: ['Открой «Запись»', 'Нажми «Пачкой за день»', 'Заполни строки и сохрани все сразу']
  },
  {
    id: 'account',
    icon: UserRound,
    eyebrow: '06 · АККАУНТ',
    title: 'Только если хочется',
    text: 'Аккаунт здесь локальный: имя и копии данных. Почты и пароля нет. Без аккаунта всё работает так же — записи и так на телефоне.',
    steps: ['Настройки → Аккаунт', 'Создай имя', 'Сохрани копию перед экспериментами']
  },
  {
    id: 'progress',
    icon: Sparkles,
    eyebrow: '04 · ПРОГРЕСС',
    title: 'Неделя в цифрах',
    text: 'Отмечай, чтобы видеть паттерны: сон, воду, самочувствие и дни без записей.',
    steps: ['Отмечай самочувствие', 'Проверяй недельный ритм', 'Выбирай один маленький шаг']
  }
] as const;

type TabId = 'lessons' | 'routes' | 'mixes' | 'overdose' | 'timings' | 'recovery';

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'lessons', label: 'Уроки' },
  { id: 'routes', label: 'Способы' },
  { id: 'mixes', label: 'Смеси' },
  { id: 'overdose', label: 'Передоз' },
  { id: 'timings', label: 'Тайминги' },
  { id: 'recovery', label: 'Восстановление' }
];

const routeIcons: Record<string, typeof Wind> = {
  inject: Fingerprint,
  smoke: Wind,
  oral: FlaskConical,
  sniff: Droplets
};

export default function Learn() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>('lessons');
  const [active, setActive] = useState<string | null>('start');
  const [completed, setCompleted] = useState<string[]>([]);
  const [demo, setDemo] = useState(false);
  const [openRoute, setOpenRoute] = useState<string>('inject');
  const [query, setQuery] = useState('');

  const toggleLesson = (id: string) => {
    setActive((value) => (value === id ? null : id));
    setCompleted((value) => (value.includes(id) ? value : [...value, id]));
  };

  const timingRows = useMemo(() => searchTimings(query).slice(0, query ? 40 : 14), [query]);
  const stopMixes = INTERACTIONS.filter((item) => item.level === 'stop');
  const cautionMixes = INTERACTIONS.filter((item) => item.level === 'caution');

  return (
    <div className="space-y-5 pb-8">
      <TopBar title="База знаний" eyebrow="СПРАВКА И ОБУЧЕНИЕ" />

      <Surface variant="glass" className="relative overflow-hidden p-5">
        <div className="relative flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-usnee-brand">
            <BookOpen className="h-7 w-7 text-white" aria-hidden="true" />
          </div>
          <div>
            <p className="text-label uppercase text-usnee-brand">С чего начать</p>
            <h1 className="mt-1 text-title-lg">Разберись за 2 минуты</h1>
            <p className="mt-2 text-body-sm text-usnee-text2">
              Короткие интерактивные подсказки вместо длинной инструкции. Ниже — справка: способы, смеси, передоз, тайминги.
            </p>
          </div>
        </div>
        {tab === 'lessons' && (
          <div className="mt-5 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-usnee-bg">
              <div
                className="h-full rounded-full bg-usnee-brand transition-[width] duration-500"
                style={{ width: `${(completed.length / lessons.length) * 100}%` }}
              />
            </div>
            <span className="text-caption text-usnee-text2">{completed.length}/{lessons.length}</span>
          </div>
        )}
      </Surface>

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div role="tablist" aria-label="Разделы базы знаний" className="flex min-w-max gap-1.5">
          {tabs.map((item) => (
            <button
              key={item.id}
              role="tab"
              type="button"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`min-h-9 rounded-full border px-3 text-caption font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-usnee-focus ${
                tab === item.id
                  ? 'border-usnee-brand bg-usnee-brand text-white'
                  : 'border-usnee-border bg-usnee-surface text-usnee-text2'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'lessons' && (
        <>
          <section className="space-y-3" aria-label="Уроки">
            {lessons.map((lesson) => {
              const Icon = lesson.icon;
              const isOpen = active === lesson.id;
              const isDone = completed.includes(lesson.id);
              return (
                <Surface key={lesson.id} className={`overflow-hidden transition-[border-color,background-color] duration-normal ${isOpen ? 'border-usnee-brand/50 bg-usnee-surface2' : ''}`}>
                  <button
                    type="button"
                    onClick={() => toggleLesson(lesson.id)}
                    aria-expanded={isOpen}
                    className="flex min-h-[76px] w-full items-center gap-3 p-4 text-left active:scale-[.99]"
                  >
                    <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${isDone ? 'bg-usnee-success/15 text-usnee-success' : 'bg-usnee-surface2 text-usnee-brand'}`}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                      {isDone && <Check className="absolute h-3 w-3 translate-x-4 -translate-y-4" aria-hidden="true" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-caption uppercase text-usnee-text3">{lesson.eyebrow}</p>
                      <h2 className="mt-1 text-title-md">{lesson.title}</h2>
                    </div>
                    {isOpen ? <ChevronUp className="h-5 w-5 text-usnee-text3" aria-hidden="true" /> : <ChevronDown className="h-5 w-5 text-usnee-text3" aria-hidden="true" />}
                  </button>
                  {isOpen && (
                    <div className="animate-slide-up border-t border-usnee-border px-4 pb-4 pt-3">
                      <p className="text-body-sm text-usnee-text2">{lesson.text}</p>
                      <ol className="mt-4 space-y-2">
                        {lesson.steps.map((step, stepIndex) => (
                          <li key={step} className="flex items-center gap-3 text-body-sm">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-usnee-brand/15 text-caption font-bold text-usnee-brand">{stepIndex + 1}</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                      {(lesson.id === 'start' || lesson.id === 'bulk') && (
                        <Button
                          variant="secondary"
                          className="mt-4 w-full"
                          onClick={() => navigate(lesson.id === 'bulk' ? '/add/bulk' : '/add')}
                        >
                          {lesson.id === 'bulk' ? 'Открыть пачкой' : 'Попробовать запись'}
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  )}
                </Surface>
              );
            })}
          </section>

          <Surface className="p-4">
            <div className="flex items-start gap-3">
              <Play className="mt-0.5 h-5 w-5 shrink-0 text-usnee-accent" aria-hidden="true" />
              <div>
                <h2 className="text-title-md">Мини-демо</h2>
                <p className="mt-1 text-body-sm text-usnee-text2">Нажми кнопку — увидишь, как приложение отвечает на действие.</p>
              </div>
            </div>
            <Button variant="primary" className="mt-4 w-full" onClick={() => setDemo((value) => !value)}>
              {demo ? 'Скрыть демо' : 'Запустить демо'}
              <ArrowRight className={`h-4 w-4 transition-transform duration-normal ${demo ? 'rotate-90' : ''}`} aria-hidden="true" />
            </Button>
            {demo && (
              <div className="animate-slide-up mt-3 rounded-md border border-usnee-success/30 bg-usnee-success/10 p-3 text-body-sm text-usnee-success">
                <Check className="mr-2 inline h-4 w-4" aria-hidden="true" />Готово. В USNEE любое действие должно давать понятный отклик.
              </div>
            )}
          </Surface>
        </>
      )}

      {tab === 'routes' && (
        <section className="space-y-3" aria-label="Риски по способу употребления">
          {ROUTE_KNOWLEDGE.map((route) => {
            const Icon = routeIcons[route.id] ?? ShieldCheck;
            const isOpen = openRoute === route.id;
            return (
              <Surface key={route.id} className="overflow-hidden">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenRoute(isOpen ? '' : route.id)}
                  className="flex min-h-14 w-full items-center gap-3 p-4 text-left"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-usnee-surface2 text-usnee-brand">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-title-md">{route.title}</span>
                    <span className="mt-0.5 block truncate text-caption text-usnee-text2">{route.points.length} пунктов · без морали</span>
                  </span>
                  {isOpen ? <ChevronUp className="h-5 w-5 text-usnee-text3" aria-hidden="true" /> : <ChevronDown className="h-5 w-5 text-usnee-text3" aria-hidden="true" />}
                </button>
                {isOpen && (
                  <div className="animate-slide-up border-t border-usnee-border px-4 pb-4 pt-3">
                    <p className="text-body-sm text-usnee-text2">{route.lead}</p>
                    <ul className="mt-3 space-y-2">
                      {route.points.map((point) => (
                        <li key={point} className="flex gap-2.5 text-body-sm text-usnee-text">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-usnee-brand" aria-hidden="true" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Surface>
            );
          })}
          <Surface className="p-4">
            <p className="text-caption uppercase text-usnee-text3">Время до эффекта</p>
            <ul className="mt-2 divide-y divide-usnee-borderSubtle">
              {ROUTE_ONSET.map((row) => (
                <li key={row.id} className="py-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-body-sm font-semibold">{row.label}</span>
                    <span className="num text-body-sm text-usnee-brand">{row.onset}</span>
                  </div>
                  <p className="mt-1 text-caption text-usnee-text2">{row.note}</p>
                </li>
              ))}
            </ul>
          </Surface>
        </section>
      )}

      {tab === 'mixes' && (
        <section className="space-y-3" aria-label="Опасные сочетания">
          <Surface variant="danger" className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-usnee-danger" aria-hidden="true" />
              <div>
                <h2 className="text-title-md">Не смешивать</h2>
                <p className="mt-1 text-body-sm text-usnee-text2">
                  {stopMixes.length} сочетаний, где риск смерти или тяжёлой травмы резко выше. Ниже — то, что стоит знать, но не пробовать.
                </p>
              </div>
            </div>
          </Surface>
          {stopMixes.map((item) => (
            <Surface key={item.id} className="p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-usnee-danger/12 px-2 py-0.5 text-[10px] font-bold uppercase text-usnee-danger">стоп</span>
                <span className="text-body-sm font-semibold">{item.a}</span>
                <span className="text-usnee-text3">+</span>
                <span className="text-body-sm font-semibold">{item.b}</span>
              </div>
              <p className="mt-2 text-body-sm text-usnee-text2">{item.text}</p>
            </Surface>
          ))}
          <h3 className="pt-2 text-caption uppercase text-usnee-text3">Осторожно, не смертельно, но неприятно</h3>
          {cautionMixes.map((item) => (
            <Surface key={item.id} className="p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-usnee-warning/15 px-2 py-0.5 text-[10px] font-bold uppercase text-usnee-warning">риск</span>
                <span className="text-body-sm font-semibold">{item.a}</span>
                <span className="text-usnee-text3">+</span>
                <span className="text-body-sm font-semibold">{item.b}</span>
              </div>
              <p className="mt-2 text-body-sm text-usnee-text2">{item.text}</p>
            </Surface>
          ))}
        </section>
      )}

      {tab === 'overdose' && (
        <section className="space-y-3" aria-label="Передозировка и первая помощь">
          <Surface variant="danger" className="p-4">
            <h2 className="flex items-center gap-2 text-title-md">
              <AlertTriangle className="h-5 w-5 text-usnee-danger" aria-hidden="true" /> Признаки передоза
            </h2>
            <ul className="mt-3 space-y-1.5">
              {OVERDOSE_SIGNS.map((sign) => (
                <li key={sign} className="flex gap-2 text-body-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-usnee-danger" aria-hidden="true" />
                  {sign}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-caption text-usnee-text2">
              Один симптом — уже повод звонить. «Подождём, может отойдёт» — самая дорогая ошибка.
            </p>
          </Surface>

          <Surface className="p-4">
            <h2 className="flex items-center gap-2 text-title-md">
              <ShieldCheck className="h-5 w-5 text-usnee-success" aria-hidden="true" /> Что делать по шагам
            </h2>
            <ol className="mt-3 space-y-2.5">
              {FIRST_AID_STEPS.map((step, index) => (
                <li key={step} className="flex gap-3 text-body-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-usnee-success/15 text-caption font-bold text-usnee-success">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Surface>

          <Surface className="p-4">
            <h2 className="flex items-center gap-2 text-title-md">
              <Phone className="h-5 w-5 text-usnee-brand" aria-hidden="true" /> Куда звонить
            </h2>
            <ul className="mt-3 space-y-2">
              {EMERGENCY_NUMBERS.map((item) => (
                <li key={item.number}>
                  <a
                    href={`tel:${item.number.split(' ')[0]}`}
                    className="flex min-h-12 items-center gap-3 rounded-md bg-usnee-surface2 px-3 transition-colors hover:bg-usnee-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-usnee-focus"
                  >
                    <span className="num text-title-md font-bold text-usnee-brand">{item.number}</span>
                    <span className="text-body-sm text-usnee-text2">{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
            <Button variant="secondary" className="mt-4 w-full" onClick={() => navigate('/safety')}>
              Открыть экран безопасности
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Surface>
        </section>
      )}

      {tab === 'timings' && (
        <section className="space-y-3" aria-label="Тайминги веществ">
          <label className="block">
            <span className="sr-only">Поиск вещества</span>
            <span className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-usnee-text3" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Вещество или алиас: меф, кетамин, ксан"
                className="min-h-12 w-full rounded-lg border border-usnee-border bg-usnee-surface pl-9 pr-3 text-body-sm text-usnee-text outline-none placeholder:text-usnee-text3 focus-visible:ring-2 focus-visible:ring-usnee-focus"
              />
            </span>
          </label>

          <Surface className="px-4 py-1">
            <div className="grid grid-cols-[1.4fr_.7fr_.8fr_.8fr] gap-2 border-b border-usnee-borderSubtle py-2 text-[10px] uppercase tracking-wide text-usnee-text3">
              <span>Вещество</span>
              <span className="text-right">Пик</span>
              <span className="text-right">Длит.</span>
              <span className="text-right">T½</span>
            </div>
            {timingRows.length === 0 ? (
              <p className="py-6 text-center text-body-sm text-usnee-text2">
                Ничего не нашлось. Попробуй часть названия — например «мет».
              </p>
            ) : (
              <ul className="divide-y divide-usnee-borderSubtle">
                {timingRows.map((row) => (
                  <li key={row.id} className="grid grid-cols-[1.4fr_.7fr_.8fr_.8fr] items-baseline gap-2 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-body-sm font-semibold">{row.name}</span>
                      <span className="block truncate text-[10px] uppercase tracking-wide text-usnee-text3">{row.category}</span>
                    </span>
                    <span className="num text-right text-body-sm text-usnee-text2">{row.peak}</span>
                    <span className="num text-right text-body-sm text-usnee-text2">{row.duration}</span>
                    <span className="num text-right text-body-sm text-usnee-text3">{row.halfLife}</span>
                  </li>
                ))}
              </ul>
            )}
          </Surface>

          <Surface className="p-4">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-usnee-info" aria-hidden="true" />
              <p className="text-caption text-usnee-text2">
                Цифры — справочные, средние по пероральному приёму. Твой способ употребления и доза двигают их сильно: смотри вкладку «Способы».
                Пик — время максимальной концентрации, T½ — период полувыведения из плазмы.
              </p>
            </div>
          </Surface>
        </section>
      )}

      {tab === 'recovery' && (
        <section className="space-y-3" aria-label="Восстановление">
          {RECOVERY_CARDS.map((card) => (
            <Surface key={card.id} className="p-4">
              <h2 className="flex items-center gap-2 text-title-md">
                {card.id === 'water' ? <Droplets className="h-5 w-5 text-usnee-cyan" aria-hidden="true" />
                  : card.id === 'sleep' ? <Moon className="h-5 w-5 text-usnee-info" aria-hidden="true" />
                  : <Sparkles className="h-5 w-5 text-usnee-accent" aria-hidden="true" />}
                {card.title}
              </h2>
              <p className="mt-2 text-body-sm text-usnee-text2">{card.lead}</p>
              <ul className="mt-3 space-y-2">
                {card.points.map((point) => (
                  <li key={point} className="flex gap-2.5 text-body-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-usnee-success" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </Surface>
          ))}
        </section>
      )}
    </div>
  );
}