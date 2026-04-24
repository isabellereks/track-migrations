export interface EconomicContribution {
  national: {
    totalTaxesPaid: number;
    undocumentedTaxesPaid: number;
    socialSecurityPaid: number;
    medicarePaid: number;
    spendingPower: number;
    jobsFilled: number;
    cboGdpProjection: number;
    enforcementCost: number;
    catoFiscalSurplus30yr: number;
    icebudgetBoost: number;
  };
  byIndustry: IndustryData[];
  ledger: LedgerRow[];
  gdpScenarios: GdpScenario[];
}

export interface IndustryData {
  industry: string;
  icon: string;
  immigrantShare: number;
  undocumentedShare: number;
  estimatedWorkers: string;
  detail: string;
  impact: string;
  sources: string;
}

export interface LedgerRow {
  enforcement: { label: string; value: string };
  contribution: { label: string; value: string };
}

export interface GdpScenario {
  year: number;
  baseline: number;
  deportation: number;
}

export function getEconomicData(): EconomicContribution {
  return {
    national: {
      totalTaxesPaid: 652_000_000_000,
      undocumentedTaxesPaid: 89_800_000_000,
      socialSecurityPaid: 25_700_000_000,
      medicarePaid: 6_400_000_000,
      spendingPower: 299_000_000_000,
      jobsFilled: 8_500_000,
      cboGdpProjection: 8_900_000_000_000,
      enforcementCost: 170_000_000_000,
      catoFiscalSurplus30yr: 14_500_000_000_000,
      icebudgetBoost: 75_000_000_000,
    },
    byIndustry: [
      {
        industry: "Agriculture",
        icon: "🌾",
        immigrantShare: 0.68,
        undocumentedShare: 0.44,
        estimatedWorkers: "1.1M",
        detail: "68% foreign-born · 44% undocumented",
        impact: "DOL projected 500K worker shortfall by end of 2026",
        sources: "NAWS, USDA",
      },
      {
        industry: "Construction",
        icon: "🏗",
        immigrantShare: 0.25,
        undocumentedShare: 0.15,
        estimatedWorkers: "2.8M",
        detail: "25%+ immigrant workforce",
        impact: "$110B in revenue from immigrant-started construction businesses",
        sources: "AIC, Census",
      },
      {
        industry: "Food & Hospitality",
        icon: "🍽",
        immigrantShare: 0.23,
        undocumentedShare: 0.12,
        estimatedWorkers: "3.6M",
        detail: "Weakest job growth since crackdown",
        impact: "Job growth in immigrant-heavy sectors trailing rest of economy",
        sources: "BLS, CFR",
      },
      {
        industry: "Domestic & Care Work",
        icon: "🏠",
        immigrantShare: 0.35,
        undocumentedShare: 0.20,
        estimatedWorkers: "2.2M",
        detail: "Cleaning, childcare, elder care",
        impact: "Enables workforce participation of US-born parents & caregivers",
        sources: "Pew, EPI",
      },
    ],
    ledger: [
      {
        enforcement: { label: "Appropriated (OBBBA)", value: "$170B" },
        contribution: { label: "Taxes paid (2023)", value: "$652B" },
      },
      {
        enforcement: { label: "ICE budget boost", value: "$75B" },
        contribution: { label: "Undocumented taxes", value: "$89.8B" },
      },
      {
        enforcement: { label: "Currently detained", value: "60,311" },
        contribution: { label: "Jobs filled", value: "8.5M" },
      },
      {
        enforcement: { label: "FY2026 removals YTD", value: "234,236" },
        contribution: { label: "Projected GDP (10yr)", value: "$8.9T" },
      },
      {
        enforcement: { label: "Arrests/day (Mar 2026)", value: "955" },
        contribution: { label: "Social Security paid", value: "$25.7B" },
      },
    ],
    gdpScenarios: [
      { year: 2024, baseline: 28.78, deportation: 28.78 },
      { year: 2025, baseline: 29.92, deportation: 29.60 },
      { year: 2026, baseline: 31.10, deportation: 30.18 },
      { year: 2027, baseline: 32.34, deportation: 30.55 },
      { year: 2028, baseline: 33.64, deportation: 31.15 },
      { year: 2029, baseline: 35.00, deportation: 32.08 },
      { year: 2030, baseline: 36.43, deportation: 33.22 },
    ],
  };
}
