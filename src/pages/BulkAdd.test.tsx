import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BulkAdd from './BulkAdd';

const persistPreparedRecord = vi.fn(async () => undefined);

vi.mock('../hooks/useQuickRecordDefaults', () => ({
  useQuickRecordDefaults: () => ({
    status: 'ready',
    entries: [],
    batch: null,
    draft: {
      substanceId: null,
      methodId: null,
      amountInput: '',
      amountUnit: 'мг',
      occurredAt: Date.now(),
      alone: true
    }
  })
}));

vi.mock('../services/recordPersistence', () => ({
  prepareRecordCommand: (draft: { substanceId: string; methodId: string }) => ({
    entry: {
      id: 'e-' + draft.substanceId,
      substanceId: draft.substanceId,
      substanceName: draft.substanceId,
      methodId: draft.methodId,
      methodName: draft.methodId,
      doseUnit: 'мг',
      methodDetails: {},
      injectionSite: undefined,
      batchId: undefined
    }
  }),
  persistPreparedRecord: () => persistPreparedRecord()
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/add/bulk']}>
      <Routes>
        <Route path="/add/bulk" element={<BulkAdd />} />
        <Route path="/history" element={<div>Журнал открыт</div>} />
        <Route path="/add" element={<div>Запись</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BulkAdd', () => {
  beforeEach(() => persistPreparedRecord.mockClear());

  it('starts with one row and a disabled save button', () => {
    renderPage();
    expect(screen.getByText('Строка 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Записать пачкой/i })).toBeDisabled();
    expect(screen.getByText(/Не хватает: вещество, способ, количество/)).toBeInTheDocument();
  });

  it('adds a row and reports per-row gaps', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Ещё строка/i }));
    expect(screen.getByText('Строка 2')).toBeInTheDocument();
  });

  it('saves every filled row and opens the journal', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getAllByRole('combobox')[0], 'meph');
    await user.selectOptions(screen.getAllByRole('combobox')[1], 'inject');
    await user.type(screen.getByLabelText('Количество'), '1');

    await user.click(screen.getByRole('button', { name: /Ещё строка/i }));
    const combos = screen.getAllByRole('combobox');
    await user.selectOptions(combos[3], 'weed');
    await user.selectOptions(combos[4], 'smoke');
    const amounts = screen.getAllByLabelText('Количество');
    await user.type(amounts[1], '0.2');

    await user.click(screen.getByRole('button', { name: /Записать 2 шт/i }));

    await waitFor(() => expect(persistPreparedRecord).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText('Журнал открыт')).toBeInTheDocument());
  });

  it('keeps going and lists what failed', async () => {
    const user = userEvent.setup();
    persistPreparedRecord.mockRejectedValueOnce(new Error('диск занят'));
    renderPage();

    await user.selectOptions(screen.getAllByRole('combobox')[0], 'meph');
    await user.selectOptions(screen.getAllByRole('combobox')[1], 'inject');
    await user.type(screen.getByLabelText('Количество'), '1');

    await user.click(screen.getByRole('button', { name: /Ещё строка/i }));
    const combos = screen.getAllByRole('combobox');
    await user.selectOptions(combos[3], 'weed');
    await user.selectOptions(combos[4], 'smoke');
    await user.type(screen.getAllByLabelText('Количество')[1], '0.2');

    await user.click(screen.getByRole('button', { name: /Записать 2 шт/i }));

    await waitFor(() => expect(screen.getByText(/Сохранилось 1, остальное нет/i)).toBeInTheDocument());
    expect(screen.getByText(/диск занят/i)).toBeInTheDocument();
    expect(screen.queryByText('Журнал открыт')).toBeNull();
  });
});
