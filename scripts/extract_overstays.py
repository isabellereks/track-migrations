#!/usr/bin/env python3
"""
Extract per-country suspected in-country overstay counts from
CBP Entry/Exit Overstay Report PDFs (FY2015–FY2024).

Outputs data/overstay-extracted.json with structure:
  { "fy2015": {"COUNTRY": count, ...}, "fy2016": {...}, ... }
"""

import json
import re
import sys
from pathlib import Path

import pdfplumber

RAW = Path(__file__).resolve().parent.parent / "data" / "raw"
OUT = Path(__file__).resolve().parent.parent / "data" / "overstay-extracted.json"

COUNTRY_RE = re.compile(
    r'^([A-Z][A-Za-z\s\',\.\(\)\-]+?)\s+'
    r'([\d,]+)\s+'       # expected departures
    r'([\d,]+|-)\s+'     # out-of-country
    r'([\d,]+|-)\s+'     # suspected in-country
    r'([\d,]+|-)\s+'     # total overstays
    r'([\d\.]+%)\s+'     # total overstay rate
    r'([\d\.]+%|-)'      # suspected in-country rate
)

CONTINUATION_RE = re.compile(r'^([A-Z][A-Za-z\s\',\.\(\)\-]+)$')

SKIP_ROWS = {
    "TOTAL", "TOTALS", "VWP TOTAL", "B1/B2 TOTAL", "B1/B2 TOTALS",
    "F, M, J TOTAL", "F, M, J TOTALS", "OTHER IN-SCOPE TOTAL",
    "OTHER IN-SCOPE TOTALS", "OTHER IN-SCOPE", "GRAND TOTAL",
    "COUNTRY OF CITIZENSHIP", "COUNTRY OF", "EXPECTED", "OUT-OF-",
    "DEPARTURES", "OVERSTAYS", "RATE", "SUSPECTED", "TABLE",
    "FY 20", "APPENDIX", "TOTALS:",
    "CANADA TOTAL", "MEXICO TOTAL", "CANADA (", "MEXICO (",
}

COUNTRY_NAME_FIXES = {
    "ANTIGUA AND BARBUDA": "ANTIGUA AND BARBUDA",
    "BOSNIA AND HERZEGOVINA": "BOSNIA AND HERZEGOVINA",
    "BRUNEI DARUSSALAM": "BRUNEI",
    "CABO VERDE": "CABO VERDE",
    "CENTRAL AFRICAN REPUBLIC": "CENTRAL AFRICAN REPUBLIC",
    "CONGO (BRAZZAVILLE)": "CONGO (BRAZZAVILLE)",
    "CONGO (KINSHASA)": "CONGO (KINSHASA)",
    "CONGO, REPUBLIC OF THE": "CONGO (BRAZZAVILLE)",
    "CONGO, DEMOCRATIC REPUBLIC OF THE": "CONGO (KINSHASA)",
    "COTE D'IVOIRE": "COTE D'IVOIRE",
    "CZECH REPUBLIC": "CZECH REPUBLIC",
    "DOMINICAN REPUBLIC": "DOMINICAN REPUBLIC",
    "EQUATORIAL GUINEA": "EQUATORIAL GUINEA",
    "GUINEA-BISSAU": "GUINEA-BISSAU",
    "KOREA, NORTH": "KOREA, NORTH",
    "KOREA, SOUTH": "KOREA, SOUTH",
    "MARSHALL ISLANDS": "MARSHALL ISLANDS",
    "MICRONESIA, FEDERATED STATES OF": "MICRONESIA",
    "NEW ZEALAND": "NEW ZEALAND",
    "NORTH MACEDONIA": "NORTH MACEDONIA",
    "PAPUA NEW GUINEA": "PAPUA NEW GUINEA",
    "SAO TOME AND PRINCIPE": "SAO TOME AND PRINCIPE",
    "SAUDI ARABIA": "SAUDI ARABIA",
    "SIERRA LEONE": "SIERRA LEONE",
    "SOLOMON ISLANDS": "SOLOMON ISLANDS",
    "SOUTH AFRICA": "SOUTH AFRICA",
    "SOUTH SUDAN": "SOUTH SUDAN",
    "SRI LANKA": "SRI LANKA",
    "ST. KITTS AND NEVIS": "ST. KITTS AND NEVIS",
    "SAINT KITTS AND NEVIS": "ST. KITTS AND NEVIS",
    "ST. LUCIA": "ST. LUCIA",
    "SAINT LUCIA": "ST. LUCIA",
    "ST. VINCENT AND THE GRENADINES": "ST. VINCENT AND THE GRENADINES",
    "SAINT VINCENT AND THE GRENADINES": "ST. VINCENT AND THE GRENADINES",
    "TIMOR-LESTE": "TIMOR-LESTE",
    "TRINIDAD AND TOBAGO": "TRINIDAD AND TOBAGO",
    "UNITED ARAB EMIRATES": "UNITED ARAB EMIRATES",
    "UNITED KINGDOM": "UNITED KINGDOM",
    "BAHAMAS, THE": "BAHAMAS",
    "GAMBIA, THE": "GAMBIA",
    "The Bahamas": "BAHAMAS",
    "Bahamas, The": "BAHAMAS",
    "Gambia, The": "GAMBIA",
}

