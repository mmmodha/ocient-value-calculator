import type {
  AppState, YearlySnapshot, PersonaAnalysis, SLABreach,
  ValidationWarning, ActivityYearAnalysis, StaffSizingYear, HeadcountReduction,
} from '../types';

const HOURS_IN_YEAR = 8760;

// ─── Base cost helpers ────────────────────────────────────────────────────────

export function workingHoursPerYear(state: AppState): number {
  return state.workingDaysPerYear * state.workingHoursPerDay;
}

export function hourlyRate(salary: number, state: AppState): number {
  const h = workingHoursPerYear(state);
  return h > 0 ? salary / h : 0;
}

export function staffingCostForYear(state: AppState, year: number): number {
  return state.staffTypes.reduce((sum, s) => 
    s.active ? sum + s.count * s.salary * Math.pow(1 + s.yoyIncrease, year - 1) : sum, 0);
}

export function systemCostForYear(state: AppState, year: number): number {
  return state.systemCosts.reduce((sum, c) => 
    c.active ? sum + c.cost * Math.pow(1 + c.yoyIncrease, year - 1) : sum, 0);
}

export function totalSLACost(state: AppState): number {
  return state.slaBreaches.filter((b) => b.active).reduce((sum, b) => {
    if (b.type === 'hourly') {
      const hoursNotMet = Math.max(0, (b.uptimeExpected - b.uptimeObserved) * HOURS_IN_YEAR);
      return sum + hoursNotMet * b.penaltyPerHour;
    }
    return sum + b.numberOfIncidents * b.penaltyPerIncident;
  }, 0);
}

export function slaBreachCost(b: SLABreach): { hoursNotMet: number; cost: number } {
  if (b.type === 'hourly') {
    const hoursNotMet = Math.max(0, (b.uptimeExpected - b.uptimeObserved) * HOURS_IN_YEAR);
    return { hoursNotMet, cost: hoursNotMet * b.penaltyPerHour };
  }
  return { hoursNotMet: 0, cost: b.numberOfIncidents * b.penaltyPerIncident };
}

// ─── Use-case / persona analysis ──────────────────────────────────────────────
//
// Cycle time (CT) is the total elapsed activity time for the role per request,
// shared equally among staffPerRequest people.
// → Per-person minutes per request = CT / staffPerRequest
// → Per-person days per year       = CT × requests / staffPerRequest / 60 / hoursPerDay
// This matches the CSV sense-check formula (DE: 300×150/3/60/8 = 31.25 days, 12%).

export function personaAnalysis(state: AppState): PersonaAnalysis[] {
  return state.personaUseCases
    .map((uc) => {
      const staff = state.staffTypes.find((s) => s.id === uc.staffTypeId);
      if (!staff) return null;
      const sp = uc.staffPerRequest || 1;
      // Per-person days on this activity per year
      const daysPerPerson = (uc.cycleTimeMinutes * state.requestsPerYear) / sp / 60 / state.workingHoursPerDay;
      const percentOfYear = state.workingDaysPerYear > 0 ? daysPerPerson / state.workingDaysPerYear : 0;
      // FTE equivalent = fraction of each person's time × headcount
      const headcountForActivity = percentOfYear * staff.count;
      return {
        staffTypeId: staff.id,
        staffTypeName: staff.name,
        daysOnActivity: daysPerPerson,      // per-person days (matches CSV sense-check)
        percentOfYear,                       // per-person utilisation fraction
        costOfActivity: headcountForActivity * staff.salary,
        headcountForActivity,                // FTE equivalent dedicated to this activity
      } as PersonaAnalysis;
    })
    .filter(Boolean) as PersonaAnalysis[];
}

// ─── Efficiency gain by year ───────────────────────────────────────────────────

export function efficiencyGainForYear(state: AppState, year: number): number {
  const e = state.efficiency;
  const gains: Record<number, number> = {
    1: e.year1, 2: e.year2, 3: e.year3, 4: e.year4, 5: e.year5,
  };
  return (gains[year] ?? e.year5) / 100;
}

