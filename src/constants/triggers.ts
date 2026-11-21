import { Trigger } from '../types';

export const TRIGGERS: Trigger[] = [
  { id: 'stress', name: 'Стресс', icon: 'Zap' },
  { id: 'boredom', name: 'Скука', icon: 'Clock' },
  { id: 'social', name: 'Компания', icon: 'Users' },
  { id: 'pain', name: 'Боль / недосып', icon: 'Activity' },
  { id: 'celebration', name: 'Праздник', icon: 'PartyPopper' },
  { id: 'withdrawal', name: 'Ломка', icon: 'Flame' },
  { id: 'test', name: 'Проверка качества', icon: 'TestTube' },
  { id: 'habit', name: 'Привычка', icon: 'RotateCcw' },
  { id: 'curiosity', name: 'Любопытство', icon: 'Search' },
  { id: 'custom', name: 'Свой вариант', icon: 'PenTool' }
];

export type AchievementCategory = 'start' | 'regularity' | 'variety' | 'safety' | 'social' | 'usage' | 'rare';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  condition: string;
  category: AchievementCategory;
}

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  start: 'Старт',
  regularity: 'Регулярность',
  variety: 'Разнообразие',
  safety: 'Безопасность',
  social: 'Социальное',
  usage: 'Ирония',
  rare: 'Редкие'
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: 'first', name: 'Первая запись', description: 'Первая запись сохранена на устройстве.', condition: 'entries >= 1', category: 'start' },
  { id: 'night_owl', name: 'Ночная запись', description: 'Есть запись около 3:00. Следите за сном и восстановлением.', condition: 'entry_at_3am', category: 'usage' },
  { id: 'lone_wolf', name: 'Запись в одиночку', description: 'Отмечено употребление в одиночку. В рискованной ситуации лучше не оставаться одному.', condition: 'alone_entry', category: 'social' },
  { id: 'chemist', name: 'Несколько веществ', description: 'В истории есть 5 разных веществ.', condition: 'unique_substances >= 5', category: 'variety' },
  { id: 'pulse_racer', name: 'Высокий пульс', description: 'Зафиксирован пульс 140+. При ухудшении самочувствия обращайтесь за помощью.', condition: 'pulse >= 140', category: 'safety' },
  { id: 'fentanyl_slayer', name: 'Тест на фентанил', description: 'Отмечен отрицательный тест на фентанил.', condition: 'fentanyl_negative', category: 'safety' },
  { id: 'missed_shot', name: 'Промах отмечен', description: 'Зафиксирован промах. Следите за местом инъекции и стерильностью.', condition: 'missed_shot', category: 'safety' },
  { id: 'week_bender', name: 'Неделя подряд', description: 'Записи 7 дней подряд. Имеет смысл пересмотреть нагрузку и паузы.', condition: 'streak >= 7', category: 'regularity' },
  { id: 'clean_7', name: 'Семь дней без', description: 'Неделя без записей употребления. После паузы толерантность ниже — начинайте осторожнее.', condition: 'clean_streak >= 7', category: 'regularity' },
  { id: 'hydrated', name: 'Вода', description: 'Отмечено питьё воды при активных записях.', condition: 'water_3_entries', category: 'safety' },
  { id: 'still_alive', name: 'Ого, ты всё ещё живой', description: '5 инъекций за день. Респект организму.', condition: 'entries_24h >= 5', category: 'usage' },
  { id: 'work_tomorrow', name: 'Надеюсь, завтра не на работу', description: '3 инъекции после полуночи. Босс будет рад.', condition: 'night_entries_24h >= 3', category: 'usage' },
  { id: 'barely_breathing', name: 'Еле-еле, но иду', description: 'Интервал меньше часа. Ты точно в порядке?', condition: 'min_interval < 1h', category: 'usage' },
  { id: 'to_infinity', name: 'Бесконечность не предел', description: '10 инъекций за сутки. Buzz Lightyear гордился бы.', condition: 'entries_24h >= 10', category: 'usage' },
  { id: 'vampire', name: 'Ночная смена', description: 'Все инъекции с 00:00 до 06:00. Сон для слабых.', condition: 'all_entries_24h_00_06', category: 'usage' },
  { id: 'speedrun', name: 'Спидраннер', description: '3 инъекции за час. Any% категория?', condition: 'entries_1h >= 3', category: 'usage' },
  { id: 'marathon', name: 'Марафонец', description: '24 часа с инъекциями каждый час. Выносливость.', condition: 'hourly_run >= 24', category: 'usage' },
  { id: 'collector', name: 'Коллекционер', description: '5 разных мест за день. Всё тело в деле.', condition: 'sites_24h >= 5', category: 'usage' },
  { id: 'pharmacist', name: 'Аптечка-тоска', description: 'Закончили партию за 1 день. Скорость света.', condition: 'batch_empty_same_day', category: 'usage' },
  { id: 'architect', name: 'Архитектор', description: 'Первый раз запланировали партию заранее. Мыслитель.', condition: 'batch_exists', category: 'usage' },
  { id: 'diary', name: 'Писатель', description: 'Записали 3 заметки о триггерах. Самоанализ — это круто.', condition: 'notes_or_triggers >= 3', category: 'usage' },
  { id: 'rank_active', name: 'Ритм', description: 'Досрочно до ранга «Актив».', condition: 'rank >= active', category: 'regularity' },
  { id: 'rank_pro', name: 'Своя колея', description: 'Хватает регулярности на ранг «Профи».', condition: 'rank >= pro', category: 'regularity' },
  { id: 'rank_legend', name: 'Легенда', description: 'Максимальный ранг. Дальше только продолжать.', condition: 'rank >= legend', category: 'regularity' },
  { id: 'streak_3', name: 'Первый шаг', description: 'Три дня подряд с записью. Регулярность важнее дозы — и это не шутка.', condition: 'streak >= 3', category: 'regularity' },
  { id: 'streak_14', name: 'Две недели в ритме', description: '14 дней подряд. Это уже не подвиг, а привычка.', condition: 'streak >= 14', category: 'regularity' },
  { id: 'variety_8', name: 'Разнообразие', description: 'Восемь разных веществ в истории. Музей уже можно открывать.', condition: 'unique_substances >= 8', category: 'variety' },
  { id: 'tested_3', name: 'Проверяющий', description: 'Три отрицательных теста на фентанил. Тест — это данные, а не паранойя.', condition: 'fentanyl_negative >= 3', category: 'safety' },
  { id: 'contact_ready', name: 'Есть кому позвонить', description: 'Настроен экстренный контакт. Один звонок иногда весит больше всей аптечки.', condition: 'emergency_contact_set', category: 'safety' },
  { id: 'not_alone', name: 'Не один', description: 'Десять записей в компании. Свидетели — лучшая страховка.', condition: 'not_alone_entries >= 10', category: 'social' },
  { id: 'phoenix', name: 'Феникс', description: 'Возврат после паузы больше месяца. Толерантность уже не та — доза тоже должна быть меньше.', condition: 'return_after_pause >= 30d', category: 'rare' },
  { id: 'chronicle', name: 'Хроник', description: '365 разных дней с записями. Архив, который не стыдно показать врачу.', condition: 'unique_days >= 365', category: 'rare' },
];
