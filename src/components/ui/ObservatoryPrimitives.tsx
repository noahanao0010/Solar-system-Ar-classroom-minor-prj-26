import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface PageShellProps {
  children: ReactNode;
  maxWidth?: '5xl' | '7xl';
  className?: string;
}

export const PageShell: React.FC<PageShellProps> = ({
  children,
  maxWidth = '7xl',
  className = '',
}) => {
  const widthClass = maxWidth === '5xl' ? 'max-w-5xl' : 'max-w-7xl';
  return (
    <div
      className={`min-h-full pb-16 px-4 sm:px-6 lg:px-8 ${widthClass} mx-auto space-y-6 pt-6 ${className}`}
    >
      {children}
    </div>
  );
};

export interface SegmentedTabItem<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedTabsProps<T extends string> {
  items: SegmentedTabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  layoutId: string;
  accentClass?: string;
  className?: string;
  compact?: boolean;
}

export function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
  layoutId,
  accentClass = 'bg-sky-500/20 border border-sky-400/40 shadow-sm shadow-sky-500/15',
  className = '',
  compact = false,
}: SegmentedTabsProps<T>) {
  return (
    <div
      className={`inline-flex items-center gap-1 p-1 rounded-xl bg-slate-950/90 border border-slate-800/90 ${className}`}
      role="tablist"
    >
      {items.map(item => {
        const isActive = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.id)}
            className={`relative flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap ${
              compact ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-1.5 text-xs'
            } ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                className={`absolute inset-0 rounded-lg ${accentClass}`}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {item.icon}
              <span>{item.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export const ViewLoadingFallback: React.FC<{ label?: string }> = ({
  label = 'Calibrating Observatory...',
}) => (
  <div className="min-h-[calc(100vh-4rem)] w-full flex flex-col items-center justify-center p-6 text-center">
    <div className="relative w-14 h-14 mb-4 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border border-sky-400/50 animate-orbit-slow" />
      <div className="absolute inset-2 rounded-full border border-dashed border-indigo-400/60 animate-orbit-reverse" />
      <div className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.85)]" />
    </div>
    <p className="font-mono text-xs uppercase tracking-[0.2em] text-sky-300/90">{label}</p>
  </div>
);

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ObservatoryErrorBoundary extends Component<
  { children: ReactNode; onRecover?: () => void },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected rendering issue occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Observatory view boundary caught error:', error, info);
  }

  handleRecover = () => {
    this.setState({ hasError: false, errorMessage: '' });
    this.props.onRecover?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full glass-panel-elevated rounded-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-300 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                Observatory Module Interrupted
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {this.state.errorMessage}
              </p>
            </div>
            <button
              onClick={this.handleRecover}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reload Module</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
