export type MigrationReason =
  | "employment"
  | "family"
  | "asylum"
  | "refugee"
  | "diversity"
  | "other";

export const REASON_HEX: Record<MigrationReason, string> = {
  employment: "#7090C8",
  family: "#D9A766",
  asylum: "#D98080",
  refugee: "#AF52DE",
  diversity: "#7EBC8E",
  other: "#C9CBD1",
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
  mexico: "#C8534A",
  "central-america": "#D9A766",
  "south-america": "#E8C57E",
  caribbean: "#5AA5A5",
  asia: "#4F8B58",
  africa: "#9B6BC5",
  europe: "#7090C8",
  other: "#AEAEB2",
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

export const NEUTRAL_FILL = "#EFEDE8";
export const NEUTRAL_STROKE = "#E5E5E5";

export const SETTLEMENT_GRADIENT = {
  from: "#F0EDE8",
  to: "#7090C8",
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
