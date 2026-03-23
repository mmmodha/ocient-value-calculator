import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import type { AppState } from '../types';
import {
  computeYearlySnapshots,
  cumulativeTCO,
  personaAnalysis,
  formatCurrency,
  formatPercent,
  totalSLACost,
  staffingCostForYear,
  systemCostForYear,
  replacedSystemCostForYear,
  residualSystemCostForYear,
  computeActivityYearAnalysis,
  computeStaffSizing,
  computeHeadcountReduction,
  computeAsIsProjection,
  validateState,
} from '../utils/calculations';
import { CURRENCIES } from '../types';
import { ValidationPanel } from './ValidationPanel';

interface Props {
  state: AppState;
}

const COLORS = {
  blue: '#3b82f6',
  green: '#22c55e',
  red: '#ef4444',
  amber: '#f59e0b',
  purple: '#a855f7',
  teal: '#14b8a6',
  gray: '#6b7280',
};

function StatCard({
  label, value, sub, color = 'default', large = false,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: 'default' | 'green' | 'red' | 'blue' | 'amber';
  large?: boolean;
}) {
  const valueColor = {
    default: 'text-[#e6edf3]',
    green: 'text-[#22c55e]',
    red: 'text-[#ef4444]',
    blue: 'text-[#3b82f6]',
    amber: 'text-[#f59e0b]',
  }[color];

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
      <p className="text-xs text-[#8b949e] font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className={`font-bold ${large ? 'text-2xl' : 'text-xl'} ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-[#6e7681] mt-1">{sub}</p>}
    </div>
  );
}

const TOOLTIP_STYLE = {
  backgroundColor: '#161b22',
  border: '1px solid #21262d',
  borderRadius: '8px',
  color: '#e6edf3',
  fontSize: 12,
};

function fmt(value: number, sym: string) {
  return formatCurrency(value, sym, true);
}

