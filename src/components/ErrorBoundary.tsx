import React, { ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetState = () => {
    try {
      localStorage.clear();
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 select-none font-sans">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold tracking-tight text-zinc-100">
                AetherMap Tabletop
              </h2>
              <p className="text-xs text-zinc-400">
                Произошла неожиданная ошибка в отображении рабочего стола.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-left overflow-x-auto max-h-32 text-[11px] font-mono text-zinc-400">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Перезагрузить</span>
              </button>
              <button
                onClick={this.handleResetState}
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl text-xs transition-all border border-zinc-700 active:scale-95"
              >
                Сбросить кэш
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
