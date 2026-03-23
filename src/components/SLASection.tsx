import { useMemo } from 'react';
import type { AppState, SLABreach } from '../types';
import { Section } from './Section';
import { FieldRow, NumericInput } from './FieldRow';
import { slaBreachCost, totalSLACost } from '../utils/calculations';
import { CURRENCIES } from '../types';

interface Props {
  state: AppState;
  update: (patch: Partial<AppState>) => void;
}

function updateBreach(breaches: SLABreach[], id: string, patch: Partial<SLABreach>): SLABreach[] {
  return breaches.map((b) => (b.id === id ? { ...b, ...patch } : b));
}

export function SLASection({ state, update }: Props) {
  const sym = CURRENCIES[state.currency].symbol;
  const total = useMemo(() => totalSLACost(state), [state.slaBreaches]);

  return (
    <Section title="SLA Breaches" badge={total > 0 ? `${sym}${(total / 1000).toFixed(0)}K/yr` : 'No breaches'} defaultOpen={false}>
      <div className="space-y-3">
        {state.slaBreaches.map((breach) => {
          const { hoursNotMet, cost } = slaBreachCost(breach);
          return (
            <div
              key={breach.id}
              className={`border rounded-lg p-3 space-y-2 ${breach.active ? 'border-[#21262d]' : 'border-[#21262d]/50 opacity-50'}`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={breach.active}
                  onChange={(e) => update({ slaBreaches: updateBreach(state.slaBreaches, breach.id, { active: e.target.checked }) })}
                />
                <input
                  type="text"
                  value={breach.title}
                  onChange={(e) => update({ slaBreaches: updateBreach(state.slaBreaches, breach.id, { title: e.target.value }) })}
                  className="flex-1 text-sm font-medium text-[#e6edf3]"
                  style={{ background: 'transparent', border: 'none', outline: 'none', padding: 0 }}
                />
                <button
                  onClick={() => update({ slaBreaches: state.slaBreaches.filter((b) => b.id !== breach.id) })}
                  className="text-[#6e7681] hover:text-red-400 text-xs"
                >✕</button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => update({ slaBreaches: updateBreach(state.slaBreaches, breach.id, { type: 'hourly' }) })}
                  className={`text-xs px-2 py-1 rounded ${breach.type === 'hourly' ? 'bg-[#3b82f6] text-white' : 'bg-[#21262d] text-[#8b949e]'}`}
                >Per Hour</button>
                <button
                  onClick={() => update({ slaBreaches: updateBreach(state.slaBreaches, breach.id, { type: 'incident' }) })}
                  className={`text-xs px-2 py-1 rounded ${breach.type === 'incident' ? 'bg-[#3b82f6] text-white' : 'bg-[#21262d] text-[#8b949e]'}`}
                >Per Incident</button>
              </div>

              {breach.type === 'hourly' ? (
                <>
                  <FieldRow label={`Penalty Per Hour (${sym})`}>
                    <NumericInput
                      value={breach.penaltyPerHour}
                      onChange={(v) => update({ slaBreaches: updateBreach(state.slaBreaches, breach.id, { penaltyPerHour: v }) })}
                      step={100}
                      prefix={sym}
                    />
                  </FieldRow>
                  <FieldRow label="Uptime Expected (%)">
                    <NumericInput
                      value={parseFloat((breach.uptimeExpected * 100).toFixed(7))}
                      onChange={(v) => update({ slaBreaches: updateBreach(state.slaBreaches, breach.id, { uptimeExpected: Math.min(1, v / 100) }) })}
                      step={0.001}
                      min={0}
                      suffix="%"
                    />
                  </FieldRow>
                  <FieldRow label="Uptime Observed (%)">
                    <NumericInput
                      value={parseFloat((breach.uptimeObserved * 100).toFixed(4))}
                      onChange={(v) => update({ slaBreaches: updateBreach(state.slaBreaches, breach.id, { uptimeObserved: Math.min(1, v / 100) }) })}
                      step={0.01}
                      min={0}
                      suffix="%"
                    />
                  </FieldRow>
                  <div className="text-xs text-[#8b949e] pt-1 border-t border-[#21262d]">
                    Hours not met: {hoursNotMet.toFixed(2)} hrs/yr
                    &nbsp;·&nbsp;
                    <span className="text-red-400">Cost: {sym}{cost.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</span>
                  </div>
                </>
              ) : (
                <>
                  <FieldRow label={`Penalty Per Incident (${sym})`}>
                    <NumericInput
                      value={breach.penaltyPerIncident}
                      onChange={(v) => update({ slaBreaches: updateBreach(state.slaBreaches, breach.id, { penaltyPerIncident: v }) })}
                      step={1000}
                      prefix={sym}
                    />
                  </FieldRow>
                  <FieldRow label="Number of Incidents">
                    <NumericInput
                      value={breach.numberOfIncidents}
                      onChange={(v) => update({ slaBreaches: updateBreach(state.slaBreaches, breach.id, { numberOfIncidents: Math.round(v) }) })}
                    />
                  </FieldRow>
                  <div className="text-xs text-red-400 pt-1 border-t border-[#21262d]">
                    Cost: {sym}{cost.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                  </div>
                </>
              )}
            </div>
          );
        })}

        <button
          onClick={() => update({
            slaBreaches: [
              ...state.slaBreaches,
              {
                id: `sla_${Date.now()}`,
                active: true,
                title: 'New SLA',
                type: 'incident',
                penaltyPerHour: 0,
                uptimeExpected: 0.9999,
                uptimeObserved: 0.999,
                penaltyPerIncident: 10000,
                numberOfIncidents: 1,
              },
            ],
          })}
          className="w-full py-2 text-xs text-[#3b82f6] border border-dashed border-[#21262d] rounded-md hover:border-[#3b82f6] hover:bg-[#3b82f6]/5 transition-colors"
        >
          + Add SLA Breach
        </button>
      </div>
    </Section>
  );
}
