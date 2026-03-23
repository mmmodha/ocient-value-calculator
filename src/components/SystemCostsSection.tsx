import type { AppState, SystemCost } from '../types';
import { Section } from './Section';
import { FieldRow, NumericInput } from './FieldRow';
import { CURRENCIES } from '../types';

interface Props {
  state: AppState;
  update: (patch: Partial<AppState>) => void;
}

function updateCost(costs: SystemCost[], id: string, patch: Partial<SystemCost>): SystemCost[] {
  return costs.map((c) => (c.id === id ? { ...c, ...patch } : c));
}

export function SystemCostsSection({ state, update }: Props) {
  const sym = CURRENCIES[state.currency].symbol;
  const totalActive = state.systemCosts.filter((c) => c.active).reduce((sum, c) => sum + c.cost, 0);
  const totalReplaced = state.systemCosts.filter((c) => c.active && c.replacedByOcient).reduce((sum, c) => sum + c.cost, 0);

  return (
    <Section
      title="Current System Costs"
      badge={totalActive > 0 ? `${sym}${(totalActive / 1000).toFixed(0)}K/yr` : 'None active'}
      defaultOpen={false}
    >
      <div className="space-y-2">
        {totalReplaced > 0 && (
          <div className="flex items-center justify-between text-xs px-2 py-1.5 bg-green-950/30 border border-green-800/30 rounded">
            <span className="text-green-400">Replaced by Ocient:</span>
            <span className="text-green-300 font-medium">{sym}{(totalReplaced / 1000).toFixed(0)}K/yr saved</span>
          </div>
        )}

        {state.systemCosts.map((cost) => (
          <div
            key={cost.id}
            className={`border rounded-lg p-3 space-y-2 transition-colors ${cost.active ? 'border-[#21262d]' : 'border-[#21262d]/50 opacity-50'}`}
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={cost.active}
                onChange={(e) => update({ systemCosts: updateCost(state.systemCosts, cost.id, { active: e.target.checked }) })}
              />
              <input
                type="text"
                value={cost.name}
                onChange={(e) => update({ systemCosts: updateCost(state.systemCosts, cost.id, { name: e.target.value }) })}
                className="flex-1 text-sm font-medium text-[#e6edf3]"
                style={{ background: 'transparent', border: 'none', outline: 'none', padding: 0 }}
              />
              {cost.active && cost.replacedByOcient && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-green-900/60 text-green-400 shrink-0">replaced</span>
              )}
            </div>
            {cost.active && (
              <div className="space-y-2">
                <FieldRow label={`Annual Cost (${sym})`}>
                  <NumericInput
                    value={cost.cost}
                    onChange={(v) => update({ systemCosts: updateCost(state.systemCosts, cost.id, { cost: v }) })}
                    step={10000}
                    prefix={sym}
                  />
                </FieldRow>
                <FieldRow label="YoY Cost Increase">
                  <NumericInput
                    value={Math.round(cost.yoyIncrease * 100)}
                    onChange={(v) => update({ systemCosts: updateCost(state.systemCosts, cost.id, { yoyIncrease: v / 100 }) })}
                    step={1}
                    min={0}
                    suffix="%"
                  />
                </FieldRow>
                <div className="flex items-center gap-2 pt-1 border-t border-[#21262d]">
                  <input
                    type="checkbox"
                    checked={cost.replacedByOcient}
                    onChange={(e) => update({ systemCosts: updateCost(state.systemCosts, cost.id, { replacedByOcient: e.target.checked }) })}
                  />
                  <label className="text-xs text-[#8b949e] cursor-pointer">
                    Replaced by Ocient
                    <span className="text-[#6e7681] ml-1">(removes this cost from the Ocient scenario)</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        ))}
        <button
          onClick={() => update({
            systemCosts: [
              ...state.systemCosts,
              { id: `cost_${Date.now()}`, active: true, name: 'Custom Cost', cost: 0, yoyIncrease: 0, replacedByOcient: false },
            ],
          })}
          className="w-full py-2 text-xs text-[#3b82f6] border border-dashed border-[#21262d] rounded-md hover:border-[#3b82f6] hover:bg-[#3b82f6]/5 transition-colors"
        >
          + Add Cost Item
        </button>
      </div>
    </Section>
  );
}