MULTI_WORD_COUNTRIES = [
    "ANTIGUA AND", "BOSNIA AND", "BURKINA", "CABO", "CENTRAL AFRICAN",
    "CONGO", "COSTA", "COTE", "CZECH", "DOMINICAN", "EL ",
    "EQUATORIAL", "GUINEA-", "KOREA,", "MARSHALL", "MICRONESIA",
    "NEW ZEALAND", "NORTH MACEDONIA", "PAPUA", "SAO TOME", "SAUDI",
    "SIERRA", "SOLOMON", "SOUTH AFRICA", "SOUTH SUDAN", "SRI",
    "ST.", "SAINT", "TIMOR", "TRINIDAD", "UNITED",
]

# Garbled names from PDF line-wrapping: maps bad name → correct country name
GARBLED_FIXES = {
    "BARBUDA ARGENTINA": None,  # Remove — Antigua and Barbuda data misassigned to Argentina
    "EMIRATES URUGUAY": None,
    "GRENADINES SAMOA": None,
    "HERZEGOVINA BOTSWANA": None,
    "NEVIS SAINT LUCIA": None,
    "REPUBLIC CHAD": None,
    "REPUBLIC ECUADOR": None,
    "PRINCIPE SAUDI ARABIA": None,
    "STATES OF MOLDOVA": "MOLDOVA",
    "TOBAGO TUNISIA": None,
    "ISLANDS MAURITANIA": None,
    "ISLANDS SOMALIA": None,
    "MICRONESIA, FEDERATED STATES OF - - - - - - MOLDOVA": None,
    "MICRONESIA, FEDERATED - - - - - - STATES OF MOLDOVA": None,
    "MICRONESIA, FEDERATED STATES OF": "MICRONESIA",
    "MARSHALL ISLANDS - - - - - - MAURITANIA": None,
    "SAO TOME AND PRINCIPE - - - - - - SAUDI ARABIA": None,
    "SOLOMON ISLANDS - - - - - - SOMALIA": None,
    "TIMOR-LESTE - - - - - - TOGO": None,
    "OF": None,
    "EQUATORIAL": None,
}


def parse_number(s: str) -> int:
    s = s.strip()
    if s == "-" or s == "" or s == "–":
        return 0
    return int(s.replace(",", ""))


def is_skip_row(text: str) -> bool:
    upper = text.strip().upper()
    for skip in SKIP_ROWS:
        if upper.startswith(skip):
            return True
    return False


