import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Accounts from './Accounts';

const state = {
  accounts: [] as Array<{ id: string; name: string; createdAt: number; updatedAt: number }>,
  snapshots: [] as Array<{ id: string; accountId: string; label: string; createdAt: number; counts: Record<string, number> }>
};

const listAccounts = vi.fn(async () => state.accounts);
const listSnapshots = vi.fn(async (id: string) => state.snapshots.filter((snapshot) => snapshot.accountId === id));
const putAccount = vi.fn(async (account: (typeof state.accounts)[number]) => {
  const index = state.accounts.findIndex((row) => row.id === account.id);
  if (index === -1) state.accounts.push(account);
  else state.accounts[index] = account;
});
const saveAccountSnapshot = vi.fn(async (accountId: string) => {
  const snapshot = {
    id: 's1',
    accountId,
    label: 'Копия',
    createdAt: Date.now(),
    counts: { entries: 3, batches: 0, sleep: 0, mood: 0, food: 0, water: 0 }
  };
  state.snapshots.push(snapshot);
  return snapshot;
});
const restoreAccountSnapshot = vi.fn(async (_id: string) => 3);
const deleteAccount = vi.fn(async (id: string) => {
  state.accounts = state.accounts.filter((row) => row.id !== id);
});
const deleteAccountSnapshot = vi.fn(async (_id: string) => undefined);

vi.mock('../utils/db', () => ({
  listAccounts: () => listAccounts(),
  listSnapshots: (id: string) => listSnapshots(id),
  putAccount: (account: never) => putAccount(account),
  saveAccountSnapshot: (id: string) => saveAccountSnapshot(id),
  restoreAccountSnapshot: (id: string) => restoreAccountSnapshot(id as never),
  deleteAccount: (id: string) => deleteAccount(id),
  deleteAccountSnapshot: (id: string) => deleteAccountSnapshot(id as never)
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <Accounts />
    </MemoryRouter>
  );
}

describe('Accounts page', () => {
  beforeEach(() => {
    state.accounts = [];
    state.snapshots = [];
    vi.clearAllMocks();
  });

  it('explains that accounts are optional and local', async () => {
    renderPage();
    expect(await screen.findByText(/Аккаунтов нет/i)).toBeInTheDocument();
    expect(screen.getByText(/Аккаунт пока локальный/i)).toBeInTheDocument();
  });

  it('creates an account and marks it as current', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/Новый аккаунт/i), 'Основной');
    await user.click(screen.getByRole('button', { name: /Создать аккаунт/i }));

    await waitFor(() => expect(putAccount).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Основной')).toBeInTheDocument();
    expect(screen.getByText('Текущий')).toBeInTheDocument();
  });

  it('rejects a duplicate name', async () => {
    state.accounts = [{ id: 'a1', name: 'Основной', createdAt: 1, updatedAt: 1 }];
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Основной');
    await user.type(screen.getByLabelText(/Новый аккаунт/i), ' основной ');
    expect(await screen.findByText(/Такое имя уже есть/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Создать аккаунт/i })).toBeDisabled();
  });

  it('saves a copy and shows its summary', async () => {
    state.accounts = [{ id: 'a1', name: 'Основной', createdAt: 1, updatedAt: 1 }];
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Основной');
    await user.click(screen.getByRole('button', { name: /Выбрать/i }));
    await screen.findByRole('button', { name: /Сохранить копию/i });

    await user.click(screen.getByRole('button', { name: /Сохранить копию/i }));

    await waitFor(() => expect(saveAccountSnapshot).toHaveBeenCalledWith('a1'));
    expect(await screen.findByText(/Копия сохранена/i)).toBeInTheDocument();
  });

  it('restores a snapshot and reports the count', async () => {
    state.accounts = [{ id: 'a2', name: 'Второй', createdAt: 1, updatedAt: 1 }];
    state.snapshots = [
      { id: 's2', accountId: 'a2', label: 'Копия', createdAt: Date.now(), counts: { entries: 3, batches: 0, sleep: 0, mood: 0, food: 0, water: 0 } }
    ];
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Второй');
    await user.click(screen.getByRole('button', { name: /Выбрать/i }));
    const restore = await screen.findByRole('button', { name: /Восстановить копию/i });

    await user.click(restore);
    expect(restoreAccountSnapshot).not.toHaveBeenCalled();
    expect(await screen.findByText(/Нажми ещё раз/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Подтвердить восстановление/i }));

    await waitFor(() => expect(restoreAccountSnapshot).toHaveBeenCalledWith('s2'));
    expect(await screen.findByText(/Восстановлено 3 записей/i)).toBeInTheDocument();
  });
});
