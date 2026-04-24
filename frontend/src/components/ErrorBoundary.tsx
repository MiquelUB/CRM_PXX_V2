import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 text-center bg-white dark:bg-slate-950 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
          <div className="max-w-md space-y-6">
            <div className="mx-auto w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center animate-bounce">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Problema Tècnic Detectat</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Aquest component ha tingut un error inesperat (possiblement per una dessincronització de dades). 
                L'arquitectura V2 ha protegit la resta de l'aplicació.
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg"
            >
              <RefreshCcw size={18} />
              Recarregar Aplicació
            </button>
            {import.meta.env.DEV && (
              <pre className="mt-4 p-4 bg-slate-100 dark:bg-slate-900 text-left text-[10px] text-rose-500 overflow-auto rounded-lg max-h-40 font-mono">
                {this.state.error?.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