KNOWN_COUNTRIES = {
    "AFGHANISTAN", "ALBANIA", "ALGERIA", "ANDORRA", "ANGOLA",
    "ANTIGUA AND BARBUDA", "ARGENTINA", "ARMENIA", "AUSTRALIA", "AUSTRIA",
    "AZERBAIJAN", "BAHAMAS", "BAHAMAS, THE", "BAHRAIN", "BANGLADESH",
    "BARBADOS", "BELARUS", "BELGIUM", "BELIZE", "BENIN", "BHUTAN",
    "BOLIVIA", "BOSNIA AND HERZEGOVINA", "BOTSWANA", "BRAZIL", "BRUNEI",
    "BULGARIA", "BURKINA FASO", "BURMA", "BURUNDI", "CABO VERDE",
    "CAMBODIA", "CAMEROON", "CANADA", "CENTRAL AFRICAN REPUBLIC", "CHAD",
    "CHILE", "CHINA", "COLOMBIA", "COMOROS", "CONGO (BRAZZAVILLE)",
    "CONGO (KINSHASA)", "COSTA RICA", "COTE D'IVOIRE", "CROATIA", "CUBA",
    "CYPRUS", "CZECH REPUBLIC", "DENMARK", "DJIBOUTI",
    "DOMINICAN REPUBLIC", "ECUADOR", "EGYPT", "EL SALVADOR",
    "EQUATORIAL GUINEA", "ERITREA", "ESTONIA", "ETHIOPIA", "FIJI",
    "FINLAND", "FRANCE", "GABON", "GAMBIA", "GAMBIA, THE", "GEORGIA",
    "GERMANY", "GHANA", "GREECE", "GRENADA", "GUATEMALA", "GUINEA",
    "GUINEA-BISSAU", "GUYANA", "HAITI", "HOLY SEE", "HONDURAS",
    "HUNGARY", "ICELAND", "INDIA", "INDONESIA", "IRAN", "IRAQ",
    "IRELAND", "ISRAEL", "ITALY", "JAMAICA", "JAPAN", "JORDAN",
    "KAZAKHSTAN", "KENYA", "KIRIBATI", "KOREA, NORTH", "KOREA, SOUTH",
    "KOSOVO", "KUWAIT", "KYRGYZSTAN", "LAOS", "LATVIA", "LEBANON",
    "LESOTHO", "LIBERIA", "LIBYA", "LIECHTENSTEIN", "LITHUANIA",
    "LUXEMBOURG", "MACEDONIA", "NORTH MACEDONIA", "MADAGASCAR", "MALAWI",
    "MALAYSIA", "MALDIVES", "MALI", "MALTA", "MARSHALL ISLANDS",
    "MAURITANIA", "MAURITIUS", "MEXICO", "MICRONESIA",
    "MICRONESIA, FEDERATED STATES OF", "MOLDOVA", "MONACO", "MONGOLIA",
    "MONTENEGRO", "MOROCCO", "MOZAMBIQUE", "NAMIBIA", "NAURU", "NEPAL",
    "NETHERLANDS", "NEW ZEALAND", "NICARAGUA", "NIGER", "NIGERIA",
    "NORWAY", "OMAN", "PAKISTAN", "PALAU", "PANAMA",
    "PAPUA NEW GUINEA", "PARAGUAY", "PERU", "PHILIPPINES", "POLAND",
    "PORTUGAL", "QATAR", "ROMANIA", "RUSSIA", "RWANDA", "SAMOA",
    "SAN MARINO", "SAO TOME AND PRINCIPE", "SAUDI ARABIA", "SENEGAL",
    "SERBIA", "SEYCHELLES", "SIERRA LEONE", "SINGAPORE", "SLOVAKIA",
    "SLOVENIA", "SOLOMON ISLANDS", "SOMALIA", "SOUTH AFRICA",
    "SOUTH SUDAN", "SPAIN", "SRI LANKA", "ST. KITTS AND NEVIS",
    "SAINT KITTS AND NEVIS", "ST. LUCIA", "SAINT LUCIA",
    "ST. VINCENT AND THE GRENADINES", "SAINT VINCENT AND THE GRENADINES",
    "SUDAN", "SURINAME", "SWAZILAND", "ESWATINI", "SWEDEN",
    "SWITZERLAND", "SYRIA", "TAIWAN", "TAJIKISTAN", "TANZANIA",
    "THAILAND", "TIMOR-LESTE", "TOGO", "TONGA",
    "TRINIDAD AND TOBAGO", "TUNISIA", "TURKEY", "TURKMENISTAN", "TUVALU",
    "UGANDA", "UKRAINE", "UNITED ARAB EMIRATES", "UNITED KINGDOM",
    "URUGUAY", "UZBEKISTAN", "VANUATU", "VENEZUELA", "VIETNAM",
    "YEMEN", "ZAMBIA", "ZIMBABWE",
}


def is_known_country(name: str) -> bool:
    upper = name.upper().strip()
    upper = re.sub(r'\d+$', '', upper).strip()
    upper = COUNTRY_NAME_FIXES.get(upper, upper)
    return upper in KNOWN_COUNTRIES


