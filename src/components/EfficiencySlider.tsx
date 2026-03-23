import type { AppState, EfficiencySettings } from '../types';
import { Section } from './Section';

interface Props {
  state: AppState;
  update: (patch: Partial<AppState>) => void;
}

const YEAR_LABELS = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'];
const KEYS: (keyof EfficiencySettings)[] = ['year1', 'year2', 'year3', 'year4', 'year5'];

const DIMINISHING_FACTORS = [1.0, 0.75, 0.55, 0.40, 0.30];

export function EfficiencySlider({ state, update }: Props) {
  const { efficiency } = state;

  function applyDiminishingReturns(baseYear1: number) {
    const newEff: EfficiencySettings = {
      year1: Math.round(baseYear1),
      year2: Math.round(baseYear1 * DIMINISHING_FACTORS[1]),
      year3: Math.round(baseYear1 * DIMINISHING_FACTORS[2]),
      year4: Math.round(baseYear1 * DIMINISHING_FACTORS[3]),
      year5: Math.round(baseYear1 * DIMINISHING_FACTORS[4]),
    };
    update({ efficiency: newEff });
  }

  return (
    <Section title="Efficiency Improvements (Ocient Impact)">
      <div className="space-y-4">
        <div className="bg-[#161b22] rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#e6edf3]">Year 1 Base Improvement</span>
            <span className="text-lg font-bold text-[#3b82f6]">{efficiency.year1}%</span>
          </div>
          <input
            type="range"
            min={5}
            max={80}
            step={5}
            value={efficiency.year1}
            onChange={(e) => applyDiminishingReturns(parseInt(e.target.value))}
            className="w-full h-2 rounded-full cursor-pointer"
          />
          <div className="flex justify-between text-xs text-[#6e7681]">
            <span>5% (minimal)</span>
            <span>80% (transformational)</span>
          </div>
          <p className="text-xs text-[#6e7681]">
            Drag to set Year 1 efficiency gain. Subsequent years auto-calculate with diminishing returns.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-[#8b949e] uppercase tracking-wide">Year-by-Year Gains (editable)</p>
          {KEYS.map((key, i) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-[#8b949e] w-12">{YEAR_LABELS[i]}</span>
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="range"
                    min={0}
                    max={80}
                    step={1}
                    value={efficiency[key]}
                    onChange={(e) => update({ efficiency: { ...efficiency, [key]: parseInt(e.target.value) } })}
                    className="w-full h-1.5 rounded-full cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex items-center gap-1 w-16">
                <input
                  type="number"
                  value={efficiency[key]}
                  min={0}
                  max={80}
                  onChange={(e) => update({ efficiency: { ...efficiency, [key]: parseInt(e.target.value) || 0 } })}
                  className="w-12 text-center text-sm"
                />
                <span className="text-xs text-[#6e7681]">%</span>
              </div>
              <div className="w-16">
                <div
                  className="h-4 rounded text-xs flex items-center justify-center text-white font-medium"
                  style={{
                    background: `hsl(${120 * efficiency[key] / 80}, 60%, 40%)`,
                    opacity: 0.8 + 0.2 * (efficiency[key] / 80),
                    minWidth: '40px',
                    width: `${Math.max(20, efficiency[key])}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#0d1117] border border-[#21262d] rounded p-3 text-xs text-[#6e7681]">
          <p className="font-medium text-[#8b949e] mb-1">How it works</p>
          <p>Efficiency % represents how much Ocient's faster query performance reduces cycle times for each persona. This translates to staff-time freed, headcount efficiency, and fewer SLA breaches each year.</p>
        </div>
      </div>
    </Section>
  );
}