// System costs that remain after Ocient (costs not replaced by Ocient)
export function residualSystemCostForYear(state: AppState, year: number): number {
  return state.systemCosts.reduce((sum, c) => 
    c.active && !c.replacedByOcient ? sum + c.cost * Math.pow(1 + c.yoyIncrease, year - 1) : sum, 0);
}

// System costs that are replaced by Ocient (removed from "with Ocient" scenario)
export function replacedSystemCostForYear(state: AppState, year: number): number {
  return state.systemCosts.reduce((sum, c) => 
    c.active && c.replacedByOcient ? sum + c.cost * Math.pow(1 + c.yoyIncrease, year - 1) : sum, 0);
}

// ─── Ocient cost per year ─────────────────────────────────────────────────────

export function ocientCostForYear(state: AppState, year: number): number {
  const { year1, year2, year3, year4, year5 } = state.ocientPricing;
  const map: Record<number, number> = { 1: year1, 2: year2, 3: year3, 4: year4, 5: year5 };
  return map[year] ?? year5;
}

// ─── Full year-by-year snapshot ───────────────────────────────────────────────

export function computeYearlySnapshots(state: AppState): YearlySnapshot[] {
  // Track actual headcount by role ID across years (carries forward reductions)
  const actualHeadcountByRole: Record<string, number> = {};

  return [1, 2, 3, 4, 5].map((year) => {
    const gain = efficiencyGainForYear(state, year);
    const staffingCost = staffingCostForYear(state, year);
    const systemCost = systemCostForYear(state, year);
    const slaCost = totalSLACost(state);
    const totalCurrentCost = staffingCost + systemCost + slaCost;
    const ocientCost = ocientCostForYear(state, year);

    // Calculate per-role recommended (optimal) and actual headcount + costs
    let recommendedStaffCost = 0;
    let actualStaffCost = 0;

    for (const staff of state.staffTypes.filter((s) => s.active)) {
      const salaryYr = staff.salary * Math.pow(1 + staff.yoyIncrease, year - 1);

      // Get starting headcount for this year (carried forward from previous year or original)
      const startingCount = actualHeadcountByRole[staff.id] ?? staff.count;

      // Recommended: reduce headcount based on freed FTEs from efficiency
      const qd = staff.queryDependentPct ?? 1;
      const fteFreed = startingCount * qd * gain;
      const headcountReduction = Math.floor(fteFreed);
      const recommendedCount = Math.max(1, startingCount - headcountReduction);
      const costRecommended = recommendedCount * salaryYr;
      recommendedStaffCost += costRecommended;

      // Actual: check if user has overridden the headcount decision
      const userDecision = state.staffReductionDecisions?.[staff.id]?.[year];
      let actualCount: number;
      if (userDecision !== undefined && userDecision !== null) {
        // User has specified a headcount override
        actualCount = Math.max(1, Math.round(userDecision));
      } else {
        // Use recommended (optimal) by default
        actualCount = recommendedCount;
      }
      actualStaffCost += actualCount * salaryYr;

      // Carry forward this headcount to next year
      actualHeadcountByRole[staff.id] = actualCount;
    }

    const staffSavingsPotential = staffingCost - recommendedStaffCost;
    const staffSavingsActual = staffingCost - actualStaffCost;
    const staffSavingsUsed = actualStaffCost - recommendedStaffCost;

    const slaSavings = slaCost * gain;
    const systemReplaced = replacedSystemCostForYear(state, year);
    const residualSystemCost = residualSystemCostForYear(state, year);

    // Calculate totals for both scenarios
    const totalWithOcientRecommended = recommendedStaffCost + residualSystemCost + (slaCost - slaSavings) + ocientCost;
    const totalWithOcientActual = actualStaffCost + residualSystemCost + (slaCost - slaSavings) + ocientCost;

    const netSavingsRecommended = totalCurrentCost - totalWithOcientRecommended;
    const netSavingsActual = totalCurrentCost - totalWithOcientActual;

    const roiRecommended = ocientCost > 0 ? (netSavingsRecommended / ocientCost) * 100 : 0;
    const roiActual = ocientCost > 0 ? (netSavingsActual / ocientCost) * 100 : 0;

    return {
      year,
      staffingCost,
      systemCost,
      slaCost,
      totalCurrentCost,
      ocientCost,
      recommendedStaffCost,
      actualStaffCost,
      staffSavingsPotential,
      staffSavingsActual,
      staffSavingsUsed,
      slaSavings,
      systemReplaced,
      totalWithOcientRecommended,
      totalWithOcientActual,
      netSavingsRecommended,
      netSavingsActual,
      efficiencyGain: gain * 100,
      roiRecommended,
      roiActual,
    };
  });
}

