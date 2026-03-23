import { useState, type ReactNode } from 'react';

interface SectionProps {
  title: string;
  badge?: string | number;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function Section({ title, badge, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-[#21262d] rounded-lg overflow-hidden mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#161b22] hover:bg-[#1c2128] text-left transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#e6edf3]">{title}</span>
          {badge !== undefined && (
            <span className="text-xs bg-[#21262d] text-[#8b949e] px-2 py-0.5 rounded-full">{badge}</span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-[#8b949e] transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="bg-[#0d1117] p-4 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}
