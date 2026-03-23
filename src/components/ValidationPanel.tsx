import { useState } from 'react';
import type { ValidationWarning } from '../types';

interface Props {
  warnings: ValidationWarning[];
}

const SEVERITY_CONFIG = {
  error: { bg: 'bg-red-950/50', border: 'border-red-800/60', text: 'text-red-300', icon: '✕', badge: 'bg-red-800 text-red-100', label: 'Error' },
  warning: { bg: 'bg-amber-950/40', border: 'border-amber-800/50', text: 'text-amber-300', icon: '⚠', badge: 'bg-amber-800 text-amber-100', label: 'Warning' },
  info: { bg: 'bg-blue-950/30', border: 'border-blue-800/40', text: 'text-blue-300', icon: 'ℹ', badge: 'bg-blue-900 text-blue-200', label: 'Info' },
};

export function ValidationPanel({ warnings }: Props) {
  const [expanded, setExpanded] = useState(true);

  if (warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-950/30 border border-green-800/40 rounded-lg text-xs text-green-400">
        <span>✓</span>
        <span>All inputs look good — no issues detected.</span>
      </div>
    );
  }

  const errors = warnings.filter((w) => w.severity === 'error');
  const warnings_ = warnings.filter((w) => w.severity === 'warning');
  const infos = warnings.filter((w) => w.severity === 'info');

  return (
    <div className="border rounded-lg overflow-hidden border-[#30363d]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-[#161b22] hover:bg-[#1c2128] text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#e6edf3]">Validation Checks</span>
          <div className="flex gap-1">
            {errors.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-red-800 text-red-100">{errors.length} error{errors.length > 1 ? 's' : ''}</span>
            )}
            {warnings_.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-800 text-amber-100">{warnings_.length} warning{warnings_.length > 1 ? 's' : ''}</span>
            )}
            {infos.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-900 text-blue-200">{infos.length} info</span>
            )}
          </div>
        </div>
        <svg className={`w-4 h-4 text-[#8b949e] transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="bg-[#0d1117] p-3 space-y-2">
          {(['error', 'warning', 'info'] as const).map((severity) => {
            const items = warnings.filter((w) => w.severity === severity);
            if (items.length === 0) return null;
            const cfg = SEVERITY_CONFIG[severity];
            return items.map((w, i) => (
              <div key={`${severity}-${i}`} className={`flex gap-2 p-2 rounded border ${cfg.bg} ${cfg.border}`}>
                <span className={`flex-shrink-0 text-xs font-bold mt-0.5 ${cfg.text}`}>{cfg.icon}</span>
                <div className="min-w-0">
                  <span className={`text-xs font-semibold ${cfg.text} mr-1`}>{w.category}:</span>
                  <span className="text-xs text-[#8b949e]">{w.message}</span>
                </div>
              </div>
            ));
          })}
        </div>
      )}
    </div>
  );
}

// Compact inline variant for use inside input sections
export function InlineWarning({ message, severity = 'warning' }: { message: string; severity?: 'error' | 'warning' | 'info' }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <div className={`flex gap-1.5 items-start p-2 rounded text-xs border ${cfg.bg} ${cfg.border}`}>
      <span className={`flex-shrink-0 font-bold ${cfg.text}`}>{cfg.icon}</span>
      <span className={cfg.text}>{message}</span>
    </div>
  );
}