export function cumulativeTCO(snapshots: YearlySnapshot[], years: number) {
  return snapshots.slice(0, years).reduce(
    (acc, s) => ({
      current: acc.current + s.totalCurrentCost,
      withOcientRecommended: acc.withOcientRecommended + s.totalWithOcientRecommended,
      withOcientActual: acc.withOcientActual + s.totalWithOcientActual,
    }),
    { current: 0, withOcientRecommended: 0, withOcientActual: 0 },
  );
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function formatCurrency(value: number, currencySymbol: string, compact = false): string {
  const abs = Math.abs(value);
  const neg = value < 0 ? '-' : '';
  if (compact) {
    if (abs >= 1_000_000) return `${neg}${currencySymbol}${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${neg}${currencySymbol}${(abs / 1_000).toFixed(0)}K`;
  }
  return `${neg}${currencySymbol}${abs.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateState(state: AppState): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const analyses = personaAnalysis(state);
  const workingHours = state.workingDaysPerYear * state.workingHoursPerDay;

  // Work environment
  if (state.workingDaysPerYear > 260) {
    warnings.push({ severity: 'warning', category: 'Work Environment', message: `Working days (${state.workingDaysPerYear}) is high — typical maximum is 260. Check your input.` });
  }
  if (state.workingDaysPerYear <= 0) {
    warnings.push({ severity: 'error', category: 'Work Environment', message: 'Working days per year must be greater than 0.' });
  }
  if (state.workingHoursPerDay > 12) {
    warnings.push({ severity: 'warning', category: 'Work Environment', message: `Working hours per day (${state.workingHoursPerDay}) is unusually high.` });
  }

  // Staffing
  for (const s of state.staffTypes.filter((s) => s.active)) {
    if (s.salary === 0) {
      warnings.push({ severity: 'warning', category: 'Staffing', message: `${s.name}: salary is £0 — this will understate cost impact.` });
    }
    if (s.count === 0) {
      warnings.push({ severity: 'warning', category: 'Staffing', message: `${s.name}: headcount is 0 — role has no cost or capacity impact.` });
    }
    if (s.yoyIncrease > 0.15) {
      warnings.push({ severity: 'warning', category: 'Staffing', message: `${s.name}: YoY salary increase of ${(s.yoyIncrease * 100).toFixed(0)}% is unusually high. Typical range is 2–5%.` });
    }
  }

  // SLA breaches
  for (const b of state.slaBreaches.filter((b) => b.active)) {
    if (b.type === 'hourly') {
      if (b.uptimeObserved > b.uptimeExpected) {
        warnings.push({ severity: 'info', category: 'SLA', message: `"${b.title}": observed uptime (${(b.uptimeObserved * 100).toFixed(4)}%) exceeds expected (${(b.uptimeExpected * 100).toFixed(7)}%) — no breach cost will be calculated.` });
      }
      if (b.uptimeExpected > 1) {
        warnings.push({ severity: 'error', category: 'SLA', message: `"${b.title}": uptime expected cannot exceed 100%.` });
      }
      if (b.penaltyPerHour === 0) {
        warnings.push({ severity: 'info', category: 'SLA', message: `"${b.title}": penalty per hour is 0 — breach has no financial impact.` });
      }
    }
    if (b.type === 'incident' && b.numberOfIncidents === 0) {
      warnings.push({ severity: 'info', category: 'SLA', message: `"${b.title}": 0 incidents — no breach cost will be calculated.` });
    }
  }

  // Use cases — all checks use per-person values (analysis.daysOnActivity is per-person)
  for (const uc of state.personaUseCases) {
    const staff = state.staffTypes.find((s) => s.id === uc.staffTypeId);
    const analysis = analyses.find((a) => a.staffTypeId === uc.staffTypeId);
    if (!staff || !analysis) continue;

    if (uc.cycleTimeMinutes > uc.leadTimeMinutes && uc.leadTimeMinutes > 0) {
      warnings.push({ severity: 'warning', category: 'Use Case', message: `${staff.name}: cycle time (${uc.cycleTimeMinutes} min) exceeds lead time (${uc.leadTimeMinutes} min). Cycle time should be a subset of lead time.` });
    }
    if (uc.cycleTimeMinutes === 0) {
      warnings.push({ severity: 'info', category: 'Use Case', message: `${staff.name}: cycle time is 0 — no activity cost or capacity analysis possible.` });
    }
    if (uc.staffPerRequest === 0) {
      warnings.push({ severity: 'warning', category: 'Use Case', message: `${staff.name}: staff per request is 0 — no capacity will be consumed.` });
    }

    // Per-person utilisation checks (analysis.daysOnActivity is already per-person)
    const daysPerPerson = analysis.daysOnActivity;
    const pct = analysis.percentOfYear;

    if (daysPerPerson > state.workingDaysPerYear) {
      // Each individual would need more time than exists — genuinely understaffed
      const minStaff = Math.ceil(
        (uc.cycleTimeMinutes * state.requestsPerYear) / uc.staffPerRequest / 60 / state.workingHoursPerDay / state.workingDaysPerYear * staff.count
      );
      warnings.push({
        severity: 'error', category: 'Use Case',
        message: `${staff.name}: each person needs ${daysPerPerson.toFixed(0)} days/yr on this activity but only ${state.workingDaysPerYear} working days exist. Need at least ${minStaff} headcount to be feasible.`,
      });
    } else if (pct > 0.85) {
      warnings.push({
        severity: 'warning', category: 'Use Case',
        message: `${staff.name}: each person spends ${(pct * 100).toFixed(0)}% of their working year on this activity — very little capacity remains for other work.`,
      });
    } else if (pct > 0.5) {
      warnings.push({
        severity: 'info', category: 'Use Case',
        message: `${staff.name}: each person spends ${(pct * 100).toFixed(0)}% of their working year on this activity. Monitor to ensure headcount covers other responsibilities.`,
      });
    }
  }

  if (state.requestsPerYear === 0) {
    warnings.push({ severity: 'info', category: 'Use Case', message: 'Requests per year is 0 — use case analysis will produce no results.' });
  }

  // Efficiency checks
  const eff = state.efficiency;
  const effYears: [number, number, string][] = [
    [eff.year1, eff.year2, 'Y1→Y2'],
    [eff.year2, eff.year3, 'Y2→Y3'],
    [eff.year3, eff.year4, 'Y3→Y4'],
    [eff.year4, eff.year5, 'Y4→Y5'],
  ];
  for (const [prev, next, label] of effYears) {
    if (next > prev) {
      warnings.push({ severity: 'warning', category: 'Efficiency', message: `Efficiency gain increases from ${label} (${prev}% → ${next}%). Diminishing returns should decrease year-on-year.` });
    }
  }
  if (eff.year1 > 70) {
    warnings.push({ severity: 'warning', category: 'Efficiency', message: `Year 1 efficiency gain of ${eff.year1}% is very aggressive. Most transformations achieve 20–50% in Year 1.` });
  }

  // Ocient pricing sense-check
  const { ocientPricing: op } = state;
  if (op.year2 > op.year1 * 1.2) {
    warnings.push({ severity: 'info', category: 'Ocient Pricing', message: 'Year 2 Ocient cost is more than 20% higher than Year 1 — verify contract terms.' });
  }

  // Overall sanity: if no active staff, nothing to calculate
  const activeStaff = state.staffTypes.filter((s) => s.active);
  if (activeStaff.length === 0) {
    warnings.push({ severity: 'error', category: 'Staffing', message: 'No active staff types — enable at least one to generate a value analysis.' });
  }

  // Per-role capacity check: does this role have enough hours to cover all requests?
  // Uses per-person hours (CT / staffPerRequest per request) vs available hours per person.
  if (workingHours > 0) {
    for (const uc of state.personaUseCases) {
      const staff = state.staffTypes.find((s) => s.id === uc.staffTypeId);
      if (!staff || !staff.active || staff.count === 0 || uc.cycleTimeMinutes === 0) continue;
      const sp = uc.staffPerRequest || 1;
      const perPersonHoursNeeded = (uc.cycleTimeMinutes * state.requestsPerYear) / sp / 60;
      if (perPersonHoursNeeded > workingHours) {
        const minCount = Math.ceil(perPersonHoursNeeded / workingHours);
        warnings.push({
          severity: 'error', category: 'Capacity',
          message: `${staff.name}: each person needs ${perPersonHoursNeeded.toFixed(0)}h/yr for this activity but only ${workingHours}h are available. Need at least ${minCount} staff (currently ${staff.count}).`,
        });
      }
    }
  }

  return warnings;
}

// ─── Activity cost before/after Ocient, per year ──────────────────────────────

export function computeActivityYearAnalysis(state: AppState): ActivityYearAnalysis[] {
  const results: ActivityYearAnalysis[] = [];

  for (const year of [1, 2, 3, 4, 5]) {
    const gain = efficiencyGainForYear(state, year);

    for (const uc of state.personaUseCases) {
      const staff = state.staffTypes.find((s) => s.id === uc.staffTypeId);
      if (!staff) continue;

      const salaryYr = staff.salary * Math.pow(1 + staff.yoyIncrease, year - 1);
      const wdpy = state.workingDaysPerYear;
      const hpd = state.workingHoursPerDay;

      const sp = uc.staffPerRequest || 1;

      // Before Ocient — per-person days (CT shared across staffPerRequest people)
      const daysOnActivity = (uc.cycleTimeMinutes * state.requestsPerYear) / sp / 60 / hpd;
      const percentOfYear = wdpy > 0 ? daysOnActivity / wdpy : 0;
      const fteRequired = percentOfYear * staff.count;
      const activityCost = fteRequired * salaryYr;

      // With Ocient
      const newCycleTimeMinutes = uc.cycleTimeMinutes * (1 - gain);
      const newDaysOnActivity = (newCycleTimeMinutes * state.requestsPerYear) / sp / 60 / hpd;
      const newPercentOfYear = wdpy > 0 ? newDaysOnActivity / wdpy : 0;
      const newFteRequired = newPercentOfYear * staff.count;
      const newActivityCost = newFteRequired * salaryYr;

      results.push({
        year,
        staffTypeId: staff.id,
        staffTypeName: staff.name,
        cycleTimeMinutes: uc.cycleTimeMinutes,
        daysOnActivity,
        percentOfYear,
        fteRequired,
        activityCost,
        newCycleTimeMinutes,
        newDaysOnActivity,
        newPercentOfYear,
        newFteRequired,
        newActivityCost,
        efficiencyGain: gain * 100,
        fteFreed: fteRequired - newFteRequired,
        costSaving: activityCost - newActivityCost,
      });
    }
  }

  return results;
}

// ─── Optimal staff sizing ─────────────────────────────────────────────────────

export function computeStaffSizing(state: AppState): StaffSizingYear[] {
  const results: StaffSizingYear[] = [];

  for (const year of [1, 2, 3, 4, 5]) {
    const gain = efficiencyGainForYear(state, year);

    for (const uc of state.personaUseCases) {
      const staff = state.staffTypes.find((s) => s.id === uc.staffTypeId);
      if (!staff || staff.count === 0) continue;

      const salaryYr = staff.salary * Math.pow(1 + staff.yoyIncrease, year - 1);
      const wdpy = state.workingDaysPerYear;
      const hpd = state.workingHoursPerDay;

      const sp = uc.staffPerRequest || 1;

      // Per-person days on this activity; FTE = fraction × headcount
      const daysPerPerson = (uc.cycleTimeMinutes * state.requestsPerYear) / sp / 60 / hpd;
      const percentOfYear = wdpy > 0 ? daysPerPerson / wdpy : 0;
      const fteForActivity = percentOfYear * staff.count;

      // With Ocient
      const newDaysPerPerson = daysPerPerson * (1 - gain);
      const newPercentOfYear = wdpy > 0 ? newDaysPerPerson / wdpy : 0;
      const fteForActivityWithOcient = newPercentOfYear * staff.count;

      const fteFreed = fteForActivity - fteForActivityWithOcient;
      const headcountCanReduce = Math.floor(fteFreed);
      const optimalHeadcount = Math.max(1, staff.count - headcountCanReduce);

      // Extra requests the same team could handle with freed capacity
      // Total team-minutes available = staffCount × wdpy × hpd × 60
      // Minutes per request (team total) = CT × (1-gain)  [staffPerRequest people each spend CT*(1-gain)/sp]
      const newCtMinutes = uc.cycleTimeMinutes * (1 - gain);
      const totalAvailablePersonMinutes = staff.count * wdpy * hpd * 60;
      // Each request consumes sp × (newCt/sp) = newCt team-minutes
      const capacityGainRequests = newCtMinutes > 0
        ? Math.floor(totalAvailablePersonMinutes / newCtMinutes) - state.requestsPerYear
        : 0;

      results.push({
        year,
        staffTypeId: staff.id,
        staffTypeName: staff.name,
        currentCount: staff.count,
        fteForActivity,
        fteForActivityWithOcient,
        fteFreed,
        headcountCanReduce,
        optimalHeadcount,
        capacityGainRequests: Math.max(0, capacityGainRequests),
        activityCostBefore: fteForActivity * salaryYr,
        activityCostAfter: fteForActivityWithOcient * salaryYr,
      });
    }
  }

  return results;
}

// ─── Headcount reduction from query-dependent efficiency (broader than use case) ─

export function computeHeadcountReduction(state: AppState): HeadcountReduction[] {
  const results: HeadcountReduction[] = [];
  for (const year of [1, 2, 3, 4, 5]) {
    const gain = efficiencyGainForYear(state, year);
    for (const staff of state.staffTypes.filter((s) => s.active && s.count > 0)) {
      const qd = staff.queryDependentPct ?? 1;
      const salaryYr = staff.salary * Math.pow(1 + staff.yoyIncrease, year - 1);
      const costBefore = staff.count * salaryYr;
      const fteFreed = staff.count * qd * gain;
      const headcountReduction = Math.floor(fteFreed);
      const optimalCount = staff.count - headcountReduction;
      const costAfter = optimalCount * salaryYr;
      results.push({
        year,
        staffTypeId: staff.id,
        staffTypeName: staff.name,
        currentCount: staff.count,
        queryDependentPct: qd,
        efficiencyGain: gain * 100,
        fteFreed,
        headcountReduction,
        optimalCount,
        costBefore,
        costAfter,
        saving: costBefore - costAfter,
      });
    }
  }
  return results;
}

// ─── 5-year as-is cost projection ────────────────────────────────────────────

export interface AsIsYear {
  year: number;
  staffingCost: number;
  systemCost: number;
  slaCost: number;
  total: number;
  growthVsY1: number; // % above Year 1
}

export function computeAsIsProjection(state: AppState): AsIsYear[] {
  const y1Total = staffingCostForYear(state, 1) + systemCostForYear(state, 1) + totalSLACost(state);
  return [1, 2, 3, 4, 5].map((year) => {
    const staffingCost = staffingCostForYear(state, year);
    const systemCost = systemCostForYear(state, year);
    const slaCost = totalSLACost(state);
    const total = staffingCost + systemCost + slaCost;
    return {
      year, staffingCost, systemCost, slaCost, total,
      growthVsY1: y1Total > 0 ? ((total - y1Total) / y1Total) * 100 : 0,
    };
  });
}
