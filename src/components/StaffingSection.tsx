import type { AppState, StaffType } from '../types';
import { Section } from './Section';
import { FieldRow, NumericInput } from './FieldRow';
import { hourlyRate } from '../utils/calculations';
import { CURRENCIES } from '../types';

interface Props {
  state: AppState;
  update: (patch: Partial<AppState>) => void;
}

function updateStaff(staffTypes: StaffType[], id: string, patch: Partial<StaffType>): StaffType[] {
  return staffTypes.map((s) => (s.id === id ? { ...s, ...patch } : s));
}

function addStaff(staffTypes: StaffType[]): StaffType[] {
  const id = `staff_${Date.now()}`;
  return [
    ...staffTypes,
    { id, active: true, name: 'New Role', salary: 60000, count: 1, yoyIncrease: 0.02, queryDependentPct: 0.7 },
  ];
}

export function StaffingSection({ state, update }: Props) {
  const sym = CURRENCIES[state.currency].symbol;
  const totalCost = state.staffTypes
    .filter((s) => s.active)
    .reduce((sum, s) => sum + s.count * s.salary, 0);

  return (
    <Section title="Staffing" badge={`${sym}${(totalCost / 1000).toFixed(0)}K/yr`}>
      <div className="space-y-4">
        {state.staffTypes.map((staff) => (
          <StaffCard
            key={staff.id}
            staff={staff}
            state={state}
            sym={sym}
            onChange={(patch) => update({ staffTypes: updateStaff(state.staffTypes, staff.id, patch) })}
            onRemove={() => update({ staffTypes: state.staffTypes.filter((s) => s.id !== staff.id) })}
            canRemove={state.staffTypes.length > 1}
          />
        ))}
        <button
          onClick={() => update({ staffTypes: addStaff(state.staffTypes) })}
          className="w-full py-2 text-xs text-[#3b82f6] border border-dashed border-[#21262d] rounded-md hover:border-[#3b82f6] hover:bg-[#3b82f6]/5 transition-colors"
        >
          + Add Staff Type
        </button>
      </div>
    </Section>
  );
}

function StaffCard({
  staff, state, sym, onChange, onRemove, canRemove,
}: {
  staff: StaffType;
  state: AppState;
  sym: string;
  onChange: (p: Partial<StaffType>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const rate = hourlyRate(staff.salary, state);
  const totalCost = staff.active ? staff.count * staff.salary : 0;

  return (
    <div className={`border rounded-lg p-3 space-y-2 transition-colors ${staff.active ? 'border-[#21262d]' : 'border-[#21262d]/50 opacity-50'}`}>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={staff.active}
          onChange={(e) => onChange({ active: e.target.checked })}
        />
        <input
          type="text"
          value={staff.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-[#e6edf3] p-0"
          style={{ border: 'none', background: 'transparent', padding: 0 }}
        />
        {canRemove && (
          <button
            onClick={onRemove}
            className="text-[#6e7681] hover:text-red-400 text-xs p-1 rounded"
          >
            ✕
          </button>
        )}
      </div>

      <FieldRow label={`Avg Salary (${sym})`}>
        <NumericInput
          value={staff.salary}
          onChange={(v) => onChange({ salary: v })}
          step={1000}
          prefix={sym}
        />
      </FieldRow>
      <FieldRow label="Headcount">
        <NumericInput value={staff.count} onChange={(v) => onChange({ count: Math.round(v) })} />
      </FieldRow>
      <FieldRow label="YoY Salary Increase">
        <NumericInput
          value={Math.round(staff.yoyIncrease * 100)}
          onChange={(v) => onChange({ yoyIncrease: v / 100 })}
          step={1}
          min={0}
          suffix="%"
        />
      </FieldRow>
      <FieldRow label="Query-dependent work" hint="% of this role's work that Ocient makes faster">
        <NumericInput
          value={Math.round((staff.queryDependentPct ?? 1) * 100)}
          onChange={(v) => onChange({ queryDependentPct: Math.min(100, Math.max(0, v)) / 100 })}
          step={5}
          min={0}
          suffix="%"
        />
      </FieldRow>

      <div className="flex justify-between pt-1 border-t border-[#21262d] text-xs text-[#8b949e]">
        <span>Hourly rate: {sym}{rate.toFixed(2)}</span>
        <span className="text-[#e6edf3] font-medium">
          Total: {sym}{(totalCost / 1000).toFixed(0)}K
        </span>
      </div>
    </div>
  );
}
