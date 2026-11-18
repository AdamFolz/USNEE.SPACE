import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Button, Surface, TopBar } from '../components/ui';
import { SubstanceIcon } from '../components/record/SubstanceIcon';
import { METHODS } from '../constants/methods';
import { SUBSTANCES } from '../constants/substances';
import { useQuickRecordDefaults } from '../hooks/useQuickRecordDefaults';
import type { QuickRecordDraft } from '../domain/record';
import { prepareRecordCommand, persistPreparedRecord, PreparedRecordCommand } from '../services/recordPersistence';
import { useAppStore } from '../stores/appStore';

interface BulkRow {
  key: number;
  substanceId: string;
  methodId: string;
  amountInput: string;
  amountUnit: QuickRecordDraft['amountUnit'];
  occurredAt: number;
}

const toLocalInput = (timestamp: number) => {
  const date = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const rowErrors = (row: BulkRow): string[] => {
  const errors: string[] = [];
  if (!row.substanceId) errors.push('вещество');
  if (!row.methodId) errors.push('способ');
  const amount = Number(row.amountInput.replace(',', '.'));
  if (!row.amountInput || Number.isNaN(amount) || amount <= 0) errors.push('количество');
  return errors;
};

export default function BulkAdd() {
  const navigate = useNavigate();
  const defaults = useQuickRecordDefaults();
  const setLastRecordContext = useAppStore((state) => state.setLastRecordContext);
  const now = Date.now();
  const [rows, setRows] = useState<BulkRow[]>([
    { key: 1, substanceId: '', methodId: '', amountInput: '', amountUnit: 'мг', occurredAt: now }
  ]);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [problems, setProblems] = useState<string[]>([]);

  const nextKey = useMemo(() => rows.reduce((max, row) => Math.max(max, row.key), 0) + 1, [rows]);
  const totalValid = rows.filter((row) => rowErrors(row).length === 0).length;

  const update = (key: number, patch: Partial<BulkRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    setProblems([]);
  };

  const addRow = () => {
    setRows((current) => [
      ...current,
      { key: nextKey, substanceId: '', methodId: '', amountInput: '', amountUnit: 'мг', occurredAt: now }
    ]);
  };

  const removeRow = (key: number) => {
    setRows((current) => (current.length === 1 ? current : current.filter((row) => row.key !== key)));
  };

  const draftFor = (row: BulkRow): QuickRecordDraft => {
    const substance = SUBSTANCES.find((item) => item.id === row.substanceId);
    const method = METHODS.find((item) => item.id === row.methodId);
    return {
      substanceId: row.substanceId,
      substanceName: substance?.name,
      methodId: row.methodId,
      methodName: method?.name,
      amountInput: row.amountInput.replace(',', '.'),
      amountUnit: row.amountUnit,
      occurredAt: row.occurredAt,
      alone: true
    };
  };

  const save = async () => {
    if (saving) return;
    const usable = rows.filter((row) => rowErrors(row).length === 0);
    if (!usable.length) {
      setProblems(['Заполни хотя бы одну строку: вещество, способ и количество.']);
      return;
    }

    setSaving(true);
    setProblems([]);
    const failed: string[] = [];
    const prepared: PreparedRecordCommand[] = [];
    let last: BulkRow | null = null;

    for (const row of usable) {
      try {
        const command = prepareRecordCommand(draftFor(row), defaults.batch);
        await persistPreparedRecord(command);
        prepared.push(command);
        last = row;
      } catch (error) {
        const substance = SUBSTANCES.find((item) => item.id === row.substanceId)?.name ?? 'строка';
        failed.push(`${substance}: ${error instanceof Error ? error.message : 'не сохранилось'}`);
      }
    }

    setSaving(false);
    setSavedCount(prepared.length);

    if (last) {
      const entry = prepared[prepared.length - 1]?.entry;
      if (entry) {
        setLastRecordContext({
          substanceId: entry.substanceId,
          substanceName: entry.substanceName,
          methodId: entry.methodId,
          methodName: entry.methodName,
          amountUnit: entry.doseUnit,
          batchId: entry.batchId,
          injectionSite: entry.injectionSite
        });
      }
    }

    if (failed.length) {
      setProblems(failed);
      return;
    }
    navigate('/history', { replace: true });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <TopBar title="Массовая запись" eyebrow="ПАЧКОЙ ЗА ДЕНЬ" onBack={() => navigate('/add')} />

      <p className="text-body-sm text-usnee-text2">
        Вспомнил вечером — впиши всё сразу. Строки сохранятся по очереди, каждая останется на устройстве.
      </p>

      <div className="space-y-3">
        {rows.map((row, index) => {
          const errors = rowErrors(row);
          return (
            <Surface key={row.key} className="p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-caption uppercase text-usnee-text3">Строка {index + 1}</span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    aria-label={`Удалить строку ${index + 1}`}
                    className="grid h-9 w-9 place-items-center rounded-md text-usnee-text3 transition-colors hover:bg-usnee-surface2 hover:text-usnee-danger"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="col-span-1 block">
                  <span className="sr-only">Вещество</span>
                  <div className="flex items-center gap-2">
                    <SubstanceIcon substanceId={row.substanceId} color={SUBSTANCES.find((s) => s.id === row.substanceId)?.color} />
                    <select
                      value={row.substanceId}
                      onChange={(event) => update(row.key, { substanceId: event.target.value })}
                      className="min-h-12 w-full min-w-0 rounded-md border border-usnee-border bg-usnee-surface px-2 text-body-sm text-usnee-text"
                    >
                      <option value="">Вещество</option>
                      {SUBSTANCES.map((substance) => (
                        <option key={substance.id} value={substance.id}>
                          {substance.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
                <label className="col-span-1 block">
                  <span className="sr-only">Способ</span>
                  <select
                    value={row.methodId}
                    onChange={(event) => update(row.key, { methodId: event.target.value })}
                    className="min-h-12 w-full rounded-md border border-usnee-border bg-usnee-surface px-2 text-body-sm text-usnee-text"
                  >
                    <option value="">Способ</option>
                    {METHODS.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-2 flex gap-2">
                <input
                  value={row.amountInput}
                  onChange={(event) => update(row.key, { amountInput: event.target.value })}
                  inputMode="decimal"
                  aria-label="Количество"
                  placeholder="0"
                  className="num min-h-12 w-20 rounded-md border border-usnee-border bg-usnee-surface px-2 text-center text-body-md text-usnee-text"
                />
                <select
                  value={row.amountUnit}
                  onChange={(event) => update(row.key, { amountUnit: event.target.value as QuickRecordDraft['amountUnit'] })}
                  aria-label="Единица"
                  className="min-h-12 w-16 rounded-md border border-usnee-border bg-usnee-surface px-1 text-center text-body-sm text-usnee-text"
                >
                  <option value="мг">мг</option>
                  <option value="мл">мл</option>
                  <option value="шт">шт</option>
                  <option value="доза">доза</option>
                </select>
                <input
                  type="datetime-local"
                  value={toLocalInput(row.occurredAt)}
                  onChange={(event) => {
                    const parsed = new Date(event.target.value).getTime();
                    if (!Number.isNaN(parsed)) update(row.key, { occurredAt: parsed });
                  }}
                  aria-label="Когда"
                  className="num min-h-12 min-w-0 flex-1 rounded-md border border-usnee-border bg-usnee-surface px-2 text-body-sm text-usnee-text"
                />
              </div>

              {errors.length > 0 && (
                <p className="mt-2 text-caption text-usnee-text3">Не хватает: {errors.join(', ')}</p>
              )}
            </Surface>
          );
        })}
      </div>

      <Button variant="secondary" onClick={addRow}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Ещё строка
      </Button>

      {problems.length > 0 && (
        <Surface variant="danger" className="p-3">
          <p className="text-body-sm font-semibold text-usnee-danger">
            {savedCount > 0 ? `Сохранилось ${savedCount}, остальное нет` : 'Не сохранилось'}
          </p>
          <ul className="mt-1 space-y-0.5 text-caption text-usnee-text2">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </Surface>
      )}

      <Button size="lg" onClick={() => void save()} loading={saving} disabled={totalValid === 0}>
        <Save className="h-5 w-5" aria-hidden="true" />
        Записать {totalValid > 0 ? `${totalValid} шт.` : 'пачкой'}
      </Button>

      <p className="pb-2 text-center text-caption text-usnee-text3">
        Отменить можно по одной — в журнале, пока запись свежая.
      </p>
    </div>
  );
}
