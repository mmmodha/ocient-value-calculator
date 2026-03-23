import type { AppState } from '../types';
import { Section } from './Section';
import { FieldRow, NumericInput } from './FieldRow';
import { CURRENCIES } from '../types';

interface Props {
  state: AppState;
  update: (patch: Partial<AppState>) => void;
}

export function OcientPricingSection({ state, update }: Props) {
  const sym = CURRENCIES[state.currency].symbol;
  const { ocientPricing: p } = state;

  const years = [
    { key: 'year1' as const, label: 'Year 1' },
    { key: 'year2' as const, label: 'Year 2' },
    { key: 'year3' as const, label: 'Year 3' },
    { key: 'year4' as const, label: 'Year 4' },
    { key: 'year5' as const, label: 'Year 5' },
  ];

  return (
    <Section title="Ocient Pricing" defaultOpen={false}>
      <div className="space-y-2">
        <p className="text-xs text-[#6e7681]">All-in annual cost for each contract year</p>
        {years.map(({ key, label }) => (
          <FieldRow key={key} label={label}>
            <NumericInput
              value={p[key]}
              onChange={(v) => update({ ocientPricing: { ...p, [key]: v } })}
              step={50000}
              prefix={sym}
            />
          </FieldRow>
        ))}
      </div>
    </Section>
  );
}
