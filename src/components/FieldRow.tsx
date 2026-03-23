import type { ReactNode } from 'react';

interface FieldRowProps {
  label: string;
  hint?: string;
  children: ReactNode;
  vertical?: boolean;
}

export function FieldRow({ label, hint, children, vertical = false }: FieldRowProps) {
  if (vertical) {
    return (
      <div className="space-y-1">
        <label className="block text-xs font-medium text-[#8b949e] uppercase tracking-wide">{label}</label>
        {hint && <p className="text-xs text-[#6e7681]">{hint}</p>}
        {children}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <span className="text-xs text-[#8b949e]">{label}</span>
        {hint && <p className="text-xs text-[#6e7681] mt-0.5">{hint}</p>}
      </div>
      <div className="w-32 shrink-0">{children}</div>
    </div>
  );
}

export function NumericInput({
  value,
  onChange,
  min = 0,
  step = 1,
  prefix,
  suffix,
  className = '',
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      {prefix && <span className="text-xs text-[#8b949e] shrink-0">{prefix}</span>}
      <input
        type="number"
        value={value}
        min={min}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={`flex-1 ${className}`}
        style={{ minWidth: 0 }}
      />
      {suffix && <span className="text-xs text-[#8b949e] shrink-0">{suffix}</span>}
    </div>
  );
}
