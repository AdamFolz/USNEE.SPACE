import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
  message: string | null;
}

/**
 * Ловит падения рендера: вместо белого экрана — тёплый текст и перезагрузка.
 * Записи лежат в IndexedDB, поэтому сбой интерфейса их не трогает.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, message: null };

  static getDerivedStateFromError(error: unknown): State {
    return {
      failed: true,
      message: error instanceof Error ? error.message : String(error ?? '')
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Не отправляем никуда: приложение локальное. Держим след в консоли для отладки.
    console.error('USNEE render error', error, info.componentStack);
  }

  private reload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="flex min-h-full items-center justify-center bg-usnee-bg px-5 py-10">
        <div className="w-full max-w-md rounded-card border border-usnee-border bg-usnee-surface p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-usnee-danger/12">
            <AlertCircle className="h-6 w-6 text-usnee-danger" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-title-md">Что-то сломалось на экране</h1>
          <p className="mt-2 text-body-sm text-usnee-text2">
            Сами записи целы — они лежат на этом устройстве, а не в интернете. Перезагрузка обычно возвращает всё на место.
          </p>
          <button
            type="button"
            onClick={this.reload}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-usnee-brand px-4 text-body-sm font-bold text-white transition-transform active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-usnee-focus"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Перезагрузить
          </button>
          {this.state.message && (
            <p className="mt-3 break-words text-[11px] text-usnee-text3">Технически: {this.state.message}</p>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;