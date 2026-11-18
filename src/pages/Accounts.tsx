import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArchiveRestore, HardDriveDownload, Plus, Trash2, UserRound } from 'lucide-react';
import { Button, InlineNotice, Surface, TopBar } from '../components/ui';
import { useAppStore } from '../stores/appStore';
import {
  deleteAccount,
  deleteAccountSnapshot,
  listAccounts,
  listSnapshots,
  putAccount,
  restoreAccountSnapshot,
  saveAccountSnapshot
} from '../utils/db';
import type { AccountSnapshot, LocalAccount } from '../types';
import { formatStamp, isEmptySnapshot, snapshotSummary, validateAccountName } from '../domain/accounts';
import { createUuid } from '../utils/ids';

export default function Accounts() {
  const navigate = useNavigate();
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const [accounts, setAccounts] = useState<LocalAccount[]>([]);
  const [snapshots, setSnapshots] = useState<AccountSnapshot[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger' | 'info'; text: string } | null>(null);
  const [restorePending, setRestorePending] = useState<string | null>(null);

  const activeId = settings.activeAccountId;
  const active = useMemo(() => accounts.find((account) => account.id === activeId) ?? null, [accounts, activeId]);

  const refresh = async () => {
    const rows = await listAccounts();
    setAccounts(rows);
    const current = rows.find((account) => account.id === activeId);
    setSnapshots(current ? await listSnapshots(current.id) : []);
  };

  useEffect(() => {
    void refresh();
  }, [activeId]);

  const nameError = validateAccountName(name, accounts.map((account) => account.name));

  const createAccount = async () => {
    if (nameError) return;
    setBusy(true);
    try {
      const now = Date.now();
      const account: LocalAccount = { id: createUuid(), name: name.trim().replace(/\s+/g, ' '), createdAt: now, updatedAt: now };
      await putAccount(account);
      updateSettings({ activeAccountId: account.id });
      setName('');
      setNotice({ tone: 'success', text: `Аккаунт «${account.name}» создан` });
      await refresh();
    } catch {
      setNotice({ tone: 'danger', text: 'Не удалось создать аккаунт' });
    } finally {
      setBusy(false);
    }
  };

  const saveCopy = async (account: LocalAccount) => {
    setBusy(true);
    try {
      const snapshot = await saveAccountSnapshot(account.id);
      await putAccount({ ...account, updatedAt: Date.now() });
      setNotice({
        tone: isEmptySnapshot(snapshot.counts) ? 'info' : 'success',
        text: isEmptySnapshot(snapshot.counts) ? 'Копия пустая — записей пока нет' : 'Копия сохранена'
      });
      await refresh();
    } catch {
      setNotice({ tone: 'danger', text: 'Не удалось сохранить копию' });
    } finally {
      setBusy(false);
    }
  };

  const restore = async (snapshot: AccountSnapshot) => {
    if (restorePending !== snapshot.id) {
      setRestorePending(snapshot.id);
      return;
    }
    setRestorePending(null);
    setBusy(true);
    try {
      const restored = await restoreAccountSnapshot(snapshot.id);
      setNotice({ tone: 'success', text: `Восстановлено ${restored} записей` });
      await refresh();
    } catch (error) {
      setNotice({ tone: 'danger', text: error instanceof Error ? error.message : 'Не удалось восстановить' });
    } finally {
      setBusy(false);
    }
  };

  const removeAccount = async (account: LocalAccount) => {
    setBusy(true);
    try {
      await deleteAccount(account.id);
      if (account.id === activeId) updateSettings({ activeAccountId: undefined });
      setNotice({ tone: 'info', text: `Аккаунт «${account.name}» удалён` });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      <TopBar title="Аккаунт" eyebrow="ПО ЖЕЛАНИЮ" onBack={() => navigate('/settings')} />

      <InlineNotice tone="info" title="Аккаунт пока локальный">
        Данные лежат на этом устройстве. Аккаунт — имя и сохранённые копии, а не сервер. Пароль и почта не нужны.
      </InlineNotice>

      <Surface className="space-y-3 p-4">
        <label className="block text-caption uppercase tracking-[.12em] text-usnee-text3" htmlFor="account-name">
          Новый аккаунт
        </label>
        <div className="flex gap-2">
          <input
            id="account-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например, «Основной»"
            maxLength={32}
            className="min-h-12 min-w-0 flex-1 rounded-md border border-usnee-border bg-usnee-surface px-3 text-body-sm text-usnee-text outline-none placeholder:text-usnee-text3 focus-visible:ring-2 focus-visible:ring-usnee-focus"
          />
          <Button onClick={() => void createAccount()} loading={busy} disabled={Boolean(nameError)} iconOnly aria-label="Создать аккаунт">
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        {name.trim() && nameError && <p className="text-caption text-usnee-danger">{nameError}</p>}
      </Surface>

      {notice && (
        <InlineNotice tone={notice.tone} title={notice.text} />
      )}

      {accounts.length === 0 ? (
        <Surface className="p-5 text-center">
          <UserRound className="mx-auto h-6 w-6 text-usnee-text3" aria-hidden="true" />
          <p className="mt-2 text-body-sm text-usnee-text2">
            Аккаунтов нет. Без них приложение работает так же — аккаунт нужен только для копий.
          </p>
        </Surface>
      ) : (
        <section className="space-y-3" aria-label="Аккаунты">
          {accounts.map((account) => {
            const isActive = account.id === activeId;
            return (
              <Surface key={account.id} className={isActive ? 'border-usnee-borderStrong p-4' : 'p-4'}>
                <div className="flex items-start gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-usnee-surface2 ${isActive ? 'text-usnee-brand' : 'text-usnee-text3'}`}>
                    <UserRound className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-md font-semibold">{account.name}</p>
                    <p className="text-caption text-usnee-text3">
                      {isActive ? 'Выбран' : 'Создан'} · {formatStamp(account.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSettings({ activeAccountId: account.id })}
                    className="min-h-9 rounded-md px-2 text-caption font-semibold text-usnee-brand transition-colors hover:bg-usnee-surface2 disabled:text-usnee-text3 focus-visible:ring-2 focus-visible:ring-usnee-focus"
                    disabled={isActive}
                  >
                    {isActive ? 'Текущий' : 'Выбрать'}
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" loading={busy} onClick={() => void saveCopy(account)}>
                    <HardDriveDownload className="h-4 w-4" aria-hidden="true" />
                    Сохранить копию
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void removeAccount(account)}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Удалить
                  </Button>
                </div>

                {isActive && snapshots.length > 0 && (
                  <ul className="mt-3 space-y-2 border-t border-usnee-borderSubtle pt-3">
                    {snapshots.map((snapshot) => (
                      <li key={snapshot.id} className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body-sm">{snapshot.label}</p>
                          <p className="text-caption text-usnee-text3">
                            {formatStamp(snapshot.createdAt)} · {snapshotSummary(snapshot.counts)}
                          </p>
                          {restorePending === snapshot.id && (
                            <p className="text-caption text-usnee-brand">Нажми ещё раз: текущие данные заменятся</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => void restore(snapshot)}
                          aria-label={restorePending === snapshot.id ? 'Подтвердить восстановление' : 'Восстановить копию'}
                          className={`grid h-10 w-10 place-items-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-usnee-focus ${
                            restorePending === snapshot.id
                              ? 'bg-usnee-brand text-white'
                              : 'text-usnee-text2 hover:bg-usnee-surface2 hover:text-usnee-text'
                          }`}
                        >
                          <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteAccountSnapshot(snapshot.id);
                            setRestorePending(null);
                            await refresh();
                          }}
                          aria-label="Удалить копию"
                          className="grid h-10 w-10 place-items-center rounded-md text-usnee-text3 transition-colors hover:bg-usnee-surface2 hover:text-usnee-danger focus-visible:ring-2 focus-visible:ring-usnee-focus"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Surface>
            );
          })}
        </section>
      )}

      {active && (
        <p className="text-caption text-usnee-text3">
          Восстановление копии заменяет все текущие данные на устройстве содержимым копии. Перед заменой сохрани свежую копию.
        </p>
      )}
    </div>
  );
}