def extract_countries_from_pages(pdf, page_indices: list[int]) -> dict[str, int]:
    """Extract country -> suspected_in_country from given pages."""
    results = {}
    pending_parts = []

    for pi in page_indices:
        if pi >= len(pdf.pages):
            continue
        text = pdf.pages[pi].extract_text()
        if not text:
            continue

        lines = text.split("\n")
        for line in lines:
            line = line.strip()
            if not line or is_skip_row(line):
                pending_parts = []
                continue

            m = COUNTRY_RE.match(line)
            if m:
                raw_name = m.group(1).strip()
                suspected = parse_number(m.group(4))
                name_upper = raw_name.upper().strip()
                name_upper = re.sub(r'\d+$', '', name_upper).strip()

                if pending_parts:
                    # Try combining pending parts with this name
                    combined = " ".join(pending_parts + [name_upper])
                    combined = COUNTRY_NAME_FIXES.get(combined, combined)
                    if is_known_country(combined):
                        name_upper = combined
                    else:
                        # Try just pending parts (maybe the data row name is correct on its own)
                        partial = " ".join(pending_parts)
                        partial = COUNTRY_NAME_FIXES.get(partial, partial)
                        # Discard pending — use the row's own name
                    pending_parts = []

                name_upper = COUNTRY_NAME_FIXES.get(name_upper, name_upper)

                if name_upper and not is_skip_row(name_upper):
                    if name_upper in results:
                        results[name_upper] += suspected
                    else:
                        results[name_upper] = suspected
                continue

            # Check if this is a text-only line (continuation of a country name)
            cont = CONTINUATION_RE.match(line)
            if cont:
                candidate = cont.group(1).strip()
                candidate = re.sub(r'\d+$', '', candidate).strip()
                if len(candidate) > 1 and not any(c.isdigit() for c in candidate[:3]):
                    pending_parts.append(candidate.upper())
                else:
                    pending_parts = []
            else:
                pending_parts = []

    # Clean up garbled entries
    cleaned = {}
    for name, count in results.items():
        fix = GARBLED_FIXES.get(name)
        if fix is None and name in GARBLED_FIXES:
            continue  # Drop garbled entry
        if fix:
            name = fix
        if name in cleaned:
            cleaned[name] += count
        else:
            cleaned[name] = count

    return cleaned


def extract_canada_mexico_table(pdf, page_indices: list[int]) -> dict[str, int]:
    """Extract Canada and Mexico totals from Table 3/6."""
    results = {}
    for pi in page_indices:
        if pi >= len(pdf.pages):
            continue
        text = pdf.pages[pi].extract_text()
        if not text:
            continue

        lines = text.split("\n")
        for line in lines:
            line = line.strip()
            # Look for "Canada Total" or standalone "Canada" or "CANADA" rows with numbers
            for country in ["Canada", "CANADA", "Mexico", "MEXICO"]:
                # Match "Canada Total" or "CANADA" at start of line followed by numbers
                pattern = re.compile(
                    rf'^({country}(?:\s+Total)?)\s+'
                    r'([\d,]+)\s+'       # expected departures
                    r'([\d,]+|-)\s+'     # out-of-country
                    r'([\d,]+|-)\s+'     # suspected in-country
                    r'([\d,]+|-)',       # total overstays
                    re.IGNORECASE
                )
                m = pattern.match(line)
                if m:
                    label = m.group(1).strip().upper()
                    suspected = parse_number(m.group(4))
                    cname = "CANADA" if "CANADA" in label else "MEXICO"

                    # Prefer "Total" rows (they sum B1/B2 + F/M/J + Other)
                    if "TOTAL" in label:
                        results[cname] = suspected
                    elif cname not in results:
                        results[cname] = suspected

    return results


def extract_fy2015(pdf) -> dict[str, int]:
    """FY2015: Table 1 (VWP) pp13-15, Table 2 (non-VWP) pp16-20, Table 3 (CAN/MEX) p21. B1/B2 only."""
    data = extract_countries_from_pages(pdf, list(range(12, 21)))  # pages 13-21
    can_mex = extract_canada_mexico_table(pdf, [20])  # page 21
    data.update(can_mex)
    return data


def extract_fy2016(pdf) -> dict[str, int]:
    """FY2016: Table 2 pp22-23, Table 3 pp24-27, Table 4 pp28-32, Table 5 pp33-37, Table 6 (CAN/MEX) p38."""
    data = extract_countries_from_pages(pdf, list(range(21, 37)))  # pages 22-37
    can_mex = extract_canada_mexico_table(pdf, [37])  # page 38
    data.update(can_mex)
    return data


def extract_fy2017_from_fy2018_appendix(pdf) -> dict[str, int]:
    """FY2017 from FY2018 report appendix: Table C-2 pp43-44, C-3 pp45-48, C-4 pp49-53, C-5 pp54-58, C-6 p59."""
    data = extract_countries_from_pages(pdf, list(range(42, 58)))  # pages 43-58
    can_mex = extract_canada_mexico_table(pdf, [58])  # page 59
    data.update(can_mex)
    return data


