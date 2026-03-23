import type { AppState, PersonaUseCase } from '../types';
import { Section } from './Section';
import { FieldRow, NumericInput } from './FieldRow';
import { personaAnalysis } from '../utils/calculations';
import { CURRENCIES } from '../types';

interface Props {
  state: AppState;
  update: (patch: Partial<AppState>) => void;
}

function updateUseCase(useCases: PersonaUseCase[], staffTypeId: string, patch: Partial<PersonaUseCase>): PersonaUseCase[] {
  return useCases.map((uc) => (uc.staffTypeId === staffTypeId ? { ...uc, ...patch } : uc));
}

export function UseCaseSection({ state, update }: Props) {
  const sym = CURRENCIES[state.currency].symbol;
  const analyses = personaAnalysis(state);
  const totalActivityCost = analyses.reduce((sum, a) => sum + a.costOfActivity, 0);

  return (
    <Section title="Use Case Discovery" badge={`${state.requestsPerYear} requests/yr`} defaultOpen={false}>
      <div className="space-y-3">
        <FieldRow label="Requests Handled Per Year">
          <NumericInput
            value={state.requestsPerYear}
            onChange={(v) => update({ requestsPerYear: Math.round(v) })}
          />
        </FieldRow>

        {state.staffTypes.filter((s) => s.active).map((staff) => {
          const uc = state.personaUseCases.find((u) => u.staffTypeId === staff.id) ?? {
            staffTypeId: staff.id,
            leadTimeMinutes: 0,
            cycleTimeMinutes: 0,
            staffPerRequest: 1,
          };
          const analysis = analyses.find((a) => a.staffTypeId === staff.id);
          const hasUseCase = state.personaUseCases.some((u) => u.staffTypeId === staff.id);

          return (
            <div key={staff.id} className="border border-[#21262d] rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#3b82f6]">{staff.name}</span>
                {!hasUseCase && (
                  <button
                    onClick={() => update({ personaUseCases: [...state.personaUseCases, uc] })}
                    className="text-xs text-[#3b82f6] hover:underline"
                  >+ Add</button>
                )}
              </div>

              {hasUseCase ? (
                <>
                  <FieldRow label="Lead Time (mins/request)">
                    <NumericInput
                      value={uc.leadTimeMinutes}
                      onChange={(v) => update({ personaUseCases: updateUseCase(state.personaUseCases, staff.id, { leadTimeMinutes: v }) })}
                      step={30}
                    />
                  </FieldRow>
                  <FieldRow label="Cycle Time (mins/request)">
                    <NumericInput
                      value={uc.cycleTimeMinutes}
                      onChange={(v) => update({ personaUseCases: updateUseCase(state.personaUseCases, staff.id, { cycleTimeMinutes: v }) })}
                      step={15}
                    />
                  </FieldRow>
                  <FieldRow label="Staff Per Request">
                    <NumericInput
                      value={uc.staffPerRequest}
                      onChange={(v) => update({ personaUseCases: updateUseCase(state.personaUseCases, staff.id, { staffPerRequest: Math.round(v) }) })}
                    />
                  </FieldRow>

                  {analysis && (
                    <div className="bg-[#161b22] rounded p-2 space-y-1 text-xs">
                      <div className="flex justify-between text-[#8b949e]">
                        <span>Days/year on activity</span>
                        <span className="text-[#e6edf3]">{analysis.daysOnActivity.toFixed(1)} days</span>
                      </div>
                      <div className="flex justify-between text-[#8b949e]">
                        <span>% of working year</span>
                        <span className="text-[#e6edf3]">{(analysis.percentOfYear * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-[#8b949e]">
                        <span>Effective headcount</span>
                        <span className="text-[#e6edf3]">{analysis.headcountForActivity.toFixed(1)} FTE</span>
                      </div>
                      <div className="flex justify-between border-t border-[#21262d] pt-1">
                        <span className="text-[#8b949e]">Activity cost</span>
                        <span className="text-amber-400">{sym}{(analysis.costOfActivity / 1000).toFixed(0)}K</span>
                      </div>
                      {analysis.daysOnActivity > state.workingDaysPerYear && (
                        <div className="text-red-400 text-xs">⚠ Exceeds working days — consider adding headcount</div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => update({ personaUseCases: state.personaUseCases.filter((u) => u.staffTypeId !== staff.id) })}
                    className="text-xs text-[#6e7681] hover:text-red-400"
                  >Remove from use case</button>
                </>
              ) : (
                <p className="text-xs text-[#6e7681]">Not included in use case analysis</p>
              )}
            </div>
          );
        })}

        {analyses.length > 0 && (
          <div className="bg-[#161b22] rounded p-3 text-xs">
            <div className="flex justify-between font-medium">
              <span className="text-[#8b949e]">Total activity cost across all personas</span>
              <span className="text-amber-400">{sym}{(totalActivityCost / 1000).toFixed(0)}K</span>
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}