export function OutputDashboard({ state }: Props) {
  const sym = CURRENCIES[state.currency].symbol;

  // Memoize all expensive calculations
  const snapshots = useMemo(() => computeYearlySnapshots(state), [state]);
  const analyses = useMemo(() => personaAnalysis(state), [state]);
  const activityAnalysis = useMemo(() => computeActivityYearAnalysis(state), [state]);
  const staffSizing = useMemo(() => computeStaffSizing(state), [state]);
  const headcountReduction = useMemo(() => computeHeadcountReduction(state), [state]);
  const asIsProjection = useMemo(() => computeAsIsProjection(state), [state]);
  const validationWarnings = useMemo(() => validateState(state), [state]);

  const tco3 = useMemo(() => cumulativeTCO(snapshots, 3), [snapshots]);
  const tco5 = useMemo(() => cumulativeTCO(snapshots, 5), [snapshots]);
  const yr1 = snapshots[0];

  const totalSavings3yr = tco3.current - tco3.withOcientActual;
  const totalSavings5yr = tco5.current - tco5.withOcientActual;

  // Payback period: find when cumulative savings exceed cumulative Ocient cost
  let paybackYear = 0;
  let cumSavings = 0;
  let cumOcient = 0;
  for (const s of snapshots) {
    cumSavings += s.staffSavingsActual + s.slaSavings;
    cumOcient += s.ocientCost;
    if (cumSavings >= cumOcient && paybackYear === 0) paybackYear = s.year;
  }

  // Memoize chart data transformations
  const costBreakdown = useMemo(() => [
    { name: 'Staffing', value: staffingCostForYear(state, 1), color: COLORS.blue },
    { name: 'System Costs', value: systemCostForYear(state, 1), color: COLORS.purple },
    { name: 'SLA Breaches', value: totalSLACost(state), color: COLORS.red },
  ].filter((d) => d.value > 0), [state]);

  const ycData = useMemo(() => snapshots.map((s) => ({
    year: `Y${s.year}`,
    'Current Cost': Math.round(s.totalCurrentCost),
    'With Ocient': Math.round(s.totalWithOcientActual),
    'Net Savings': Math.round(s.netSavingsActual),
  })), [snapshots]);

  const savingsData = useMemo(() => snapshots.map((s) => ({
    year: `Y${s.year}`,
    'Staff Savings': Math.round(s.staffSavingsActual),
    'SLA Savings': Math.round(s.slaSavings),
    'Systems Replaced': Math.round(s.systemReplaced),
    'Ocient Cost': Math.round(s.ocientCost),
    'Efficiency %': Math.round(s.efficiencyGain),
  })), [snapshots]);

  const cumulativeData = useMemo(() => {
    let cumCurrent = 0;
    let cumOcientLine = 0;
    return snapshots.map((s) => {
      cumCurrent += s.totalCurrentCost;
      cumOcientLine += s.totalWithOcientActual;
      return { year: `Y${s.year}`, Current: Math.round(cumCurrent), 'With Ocient': Math.round(cumOcientLine) };
    });
  }, [snapshots]);

  const activityData = useMemo(() => analyses.map((a) => ({
    name: a.staffTypeName,
    '% of Year': parseFloat((a.percentOfYear * 100).toFixed(1)),
    'FTE Equivalent': parseFloat(a.headcountForActivity.toFixed(1)),
    'Cost (K)': Math.round(a.costOfActivity / 1000),
  })), [analyses]);

  // As-Is projection data
  const asIsData = useMemo(() => asIsProjection.map((y) => ({
    year: `Y${y.year}`,
    Staffing: Math.round(y.staffingCost),
    'System Costs': Math.round(y.systemCost),
    'SLA Penalties': Math.round(y.slaCost),
  })), [asIsProjection]);

  const asIs5yr = useMemo(() => asIsProjection.reduce((s, y) => s + y.total, 0), [asIsProjection]);

  // Activity analysis chart data
  const activityChartData = useMemo(() => {
    const personas = [...new Set(activityAnalysis.map((a) => a.staffTypeName))];
    const chartData = [1, 2, 3, 4, 5].map((yr) => {
      const row: Record<string, number | string> = { year: `Y${yr}` };
      for (const p of personas) {
        const entry = activityAnalysis.find((a) => a.year === yr && a.staffTypeName === p);
        if (entry) {
          row[`${p} (Before)`] = Math.round(entry.activityCost);
          row[`${p} (After)`] = Math.round(entry.newActivityCost);
        }
      }
      return row;
    });

    const PERSONA_COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#14b8a6'];
    const barDefs: { key: string; color: string; opacity: number }[] = [];
    personas.forEach((p, i) => {
      barDefs.push({ key: `${p} (Before)`, color: PERSONA_COLORS[i % PERSONA_COLORS.length], opacity: 0.4 });
      barDefs.push({ key: `${p} (After)`, color: PERSONA_COLORS[i % PERSONA_COLORS.length], opacity: 1 });
    });

    return { chartData, barDefs, personas };
  }, [activityAnalysis]);

  // Activity table totals
  const activityTotals = useMemo(() => [1, 2, 3, 4, 5].map((yr) => {
    const entries = activityAnalysis.filter((a) => a.year === yr);
    return {
      before: entries.reduce((s, a) => s + a.activityCost, 0),
      after: entries.reduce((s, a) => s + a.newActivityCost, 0),
    };
  }), [activityAnalysis]);

  const activitySavings = useMemo(() => [1, 2, 3, 4, 5].map((yr) => {
    const entries = activityAnalysis.filter((a) => a.year === yr);
    return entries.reduce((s, a) => s + a.costSaving, 0);
  }), [activityAnalysis]);

  // Staff sizing chart data
  const staffSizingChartData = useMemo(() => {
    const personas = [...new Set(staffSizing.map((s) => s.staffTypeName))];
    const chartData = [1, 2, 3, 4, 5].map((yr) => {
      const row: Record<string, number | string> = { year: `Y${yr}` };
      for (const p of personas) {
        const entry = staffSizing.find((s) => s.year === yr && s.staffTypeName === p);
        if (entry) {
          row[`${p} FTE freed`] = parseFloat(entry.fteFreed.toFixed(2));
        }
      }
      return row;
    });

    const PERSONA_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#14b8a6'];

    return { chartData, personas, PERSONA_COLORS };
  }, [staffSizing]);

  // Headcount reduction chart data
  const headcountChartData = useMemo(() => {
    const roles = [...new Set(headcountReduction.map((r) => r.staffTypeName))];
    const chartData = [1, 2, 3, 4, 5].map((yr) => {
      const row: Record<string, number | string> = { year: `Y${yr}` };
      for (const role of roles) {
        const entry = headcountReduction.find((r) => r.year === yr && r.staffTypeName === role);
        if (entry) row[role] = entry.headcountReduction;
      }
      return row;
    });
    const ROLE_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#14b8a6'];

    return { chartData, roles, ROLE_COLORS };
  }, [headcountReduction]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e6edf3]">
            Value Analysis
          </h1>
          <p className="text-sm text-[#8b949e] mt-1">
            {state.customerName || 'Customer'} · Powered by Ocient
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#6e7681]">Currency</p>
          <p className="text-sm font-medium text-[#e6edf3]">{CURRENCIES[state.currency].name}</p>
        </div>
      </div>

      {/* Validation */}
      <ValidationPanel warnings={validationWarnings} />

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard
          label="Current Annual Cost (Y1)"
          value={fmt(yr1.totalCurrentCost, sym)}
          sub="Staffing + System + SLA"
          large
        />
        <StatCard
          label="With Ocient (Y1)"
          value={fmt(yr1.totalWithOcientActual, sym)}
          sub={`${formatPercent(yr1.efficiencyGain)} efficiency gain`}
          color="blue"
          large
        />
        <StatCard
          label="3-Year Net Savings"
          value={fmt(totalSavings3yr, sym)}
          sub={`vs ${fmt(tco3.current, sym)} current TCO`}
          color={totalSavings3yr > 0 ? 'green' : 'red'}
          large
        />
        <StatCard
          label="5-Year Net Savings"
          value={fmt(totalSavings5yr, sym)}
          sub={paybackYear > 0 ? `Payback: Year ${paybackYear}` : 'Payback within 5 yrs'}
          color={totalSavings5yr > 0 ? 'green' : 'amber'}
          large
        />
      </div>

      {/* Row 2: Cost breakdown + Persona analysis */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Cost Breakdown Pie */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[#e6edf3] mb-3">Current Cost Breakdown (Year 1)</h3>
          {costBreakdown.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie
                    data={costBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    stroke="none"
                  >
                    {costBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: any) => fmt(v as number, sym)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {costBreakdown.map((d) => {
                  const total = costBreakdown.reduce((s, x) => s + x.value, 0);
                  return (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                        <span className="text-[#8b949e]">{d.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-[#e6edf3] font-medium">{fmt(d.value, sym)}</div>
                        <div className="text-[#6e7681]">{((d.value / total) * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#6e7681] py-8 text-center">No active costs configured</p>
          )}
        </div>

        {/* Staffing activity */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[#e6edf3] mb-3">Use Case Activity by Persona</h3>
          {activityData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={activityData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8b949e' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#8b949e' }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="% of Year" fill={COLORS.blue} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="FTE Equivalent" fill={COLORS.amber} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1">
                {analyses.map((a) => (
                  <div key={a.staffTypeId} className="flex justify-between text-xs text-[#8b949e]">
                    <span>{a.staffTypeName}</span>
                    <span className="text-[#e6edf3]">{a.daysOnActivity.toFixed(0)} days/yr · {fmt(a.costOfActivity, sym)} activity cost</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-[#6e7681] py-8 text-center">Configure use cases in the input panel</p>
          )}
        </div>
      </div>

      {/* Year-over-year cost comparison */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-[#e6edf3] mb-3">Annual Cost: Current vs Ocient</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={ycData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#8b949e' }} />
            <YAxis tick={{ fontSize: 11, fill: '#8b949e' }} tickFormatter={(v) => fmt(v, sym)} width={75} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => fmt(v as number, sym)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Current Cost" fill={COLORS.red} radius={[3, 3, 0, 0]} opacity={0.8} />
            <Bar dataKey="With Ocient" fill={COLORS.blue} radius={[3, 3, 0, 0]} />
            <Bar dataKey="Net Savings" fill={COLORS.green} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative TCO */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-[#e6edf3] mb-1">Cumulative TCO Comparison</h3>
        <p className="text-xs text-[#6e7681] mb-3">Total cost of ownership over 5 years</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={cumulativeData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#8b949e' }} />
            <YAxis tick={{ fontSize: 11, fill: '#8b949e' }} tickFormatter={(v) => fmt(v, sym)} width={75} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => fmt(v as number, sym)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="Current" stroke={COLORS.red} strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="With Ocient" stroke={COLORS.blue} strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 5-Year As-Is Cost of Inaction */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#21262d] flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-[#e6edf3]">5-Year Cost of Inaction — Without Ocient</h3>
            <p className="text-xs text-[#6e7681] mt-0.5">Projected growth in costs if nothing changes — salary inflation and system cost increases compound year-on-year</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-[#8b949e]">5-Year Total</p>
            <p className="text-lg font-bold text-red-400">{fmt(asIs5yr, sym)}</p>
          </div>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={asIsData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#8b949e' }} />
              <YAxis tick={{ fontSize: 11, fill: '#8b949e' }} tickFormatter={(v) => fmt(v, sym)} width={75} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => fmt(v as number, sym)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Staffing" stackId="a" fill={COLORS.blue} opacity={0.85} />
              <Bar dataKey="System Costs" stackId="a" fill={COLORS.purple} opacity={0.85} />
              <Bar dataKey="SLA Penalties" stackId="a" fill={COLORS.red} radius={[3, 3, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="overflow-x-auto border-t border-[#21262d]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#21262d] bg-[#0d1117]">
                <th className="text-left px-4 py-2 text-[#8b949e] font-medium">Year</th>
                <th className="text-right px-3 py-2 text-[#8b949e] font-medium">Staffing</th>
                <th className="text-right px-3 py-2 text-[#8b949e] font-medium">Systems</th>
                <th className="text-right px-3 py-2 text-[#8b949e] font-medium">SLA</th>
                <th className="text-right px-3 py-2 text-[#8b949e] font-medium">Total</th>
                <th className="text-right px-3 py-2 text-[#8b949e] font-medium">Growth vs Y1</th>
              </tr>
            </thead>
            <tbody>
              {asIsProjection.map((y) => (
                <tr key={y.year} className="border-b border-[#21262d]/50 hover:bg-[#1c2128]">
                  <td className="px-4 py-2 text-[#e6edf3] font-medium">Year {y.year}</td>
                  <td className="text-right px-3 py-2 text-[#e6edf3]">{fmt(y.staffingCost, sym)}</td>
                  <td className="text-right px-3 py-2 text-[#e6edf3]">{fmt(y.systemCost, sym)}</td>
                  <td className="text-right px-3 py-2 text-red-400">{fmt(y.slaCost, sym)}</td>
                  <td className="text-right px-3 py-2 text-[#e6edf3] font-semibold">{fmt(y.total, sym)}</td>
                  <td className={`text-right px-3 py-2 font-medium ${y.growthVsY1 > 0 ? 'text-red-400' : 'text-[#8b949e]'}`}>
                    {y.growthVsY1 > 0 ? '+' : ''}{y.growthVsY1.toFixed(1)}%
                  </td>
                </tr>
              ))}
              <tr className="bg-[#0d1117] font-semibold border-t border-[#21262d]">
                <td className="px-4 py-2 text-[#e6edf3]">5-Year Total</td>
                <td className="text-right px-3 py-2 text-[#e6edf3]">{fmt(asIsProjection.reduce((s, y) => s + y.staffingCost, 0), sym)}</td>
                <td className="text-right px-3 py-2 text-[#e6edf3]">{fmt(asIsProjection.reduce((s, y) => s + y.systemCost, 0), sym)}</td>
                <td className="text-right px-3 py-2 text-red-400">{fmt(asIsProjection.reduce((s, y) => s + y.slaCost, 0), sym)}</td>
                <td className="text-right px-3 py-2 text-red-400 text-sm">{fmt(asIs5yr, sym)}</td>
                <td className="px-3 py-2"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Savings breakdown + Efficiency */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[#e6edf3] mb-3">Savings Breakdown by Year</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={savingsData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#8b949e' }} />
              <YAxis tick={{ fontSize: 10, fill: '#8b949e' }} tickFormatter={(v) => fmt(v, sym)} width={70} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any, name: any) => name === 'Efficiency %' ? `${v}%` : fmt(v as number, sym)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Staff Savings" stackId="s" fill={COLORS.green} radius={[0, 0, 0, 0]} />
              <Bar dataKey="SLA Savings" stackId="s" fill={COLORS.teal} radius={[0, 0, 0, 0]} />
              <Bar dataKey="Systems Replaced" stackId="s" fill={COLORS.purple} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Ocient Cost" fill={COLORS.blue} radius={[3, 3, 0, 0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Efficiency curve */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
          <h3 className="text-sm font-semibold text-[#e6edf3] mb-3">Efficiency Improvement Curve</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={savingsData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#8b949e' }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#8b949e' }} width={45} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => `${v as number}%`} />
              <Line
                type="monotone"
                dataKey="Efficiency %"
                stroke={COLORS.amber}
                strokeWidth={2.5}
                dot={{ r: 5, fill: COLORS.amber }}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-[#6e7681] mt-2 text-center">Diminishing returns on efficiency gains over time</p>
        </div>
      </div>

      {/* Detailed year table */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#21262d]">
          <h3 className="text-sm font-semibold text-[#e6edf3]">Detailed Year-by-Year Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#21262d]">
                <th className="text-left px-4 py-2 text-[#8b949e] font-medium">Metric</th>
                {snapshots.map((s) => (
                  <th key={s.year} className="text-right px-3 py-2 text-[#8b949e] font-medium">Year {s.year}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Staffing Cost', key: 'staffingCost' as const, color: '' },
                { label: 'System Cost', key: 'systemCost' as const, color: '' },
                { label: 'SLA Breach Cost', key: 'slaCost' as const, color: 'text-red-400' },
                { label: 'Total Current Cost', key: 'totalCurrentCost' as const, color: 'font-bold' },
                { label: 'Staff Savings (actual)', key: 'staffSavingsActual' as const, color: 'text-green-400' },
                { label: 'SLA Savings', key: 'slaSavings' as const, color: 'text-teal-400' },
                { label: 'System Costs Replaced', key: 'systemReplaced' as const, color: 'text-green-400' },
                { label: 'Ocient Cost', key: 'ocientCost' as const, color: 'text-blue-400' },
                { label: 'Total With Ocient', key: 'totalWithOcientActual' as const, color: 'font-bold text-blue-400' },
                { label: 'Net Savings', key: 'netSavingsActual' as const, color: 'font-bold text-green-400' },
              ].map(({ label, key, color }) => (
                <tr key={key} className="border-b border-[#21262d]/50 hover:bg-[#1c2128]">
                  <td className="px-4 py-2 text-[#8b949e]">{label}</td>
                  {snapshots.map((s) => (
                    <td key={s.year} className={`text-right px-3 py-2 ${color || 'text-[#e6edf3]'}`}>
                      {fmt(s[key], sym)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-b border-[#21262d]/50 hover:bg-[#1c2128] bg-[#0d1117]">
                <td className="px-4 py-2 text-[#8b949e]">Efficiency Gain</td>
                {snapshots.map((s) => (
                  <td key={s.year} className="text-right px-3 py-2 text-amber-400">
                    {formatPercent(s.efficiencyGain, 0)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Cost Before vs After Ocient — Year on Year */}
      {activityAnalysis.length > 0 && (
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#21262d]">
            <h3 className="text-sm font-semibold text-[#e6edf3]">Activity Cost: Before vs After Ocient — Year on Year</h3>
            <p className="text-xs text-[#6e7681] mt-0.5">Salary-weighted cost of use-case activity per persona, showing the impact of Ocient's efficiency improvement each year</p>
          </div>

          {/* Chart: grouped by persona across years */}
          <div className="p-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={activityChartData.chartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#8b949e' }} />
                <YAxis tick={{ fontSize: 11, fill: '#8b949e' }} tickFormatter={(v) => fmt(v, sym)} width={75} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => fmt(v as number, sym)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {activityChartData.barDefs.map((b) => (
                  <Bar key={b.key} dataKey={b.key} fill={b.color} opacity={b.opacity} radius={[2, 2, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-[#6e7681] mt-1 text-center">Faded = before Ocient · Solid = after Ocient</p>
          </div>

          {/* Detail table */}
          <div className="overflow-x-auto border-t border-[#21262d]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#21262d] bg-[#161b22]">
                  <th className="text-left px-4 py-2 text-[#8b949e] font-medium">Persona</th>
                  {[1, 2, 3, 4, 5].map((yr) => (
                    <th key={yr} className="text-center px-3 py-2 text-[#8b949e] font-medium" colSpan={2}>Year {yr} <span className="text-[#6e7681] font-normal">({activityAnalysis.find((a) => a.year === yr)?.efficiencyGain.toFixed(0) ?? 0}% eff.)</span></th>
                  ))}
                </tr>
                <tr className="border-b border-[#21262d] bg-[#0d1117]">
                  <th className="px-4 py-1.5 text-[#6e7681]"></th>
                  {[1, 2, 3, 4, 5].map((yr) => (
                    <>
                      <th key={`${yr}-b`} className="text-right px-2 py-1.5 text-[#6e7681] font-normal">Before</th>
                      <th key={`${yr}-a`} className="text-right px-2 py-1.5 text-[#6e7681] font-normal border-r border-[#21262d]">After</th>
                    </>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...new Set(activityAnalysis.map((a) => a.staffTypeName))].map((personaName) => {
                  const rows = [1, 2, 3, 4, 5].map((yr) => activityAnalysis.find((a) => a.year === yr && a.staffTypeName === personaName));
                  return (
                    <tr key={personaName} className="border-b border-[#21262d]/50 hover:bg-[#1c2128]">
                      <td className="px-4 py-2 text-[#8b949e] font-medium">{personaName}</td>
                      {rows.map((entry, i) => entry ? (
                        <>
                          <td key={`${i}-b`} className="text-right px-2 py-2 text-[#e6edf3]">{fmt(entry.activityCost, sym)}</td>
                          <td key={`${i}-a`} className="text-right px-2 py-2 text-green-400 border-r border-[#21262d]">{fmt(entry.newActivityCost, sym)}</td>
                        </>
                      ) : <><td key={`${i}-b`} className="px-2">—</td><td key={`${i}-a`} className="px-2 border-r border-[#21262d]">—</td></>)}
                    </tr>
                  );
                })}
                {/* Total row */}
                <tr className="border-b border-[#21262d] bg-[#161b22] font-semibold">
                  <td className="px-4 py-2 text-[#e6edf3]">Total</td>
                  {activityTotals.map((t, i) => (
                    <>
                      <td key={`${i}-b`} className="text-right px-2 py-2 text-[#e6edf3]">{fmt(t.before, sym)}</td>
                      <td key={`${i}-a`} className="text-right px-2 py-2 text-green-400 border-r border-[#21262d]">{fmt(t.after, sym)}</td>
                    </>
                  ))}
                </tr>
                {/* Saving row */}
                <tr className="hover:bg-[#1c2128]">
                  <td className="px-4 py-2 text-[#8b949e]">Saving</td>
                  {activitySavings.map((s, i) => (
                    <>
                      <td key={`${i}-b`} className="px-2"></td>
                      <td key={`${i}-a`} className={`text-right px-2 py-2 font-medium border-r border-[#21262d] ${s > 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(s, sym)}</td>
                    </>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Optimal Staff Sizing */}
      {staffSizing.length > 0 && (
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#21262d]">
            <h3 className="text-sm font-semibold text-[#e6edf3]">Optimal Staff Sizing — Maintaining Activity with Less Waste</h3>
            <p className="text-xs text-[#6e7681] mt-0.5">With Ocient's faster query performance, how many staff are actually needed to handle the same number of requests?</p>
          </div>

          {/* FTE freed chart */}
          <div className="p-4">
            <p className="text-xs text-[#8b949e] mb-2">FTE equivalent freed from use-case activity per year (same output, less time required)</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={staffSizingChartData.chartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#8b949e' }} />
                <YAxis tick={{ fontSize: 11, fill: '#8b949e' }} tickFormatter={(v) => `${v} FTE`} width={65} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => `${(v as number).toFixed(2)} FTE`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {staffSizingChartData.personas.map((p, i) => (
                  <Bar key={p} dataKey={`${p} FTE freed`} fill={staffSizingChartData.PERSONA_COLORS[i % staffSizingChartData.PERSONA_COLORS.length]} radius={[3, 3, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detail table */}
          <div className="overflow-x-auto border-t border-[#21262d]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#21262d] bg-[#0d1117]">
                  <th className="text-left px-4 py-2 text-[#8b949e] font-medium w-36">Persona</th>
                  <th className="text-left px-3 py-2 text-[#8b949e] font-medium">Metric</th>
                  {[1, 2, 3, 4, 5].map((yr) => (
                    <th key={yr} className="text-right px-3 py-2 text-[#8b949e] font-medium">Year {yr}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...new Set(staffSizing.map((s) => s.staffTypeName))].flatMap((personaName) => {
                  const byYear = [1, 2, 3, 4, 5].map((yr) => staffSizing.find((s) => s.year === yr && s.staffTypeName === personaName));
                  const currentCount = byYear[0]?.currentCount ?? 0;

                  return [
                    // Current headcount (constant)
                    <tr key={`${personaName}-current`} className="border-b border-[#21262d]/30 hover:bg-[#1c2128]">
                      <td className="px-4 py-2 text-[#e6edf3] font-semibold" rowSpan={5}>{personaName}</td>
                      <td className="px-3 py-2 text-[#8b949e]">Current headcount</td>
                      {byYear.map((_entry, i) => (
                        <td key={i} className="text-right px-3 py-2 text-[#e6edf3]">{currentCount}</td>
                      ))}
                    </tr>,
                    <tr key={`${personaName}-fte-before`} className="border-b border-[#21262d]/30 hover:bg-[#1c2128]">
                      <td className="px-3 py-2 text-[#8b949e]">FTE dedicated to activity</td>
                      {byYear.map((entry, i) => (
                        <td key={i} className="text-right px-3 py-2 text-[#e6edf3]">{entry ? entry.fteForActivity.toFixed(2) : '—'}</td>
                      ))}
                    </tr>,
                    <tr key={`${personaName}-fte-after`} className="border-b border-[#21262d]/30 hover:bg-[#1c2128]">
                      <td className="px-3 py-2 text-[#8b949e]">FTE needed with Ocient</td>
                      {byYear.map((entry, i) => (
                        <td key={i} className="text-right px-3 py-2 text-blue-400">{entry ? entry.fteForActivityWithOcient.toFixed(2) : '—'}</td>
                      ))}
                    </tr>,
                    <tr key={`${personaName}-freed`} className="border-b border-[#21262d]/30 hover:bg-[#1c2128]">
                      <td className="px-3 py-2 text-[#8b949e]">FTE freed</td>
                      {byYear.map((entry, i) => (
                        <td key={i} className="text-right px-3 py-2 text-green-400 font-medium">{entry ? `+${entry.fteFreed.toFixed(2)}` : '—'}</td>
                      ))}
                    </tr>,
                    <tr key={`${personaName}-optimal`} className="border-b border-[#21262d] hover:bg-[#1c2128] bg-[#0d1117]">
                      <td className="px-3 py-2 text-amber-400 font-semibold">Optimal headcount</td>
                      {byYear.map((entry, i) => (
                        <td key={i} className="text-right px-3 py-2 text-amber-400 font-bold">
                          {entry ? (
                            <>
                              {entry.optimalHeadcount}
                              {entry.headcountCanReduce > 0 && (
                                <span className="text-green-400 ml-1">(↓{entry.headcountCanReduce})</span>
                              )}
                            </>
                          ) : '—'}
                        </td>
                      ))}
                    </tr>,
                  ];
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 bg-[#0d1117] border-t border-[#21262d]">
            <p className="text-xs text-[#6e7681]">
              <span className="text-amber-400 font-medium">Optimal headcount</span> = staff needed to handle {state.requestsPerYear} requests/year at the Ocient-improved cycle time, while maintaining the same non-activity workload.
              &nbsp;<span className="text-green-400">(↓N)</span> = whole FTEs that could be redeployed or reduced. Fractional FTE savings represent capacity headroom within the existing team.
            </p>
          </div>
        </div>
      )}

      {/* Headcount Reduction — whole people freed by Ocient efficiency */}
      {headcountReduction.length > 0 && (
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#21262d]">
            <h3 className="text-sm font-semibold text-[#e6edf3]">Headcount Reduction — People Freed by Ocient</h3>
            <p className="text-xs text-[#6e7681] mt-0.5">
              Based on each role's query-dependent work fraction × efficiency gain. Shows actual whole people who could be redeployed or not backfilled.
            </p>
          </div>

          {/* Headcount reduction bar chart */}
          <div className="p-4">
            <p className="text-xs text-[#8b949e] mb-2">Whole headcount positions freed per role per year (floor of fractional FTEs)</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={headcountChartData.chartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#8b949e' }} />
                <YAxis tick={{ fontSize: 11, fill: '#8b949e' }} tickFormatter={(v) => `${v} people`} width={75} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => `${v} people`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {headcountChartData.roles.map((role, i) => (
                  <Bar key={role} dataKey={role} stackId="a" fill={headcountChartData.ROLE_COLORS[i % headcountChartData.ROLE_COLORS.length]} radius={i === headcountChartData.roles.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detail table */}
          <div className="overflow-x-auto border-t border-[#21262d]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#21262d] bg-[#0d1117]">
                  <th className="text-left px-4 py-2 text-[#8b949e] font-medium">Role</th>
                  <th className="text-left px-3 py-2 text-[#8b949e] font-medium">Metric</th>
                  {[1, 2, 3, 4, 5].map((yr) => (
                    <th key={yr} className="text-right px-3 py-2 text-[#8b949e] font-medium">Year {yr}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...new Set(headcountReduction.map((r) => r.staffTypeName))].flatMap((roleName) => {
                  const byYear = [1, 2, 3, 4, 5].map((yr) => headcountReduction.find((r) => r.year === yr && r.staffTypeName === roleName));
                  const entry0 = byYear[0];
                  if (!entry0) return [];

                  return [
                    <tr key={`${roleName}-current`} className="border-b border-[#21262d]/30 hover:bg-[#1c2128]">
                      <td className="px-4 py-2 text-[#e6edf3] font-semibold" rowSpan={5}>{roleName}
                        <div className="text-[#6e7681] font-normal mt-0.5">{(entry0.queryDependentPct * 100).toFixed(0)}% query-dependent</div>
                      </td>
                      <td className="px-3 py-2 text-[#8b949e]">Current headcount</td>
                      {byYear.map((e, i) => <td key={i} className="text-right px-3 py-2 text-[#e6edf3]">{e?.currentCount ?? '—'}</td>)}
                    </tr>,
                    <tr key={`${roleName}-eff`} className="border-b border-[#21262d]/30 hover:bg-[#1c2128]">
                      <td className="px-3 py-2 text-[#8b949e]">Efficiency gain</td>
                      {byYear.map((e, i) => <td key={i} className="text-right px-3 py-2 text-amber-400">{e ? `${e.efficiencyGain.toFixed(0)}%` : '—'}</td>)}
                    </tr>,
                    <tr key={`${roleName}-fte`} className="border-b border-[#21262d]/30 hover:bg-[#1c2128]">
                      <td className="px-3 py-2 text-[#8b949e]">Fractional FTE freed</td>
                      {byYear.map((e, i) => <td key={i} className="text-right px-3 py-2 text-[#e6edf3]">{e ? e.fteFreed.toFixed(2) : '—'}</td>)}
                    </tr>,
                    <tr key={`${roleName}-headcount`} className="border-b border-[#21262d]/30 hover:bg-[#1c2128] bg-green-950/20">
                      <td className="px-3 py-2 text-green-400 font-semibold">People freed (whole)</td>
                      {byYear.map((e, i) => (
                        <td key={i} className={`text-right px-3 py-2 font-bold ${(e?.headcountReduction ?? 0) > 0 ? 'text-green-400' : 'text-[#6e7681]'}`}>
                          {e ? (e.headcountReduction > 0 ? `↓${e.headcountReduction}` : '0') : '—'}
                        </td>
                      ))}
                    </tr>,
                    <tr key={`${roleName}-saving`} className="border-b border-[#21262d] hover:bg-[#1c2128]">
                      <td className="px-3 py-2 text-[#8b949e]">Annual cost saving</td>
                      {byYear.map((e, i) => (
                        <td key={i} className={`text-right px-3 py-2 font-medium ${(e?.saving ?? 0) > 0 ? 'text-green-400' : 'text-[#6e7681]'}`}>
                          {e ? fmt(e.saving, sym) : '—'}
                        </td>
                      ))}
                    </tr>,
                  ];
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 bg-[#0d1117] border-t border-[#21262d]">
            <p className="text-xs text-[#6e7681]">
              <span className="text-green-400 font-medium">People freed</span> = whole headcount positions released (floor of fractional FTEs).
              These are roles that don&apos;t need to be backfilled as attrition occurs, or that can be redeployed to higher-value work.
              Fractional FTE gains represent capacity headroom within the remaining team.
            </p>
          </div>
        </div>
      )}

      {/* CapEx / OpEx — before vs after Ocient */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#21262d]">
          <h3 className="text-sm font-semibold text-[#e6edf3]">CapEx / OpEx — Without vs With Ocient (Year 1)</h3>
          <p className="text-xs text-[#6e7681] mt-0.5">
            Staff savings apply to the query-dependent fraction of each role · System costs marked "Replaced" drop from the Ocient scenario
          </p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-[#21262d]">
          {/* WITHOUT */}
          <div className="p-4 space-y-3">
            <p className="text-xs font-semibold text-[#8b949e] uppercase tracking-wide">Without Ocient</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#8b949e]">Staffing</span>
                <span className="text-[#e6edf3]">{fmt(staffingCostForYear(state, 1), sym)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8b949e]">Infrastructure &amp; Systems</span>
                <span className="text-[#e6edf3]">{fmt(systemCostForYear(state, 1), sym)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8b949e]">SLA Penalties</span>
                <span className="text-red-400">{fmt(totalSLACost(state), sym)}</span>
              </div>
              <div className="flex justify-between border-t border-[#21262d] pt-2 font-semibold text-sm">
                <span className="text-[#e6edf3]">Total</span>
                <span className="text-[#e6edf3]">{fmt(yr1.totalCurrentCost, sym)}</span>
              </div>
            </div>
          </div>
          {/* WITH OCIENT */}
          <div className="p-4 space-y-3">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide">With Ocient</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#8b949e]">Staffing (after {yr1.efficiencyGain.toFixed(0)}% efficiency)</span>
                <span className="text-[#e6edf3]">{fmt(yr1.staffingCost - yr1.staffSavings, sym)}</span>
              </div>
              {replacedSystemCostForYear(state, 1) > 0 && (
                <div className="flex justify-between">
                  <span className="text-green-400">Systems replaced by Ocient</span>
                  <span className="text-green-400">-{fmt(replacedSystemCostForYear(state, 1), sym)}</span>
                </div>
              )}
              {residualSystemCostForYear(state, 1) > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#8b949e]">Remaining system costs</span>
                  <span className="text-[#e6edf3]">{fmt(residualSystemCostForYear(state, 1), sym)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#8b949e]">SLA Penalties (reduced)</span>
                <span className="text-[#e6edf3]">{fmt(yr1.slaCost - yr1.slaSavings, sym)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-400">Ocient Investment</span>
                <span className="text-blue-400">{fmt(yr1.ocientCost, sym)}</span>
              </div>
              <div className={`flex justify-between border-t border-[#21262d] pt-2 font-semibold text-sm`}>
                <span className="text-[#e6edf3]">Total</span>
                <span className="text-blue-400">{fmt(yr1.totalWithOcientActual, sym)}</span>
              </div>
            </div>
            <div className={`flex justify-between text-sm font-bold pt-1 border-t border-[#21262d] ${yr1.netSavingsActual >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              <span>Net {yr1.netSavingsActual >= 0 ? 'Saving' : 'Additional Cost'} Y1</span>
              <span>{yr1.netSavingsActual >= 0 ? '+' : ''}{fmt(yr1.netSavingsActual, sym)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