def extract_fy2018(pdf) -> dict[str, int]:
    """FY2018: Table 2 pp20-21, Table 3 pp22-25, Table 4 pp26-30, Table 5 pp31-35, Table 6 pp36-37."""
    data = extract_countries_from_pages(pdf, list(range(19, 35)))  # pages 20-35
    can_mex = extract_canada_mexico_table(pdf, [35, 36])  # pages 36-37
    data.update(can_mex)
    return data


def extract_fy2019(pdf) -> dict[str, int]:
    """FY2019: Table 2 pp21-22, Table 3 pp23-26, Table 4 pp27-31, Table 5 pp32-36, Table 6 p37."""
    data = extract_countries_from_pages(pdf, list(range(20, 36)))  # pages 21-36
    can_mex = extract_canada_mexico_table(pdf, [36])  # page 37
    data.update(can_mex)
    return data


def extract_fy2020(pdf) -> dict[str, int]:
    """FY2020: Table 2 p22, Table 3 pp23-27, Table 4 pp28-31, Table 5 pp32-37, Table 6 pp37-38."""
    data = extract_countries_from_pages(pdf, list(range(21, 37)))  # pages 22-37
    can_mex = extract_canada_mexico_table(pdf, [36, 37])  # pages 37-38
    data.update(can_mex)
    return data


def extract_fy2021_from_fy2223_appendix(pdf) -> dict[str, int]:
    """FY2021 from FY22/23 report appendix: Tables C-2 through C-6, pp45-59."""
    data = extract_countries_from_pages(pdf, list(range(44, 58)))  # pages 45-58
    can_mex = extract_canada_mexico_table(pdf, [58, 59])  # pages 59-60
    data.update(can_mex)
    return data


def extract_fy2022(pdf) -> dict[str, int]:
    """FY2022: Table 2 pp23-24, Table 3 pp24-27, Table 4 pp28-32, Table 5 pp33-37, Table 6 p38."""
    data = extract_countries_from_pages(pdf, list(range(22, 37)))  # pages 23-37
    can_mex = extract_canada_mexico_table(pdf, [37])  # page 38
    data.update(can_mex)
    return data


PDF_CONFIGS = [
    ("fy2015", "DHS Overstay Report FY 2015.pdf", extract_fy2015, None),
    ("fy2016", "Entry Exit Overstay Report FY 2016.pdf", extract_fy2016, None),
    ("fy2017", "FY 2018 Entry Exit Overstay Report.pdf", None, extract_fy2017_from_fy2018_appendix),
    ("fy2018", "FY 2018 Entry Exit Overstay Report.pdf", extract_fy2018, None),
    ("fy2019", "FY 2019 Entry Exit Overstay Report.pdf", extract_fy2019, None),
    ("fy2020", "FY 2020 Entry Exit Overstay Report.pdf", extract_fy2020, None),
    ("fy2021", "FY22 FY23 Entry Exit Overstay Report.pdf", None, extract_fy2021_from_fy2223_appendix),
    ("fy2022", "FY22 FY23 Entry Exit Overstay Report.pdf", extract_fy2022, None),
]


def main():
    # Load existing data (FY2023, FY2024)
    existing = {}
    if OUT.exists():
        with open(OUT) as f:
            existing = json.load(f)

    all_data = {}

    for fy_key, filename, main_fn, alt_fn in PDF_CONFIGS:
        filepath = RAW / filename
        if not filepath.exists():
            print(f"  {fy_key}: {filename} not found, skipping")
            continue

        pdf = pdfplumber.open(str(filepath))
        fn = alt_fn if alt_fn else main_fn
        data = fn(pdf)
        pdf.close()

        total = sum(data.values())
        print(f"  {fy_key}: {len(data)} countries, {total:,} total suspected in-country overstays")

        # Show top 5
        top = sorted(data.items(), key=lambda x: -x[1])[:5]
        for name, count in top:
            print(f"    {name}: {count:,}")

        all_data[fy_key] = data

    # Merge with existing FY2023/FY2024
    for k in ["fy2023", "fy2024"]:
        if k in existing and k not in all_data:
            all_data[k] = existing[k]

    # Sort by year
    sorted_data = dict(sorted(all_data.items(), key=lambda x: x[0]))

    with open(OUT, "w") as f:
        json.dump(sorted_data, f, indent=2)

    print(f"\nSaved {len(sorted_data)} fiscal years to {OUT}")
    for k in sorted(sorted_data.keys()):
        total = sum(sorted_data[k].values())
        print(f"  {k}: {len(sorted_data[k])} countries, {total:,} total")


if __name__ == "__main__":
    main()
