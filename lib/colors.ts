export type MigrationReason =
  | "employment"
  | "family"
  | "asylum"
  | "refugee"
  | "diversity"
  | "other";

export const REASON_HEX: Record<MigrationReason, string> = {
  employment: "#4080C0",
  family: "#CC9058",
  asylum: "#CC6B63",
  refugee: "#9462B4",
  diversity: "#56A86C",
  other: "#8E8E93",
};

export const REASON_LABEL: Record<MigrationReason, string> = {
  employment: "Employment",
  family: "Family",
  asylum: "Asylum",
  refugee: "Refugee",
  diversity: "Diversity visa",
  other: "Other",
};

export type OriginRegion =
  | "mexico"
  | "central-america"
  | "south-america"
  | "caribbean"
  | "asia"
  | "africa"
  | "europe"
  | "other";

export const REGION_HEX: Record<OriginRegion, string> = {
  mexico: "#CC6B63",
  "central-america": "#CC9058",
  "south-america": "#C8AE48",
  caribbean: "#50A0AE",
  asia: "#56A86C",
  africa: "#9462B4",
  europe: "#4080C0",
  other: "#8E8E93",
};

export const REGION_LABEL: Record<OriginRegion, string> = {
  mexico: "Mexico",
  "central-america": "Central America",
  "south-america": "South America",
  caribbean: "Caribbean",
  asia: "Asia",
  africa: "Africa",
  europe: "Europe",
  other: "Other",
};

export type EncounterType =
  | "apprehension"
  | "inadmissible"
  | "expulsion"
  | "cbp-one";

export const ENCOUNTER_CLASSES: Record<EncounterType, string> = {
  apprehension: "bg-red-50 text-red-700",
  inadmissible: "bg-amber-50 text-amber-700",
  expulsion: "bg-black/[.04] text-muted",
  "cbp-one": "bg-green-50 text-green-700",
};

export const ENCOUNTER_LABEL: Record<EncounterType, string> = {
  apprehension: "Apprehension",
  inadmissible: "Inadmissible",
  expulsion: "Title 42 expulsion",
  "cbp-one": "CBP One appointment",
};

export type CriminalHistory = "convicted" | "pending-charges" | "immigration-only";

export const CRIMINAL_HISTORY_HEX: Record<CriminalHistory, string> = {
  convicted: "#CC6B63",
  "pending-charges": "#E0A08A",
  "immigration-only": "#A0C4D8",
};

export const CRIMINAL_HISTORY_LABEL: Record<CriminalHistory, string> = {
  convicted: "Convicted",
  "pending-charges": "Pending charges",
  "immigration-only": "Immigration only",
};

export const ENFORCE_HEX = {
  arrest: "#CC6B63",
  detained: "#E0A08A",
  removed: "#8E8E93",
};

export const ECON_HEX = {
  taxes: "#56A86C",
  gdp: "#7AC0A0",
  jobs: "#A0D4B8",
};

export const NEUTRAL_FILL = "#F0F0F0";
export const NEUTRAL_STROKE = "#DCDCDC";

export const SETTLEMENT_GRADIENT = {
  from: "#F0F0F0",
  to: "#4080C0",
};

export function lerpHex(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const h = hex.replace("#", "");
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bVal = Math.round(ab + (bb - ab) * t);
  return (
    "#" +
    [r, g, bVal]
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("")
  );
}
