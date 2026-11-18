import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RecordResult } from './RecordResult';

describe('record components', () => {
  it('result exposes local-only copy and actions', async () => { const home = vi.fn(); const another = vi.fn(); const undo = vi.fn(); render(<RecordResult undoing={false} onHome={home} onAnother={another} onUndo={undo} />); expect(screen.getByText('Сохранено на устройстве')).toBeInTheDocument(); expect(screen.getByText('На устройстве')).toBeInTheDocument(); await userEvent.click(screen.getByRole('button', { name: /Отменить запись/ })); expect(undo).toHaveBeenCalled(); });
});
