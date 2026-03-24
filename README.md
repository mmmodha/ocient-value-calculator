# Ocient Value Calculator

A comprehensive financial analysis tool for demonstrating the 5-year Total Cost of Ownership (TCO) savings and ROI of migrating to Ocient's high-performance data analytics platform.

![Ocient Value Calculator](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![Vite](https://img.shields.io/badge/Vite-5.0-purple)

## Overview

The Ocient Value Calculator helps account teams and solutions architects build data-driven business cases for Ocient adoption. It models the financial impact of efficiency gains on staffing costs, SLA improvements, and system consolidation over a 5-year horizon.

### Key Value Propositions Modeled

- **Staff Efficiency Gains**: Calculate FTE savings from faster query performance
- **Staff Reduction Scenarios**: Compare recommended (optimal) vs. actual staffing decisions
- **SLA Improvement**: Quantify cost avoidance from reduced downtime penalties
- **System Consolidation**: Factor in replaced system costs
- **5-Year TCO Projection**: Compare "as-is" growth vs. Ocient investment

## Features

### 📊 Interactive Dashboard
- Real-time 5-year financial projections
- Cost breakdown charts (staffing, systems, SLA breaches)
- Cumulative TCO comparison (Current vs. With Ocient)
- Efficiency gain curve visualization
- Payback period calculation

### 👥 Staffing Analysis
- Per-role headcount optimization based on efficiency gains
- Query-dependent workload modeling (what % of each role benefits from faster queries)
- Year-over-year headcount carry-forward (reductions persist across years)
- User-configurable override for actual headcount decisions

### 🎯 Use Case Modeling
- Activity-based cost analysis by persona
- Cycle time reduction calculations
- FTE equivalent calculations for specific workflows
- Before/After Ocient cost comparisons

### ⚠️ Validation & Warnings
- Smart validation for unrealistic inputs
- Capacity planning alerts
- Efficiency gain sanity checks (diminishing returns warning)
- SLA breach configuration validation

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (custom dark theme)
- **Charts**: Recharts
- **Icons**: Lucide React

## Installation

```bash
# Clone the repository
git clone https://github.com/mmmodha/ocient-value-calculator.git
cd ocient-value-calculator

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Usage

### Basic Workflow

1. **Configure Work Environment**
   - Set working days/hours per year
   - Select currency (GBP, USD, EUR, etc.)

2. **Define Staff Types**
   - Add roles (Data Engineers, BI Analysts, etc.)
   - Set headcount, salary, YoY increase
   - Configure query-dependent % (portion of role affected by faster queries)

3. **Input Use Cases**
   - Define persona activities (queries per year, cycle time, etc.)
   - Model time spent on specific workflows

4. **Configure Systems & SLAs**
   - Add current system costs (replaced vs. retained with Ocient)
   - Model SLA breach costs (hourly or incident-based)

5. **Set Efficiency Gains**
   - Configure year-by-year efficiency improvements
   - Typical: 40% Y1 → 12% Y5 (diminishing returns)

6. **Set Ocient Pricing**
   - Input annual Ocient costs (Y1-Y5)

7. **Review Dashboard**
   - View 5-year TCO comparison
   - Analyze optimal staff sizing recommendations
   - Export findings for business case

### Key Calculation Logic

#### Staff Reduction Model

The calculator applies efficiency gains to reduce headcount year-over-year:

```
Year 1: 30 staff × 40% efficiency × 100% query-dependent = 12 FTE freed → 21 staff (rounded)
Year 2: 21 staff × 25% efficiency × 100% query-dependent = 5 FTE freed → 16 staff
Year 3: 16 staff × 20% efficiency × 100% query-dependent = 3 FTE freed → 13 staff
...
```

Headcount reductions **carry forward** each year—they don't reset to original counts.

#### Net Savings Calculation

```
Net Savings = Current Cost - (Reduced Staff Cost + Residual Systems + Ocient Cost)
```

Where:
- `Current Cost` grows with salary inflation and system cost increases
- `With Ocient` cost declines as headcount reduces (despite salary inflation)

### Customizing Staff Reductions

By default, the calculator uses the **recommended** (optimal) headcount. You can override this per role, per year via the `staffReductionDecisions` state:

```typescript
// Example: Keep more staff than recommended in Year 1-2
state.staffReductionDecisions = {
  'de': { 1: 25, 2: 22 },  // Override: keep 25 staff Y1, 22 staff Y2
  'bi': { 1: null, 2: null }  // Use recommended for BI Analysts
}
```

## Project Structure

```
src/
├── components/
│   ├── OutputDashboard.tsx      # Main results dashboard with charts
│   ├── StaffingSection.tsx      # Staff type configuration
│   ├── UseCaseSection.tsx       # Persona use case inputs
│   ├── SystemCostsSection.tsx   # Current system costs
│   ├── SLASection.tsx           # SLA breach modeling
│   ├── OcientPricingSection.tsx # Ocient cost inputs
│   ├── EfficiencySlider.tsx     # Efficiency gain controls
│   ├── ValidationPanel.tsx      # Warning/error display
│   └── Section.tsx              # Reusable form section wrapper
├── types/
│   └── index.ts                 # TypeScript interfaces
├── utils/
│   ├── calculations.ts          # Core financial calculations
│   └── defaultState.ts          # Initial demo data
└── App.tsx                      # Main application shell
```

## Key Types

### AppState
Central application state containing all inputs:
- `staffTypes`: Role definitions with headcount and costs
- `personaUseCases`: Activity-based modeling inputs
- `systemCosts`: Current system spend (replaced/retained flags)
- `slaBreaches`: Penalty calculations
- `efficiency`: Year-by-year efficiency gain percentages
- `ocientPricing`: Annual Ocient licensing costs
- `staffReductionDecisions`: User overrides for headcount

### YearlySnapshot
Computed output for each of 5 years:
- Current costs (staffing, systems, SLA)
- Ocient scenario costs (with staff reductions applied)
- Recommended vs. Actual staffing breakdowns
- Net savings and ROI calculations

## Calculation Reference

### Efficiency Gain Application
Efficiency gains reduce the time required for query-dependent activities:

```typescript
newCycleTime = originalCycleTime × (1 - efficiencyGain)
fteFreed = staffCount × queryDependentPct × efficiencyGain
```

### Salary Inflation
All salary costs compound annually:

```typescript
salaryYearN = baseSalary × (1 + yoyIncrease)^(N-1)
```

### Payback Period
Calculated when cumulative savings exceed cumulative Ocient costs:

```typescript
paybackYear = first year where Σ(staffSavings + slaSavings) ≥ Σ(ocientCost)
```

## Development

### Available Scripts

- `npm run dev` - Start dev server with HMR
- `npm run build` - Production build
- `npm run preview` - Preview production build
- `npm run lint` - ESLint check

### Adding New Currencies

Edit `src/types/index.ts`:

```typescript
export type CurrencyCode = 'GBP' | 'USD' | 'EUR' | 'AUD' | 'CAD' | 'JPY' | 'INR' | 'NEW';

export const CURRENCIES: Record<CurrencyCode, { symbol: string; name: string }> = {
  // ... existing currencies
  NEW: { symbol: '$', name: 'New Currency' },
};
```

## License

MIT License - See LICENSE file for details

## Contributing

This tool is designed for internal Ocient account team use. For feature requests or bug reports, please open an issue.

---
