export type CurrencyCode = 'GBP' | 'USD' | 'EUR' | 'AUD' | 'CAD' | 'JPY' | 'INR';

export const CURRENCIES: Record<CurrencyCode, { symbol: string; name: string }> = {
  GBP: { symbol: '£', name: 'UK Pound Sterling' },
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  AUD: { symbol: 'A$', name: 'Australian Dollar' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar' },
  JPY: { symbol: '¥', name: 'Japanese Yen' },
  INR: { symbol: '₹', name: 'Indian Rupee' },
};

export interface StaffType {
  id: string;
  active: boolean;
  name: string;
  salary: number;
  count: number;
  yoyIncrease: number; // decimal, e.g. 0.01 for 1%
  queryDependentPct: number; // 0–1: fraction of this role's work that benefits from Ocient's faster queries
}

export interface SystemCost {
  id: string;
  active: boolean;
  name: string;
  cost: number;
  yoyIncrease: number; // decimal
  replacedByOcient: boolean; // if true, cost is removed in the "with Ocient" scenario
}

export type SLABreachType = 'hourly' | 'incident';

export interface SLABreach {
  id: string;
  active: boolean;
  title: string;
  type: SLABreachType;
  // Hourly type
  penaltyPerHour: number;
  uptimeExpected: number; // decimal, e.g. 0.9999999 for 99.99999%
  uptimeObserved: number; // decimal
  // Incident type
  penaltyPerIncident: number;
  numberOfIncidents: number;
}

export interface PersonaUseCase {
  staffTypeId: string;
  leadTimeMinutes: number;
  cycleTimeMinutes: number;
  staffPerRequest: number;
}

export interface OcientPricing {
  year1: number;
  year2: number;
  year3: number;
  year4: number;
  year5: number;
}

export interface EfficiencySettings {
  year1: number; // % improvement, e.g. 40
  year2: number;
  year3: number;
  year4: number;
  year5: number;
}

// User's decision on whether to reduce headcount for a role in a given year
// null = use recommended (optimal), number = override with specific headcount
export type StaffReductionDecision = number | null;

export interface AppState {
  customerName: string;
  accountDirector: string;
  solutionsArchitect: string;
  currency: CurrencyCode;
  workingDaysPerYear: number;
  workingHoursPerDay: number;
  staffTypes: StaffType[];
  systemCosts: SystemCost[];
  slaBreaches: SLABreach[];
  requestsPerYear: number;
  personaUseCases: PersonaUseCase[];
  ocientPricing: OcientPricing;
  efficiency: EfficiencySettings;
  // Per-role, per-year headcount decisions: staffTypeId -> year -> decision
  staffReductionDecisions: Record<string, Record<number, StaffReductionDecision>>;
}

// Validation
export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationWarning {
  severity: ValidationSeverity;
  category: string;
  message: string;
}

// Per-persona, per-year activity analysis (before & after Ocient)
export interface ActivityYearAnalysis {
  year: number;
  staffTypeId: string;
  staffTypeName: string;
  // Before Ocient
  cycleTimeMinutes: number;
  daysOnActivity: number;
  percentOfYear: number;
  fteRequired: number;        // person-days / working-days
  activityCost: number;       // salary-weighted
  // With Ocient
  newCycleTimeMinutes: number;
  newDaysOnActivity: number;
  newPercentOfYear: number;
  newFteRequired: number;
  newActivityCost: number;
  // Delta
  efficiencyGain: number;     // %
  fteFreed: number;
  costSaving: number;
}

// Optimal staff sizing per persona per year
export interface StaffSizingYear {
  year: number;
  staffTypeId: string;
  staffTypeName: string;
  currentCount: number;
  fteForActivity: number;         // FTEs currently consumed by this use case
  fteForActivityWithOcient: number;
  fteFreed: number;
  headcountCanReduce: number;     // floor(fteFreed)
  optimalHeadcount: number;       // currentCount - headcountCanReduce
  capacityGainRequests: number;   // extra requests team could handle at same headcount
  activityCostBefore: number;
  activityCostAfter: number;
}

// Computed output types
export interface YearlySnapshot {
  year: number;
  staffingCost: number;          // Current staffing cost (no changes)
  systemCost: number;
  slaCost: number;
  totalCurrentCost: number;
  ocientCost: number;
  // Staff savings with two scenarios:
  recommendedStaffCost: number;    // Cost at optimal (recommended) headcount
  actualStaffCost: number;         // Cost at user-defined headcount (or recommended if not set)
  staffSavingsPotential: number;   // staffingCost - recommendedStaffCost (max possible)
  staffSavingsActual: number;      // staffingCost - actualStaffCost (what user chose)
  staffSavingsUsed: number;        // actualStaffCost - recommendedStaffCost (unused potential)
  slaSavings: number;
  systemReplaced: number;          // current system costs removed in Ocient scenario
  totalWithOcientRecommended: number; // Using recommended headcount
  totalWithOcientActual: number;      // Using actual/user-defined headcount
  netSavingsRecommended: number;      // Potential savings at optimal staffing
  netSavingsActual: number;           // Actual savings with user's staffing decisions
  efficiencyGain: number;             // % applied this year
  roiRecommended: number;             // %
  roiActual: number;                  // %
}

export interface PersonaAnalysis {
  staffTypeId: string;
  staffTypeName: string;
  daysOnActivity: number;
  percentOfYear: number;
  costOfActivity: number;
  headcountForActivity: number;
}

// Headcount reduction per role per year from broader query-dependent efficiency gains
export interface HeadcountReduction {
  year: number;
  staffTypeId: string;
  staffTypeName: string;
  currentCount: number;
  queryDependentPct: number;
  efficiencyGain: number;       // %
  fteFreed: number;             // fractional FTEs released
  headcountReduction: number;   // floor(fteFreed) — whole people who can be redeployed
  optimalCount: number;         // currentCount - headcountReduction
  costBefore: number;           // full role cost for this year
  costAfter: number;            // cost at optimal headcount
  saving: number;               // costBefore - costAfter
}
