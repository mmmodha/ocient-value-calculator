import { useReducer, useState } from 'react';
import type { AppState } from './types';
import { CURRENCIES } from './types';
import { defaultState } from './utils/defaultState';
import { Section } from './components/Section';
import { FieldRow, NumericInput } from './components/FieldRow';
import { StaffingSection } from './components/StaffingSection';
import { SystemCostsSection } from './components/SystemCostsSection';
import { SLASection } from './components/SLASection';
import { UseCaseSection } from './components/UseCaseSection';
import { OcientPricingSection } from './components/OcientPricingSection';
import { EfficiencySlider } from './components/EfficiencySlider';
import { OutputDashboard } from './components/OutputDashboard';
import { ValidationPanel } from './components/ValidationPanel';
import { validateState } from './utils/calculations';

function reducer(state: AppState, patch: Partial<AppState>): AppState {
  return { ...state, ...patch };
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, defaultState);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const warnings = validateState(state);
  const errorCount = warnings.filter((w) => w.severity === 'error').length;
  const warnCount = warnings.filter((w) => w.severity === 'warning').length;

  function update(patch: Partial<AppState>) {
    dispatch(patch);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0d1117]">
      {/* Sidebar */}
      <aside
        className={`flex-shrink-0 border-r border-[#21262d] overflow-y-auto transition-all duration-300`}
        style={{ width: sidebarOpen ? 380 : 0, minWidth: sidebarOpen ? 380 : 0, overflow: sidebarOpen ? 'auto' : 'hidden' }}
      >
        <div className="p-4" style={{ width: 380 }}>
          {/* Logo + Header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#21262d]">
            <div className="w-8 h-8 bg-[#3b82f6] rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#e6edf3]">Ocient Value Calculator</h1>
              <p className="text-xs text-[#6e7681]">Enterprise ROI Analysis</p>
            </div>
          </div>

          {/* Customer Info */}
          <Section title="Customer Info">
            <FieldRow label="Customer Name" vertical>
              <input
                type="text"
                value={state.customerName}
                onChange={(e) => update({ customerName: e.target.value })}
                placeholder="e.g. ACME Co"
              />
            </FieldRow>
            <FieldRow label="Account Director" vertical>
              <input
                type="text"
                value={state.accountDirector}
                onChange={(e) => update({ accountDirector: e.target.value })}
                placeholder="Name"
              />
            </FieldRow>
            <FieldRow label="Solutions Architect" vertical>
              <input
                type="text"
                value={state.solutionsArchitect}
                onChange={(e) => update({ solutionsArchitect: e.target.value })}
                placeholder="Name"
              />
            </FieldRow>
          </Section>

          {/* Work Environment */}
          <Section title="Work Environment" defaultOpen={false}>
            <FieldRow label="Currency" vertical>
              <select
                value={state.currency}
                onChange={(e) => update({ currency: e.target.value as AppState['currency'] })}
              >
                {Object.entries(CURRENCIES).map(([code, { name }]) => (
                  <option key={code} value={code}>{name} ({code})</option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="Working Days / Year">
              <NumericInput
                value={state.workingDaysPerYear}
                onChange={(v) => update({ workingDaysPerYear: Math.round(v) })}
                step={1}
              />
            </FieldRow>
            <FieldRow label="Working Hours / Day">
              <NumericInput
                value={state.workingHoursPerDay}
                onChange={(v) => update({ workingHoursPerDay: v })}
                step={0.5}
              />
            </FieldRow>
            <div className="bg-[#161b22] rounded p-2 text-xs text-[#8b949e]">
              Working hours/year: <span className="text-[#e6edf3] font-medium">{state.workingDaysPerYear * state.workingHoursPerDay}</span>
            </div>
          </Section>

          {/* Staffing */}
          <StaffingSection state={state} update={update} />

          {/* System Costs */}
          <SystemCostsSection state={state} update={update} />

          {/* SLA Breaches */}
          <SLASection state={state} update={update} />

          {/* Use Case */}
          <UseCaseSection state={state} update={update} />

          {/* Ocient Pricing */}
          <OcientPricingSection state={state} update={update} />

          {/* Efficiency */}
          <EfficiencySlider state={state} update={update} />

          {/* Validation summary in sidebar */}
          <div className="mt-2">
            <ValidationPanel warnings={warnings} />
          </div>

          {/* Reset */}
          <div className="mt-4 pt-4 border-t border-[#21262d]">
            <button
              onClick={() => dispatch(defaultState)}
              className="w-full py-2 text-xs text-[#6e7681] hover:text-[#e6edf3] border border-[#21262d] rounded-md hover:border-[#8b949e] transition-colors"
            >
              Reset to Sample Data
            </button>
          </div>
        </div>
      </aside>

      {/* Toggle sidebar button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute z-20 top-1/2 -translate-y-1/2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-r-lg p-1.5 transition-all"
        style={{ left: sidebarOpen ? 378 : 0 }}
      >
        <svg
          className={`w-4 h-4 text-[#8b949e] transition-transform ${sidebarOpen ? '' : 'rotate-180'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {!sidebarOpen && (errorCount > 0 || warnCount > 0) && (
          <span className={`absolute -top-1.5 -right-1.5 text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold ${errorCount > 0 ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'}`}>
            {errorCount || warnCount}
          </span>
        )}
      </button>

      {/* Main output */}
      <main className="flex-1 overflow-y-auto">
        <OutputDashboard state={state} />
      </main>
    </div>
  );
}
