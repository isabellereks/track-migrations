#!/usr/bin/env python3
"""
Extract LPR and temp worker data from DHS Immigration Statistics Yearbook PDFs (2016-2022).
Also uses the existing DHS_Yearbook2023 Excel file for FY2023.

Outputs:
  data/yearbook-lpr.json — per-country LPR by class (employment, family, diversity) per FY
  data/yearbook-tempworkers.json — per-country temp workers by visa class per FY
"""

import json
import re
import sys
from pathlib import Path

import pdfplumber

RAW = Path(__file__).resolve().parent.parent / "data" / "raw"
OUT = Path(__file__).resolve().parent.parent / "data"

# Known country name normalizations
COUNTRY_FIXES = {
    "China, People's Republic": "China",
    "Korea, South": "South Korea",
    "Korea, North": "North Korea",
    "Congo, Democratic Republic": "DR Congo",
    "Congo, Republic": "Congo Rep.",
    "Gambia, The": "Gambia",
    "Bahamas, The": "Bahamas",
    "Burma (Myanmar)": "Myanmar",
    "Czech Republic (Czechia)": "Czech Republic",
    "Micronesia, Federated States": "Micronesia",
    "Saint Kitts-Nevis": "St. Kitts and Nevis",
    "Saint Lucia": "St. Lucia",
    "Saint Vincent and the Grenadines": "St. Vincent",
    "Trinidad and Tobago": "Trinidad & Tobago",
    "Dominican Republic": "Dominican Rep.",
    "Central African Republic": "Central African Rep.",
    "Bosnia-Herzegovina": "Bosnia",
    "Antigua-Barbuda": "Antigua",
    "United Kingdom": "United Kingdom",
    "United States": None,  # skip
    "Not specified": None,
    "All other countries": None,
    "Unknown": None,
    "Other": None,
    "Born at sea": None,
    "Stateless": None,
}


def clean_country(name: str) -> str | None:
    name = re.sub(r'\d+$', '', name).strip().rstrip(',')
    if name in COUNTRY_FIXES:
        return COUNTRY_FIXES[name]
    return name


def parse_table_from_text(pdf, page_indices, skip_to_country=True, min_cols=4):
    """
    Parse a dot-leader yearbook table. Returns list of (country_name, [numbers]).
    """
    results = []
    in_country = False

    for pi in page_indices:
        if pi >= len(pdf.pages):
            continue
        text = pdf.pages[pi].extract_text()
        if not text:
            continue

        for line in text.split("\n"):
            line = line.strip()
            if not line:
                continue

            if line.startswith("See footnote") or line.startswith("Office of") or \
               line.startswith("Table ") or line.startswith("NONIMMIGRANT") or \
               line.startswith("PERSONS OBTAINING"):
                continue

            if "COUNTRY" in line:
                in_country = True
                continue

            if skip_to_country and not in_country:
                continue

            # Replace dot leaders
            cleaned = re.sub(r'\s*\.\s*(\.\s*)+', ' ||| ', line)

            parts = cleaned.split('|||')
            if len(parts) < 2:
                continue

            country = parts[0].strip()
            numbers_str = parts[1].strip()

            country = clean_country(country)
            if not country:
                continue

            tokens = numbers_str.split()
            nums = []
            for t in tokens:
                t = t.replace(",", "")
                if t in ("D", "X", "-", "–"):
                    nums.append(0)
                else:
                    try:
                        nums.append(int(float(t)))
                    except:
                        pass

            if len(nums) >= min_cols:
                results.append((country, nums))

    return results


def extract_table32_tempworkers(pdf, page_indices):
    """Extract Table 32 (temp workers by country × visa class)."""
    data = parse_table_from_text(pdf, page_indices, min_cols=9)
    results = {}
    for country, nums in data:
        if len(nums) < 9:
            continue
        results[country] = {
            "total": nums[0],
            "H1B": nums[1], "H2A": nums[2], "H2B": nums[3],
            "O1": nums[4], "P1": nums[5], "L1": nums[6],
            "E2": nums[7],
        }
    return results


def extract_table10_lpr(pdf, page_indices):
    """Extract Table 10 (LPR by country × broad class)."""
    data = parse_table_from_text(pdf, page_indices, min_cols=7)
    results = {}
    for country, nums in data:
        if len(nums) < 7:
            continue
        # Columns: Total, IR, Family, Employment, Diversity, Refugees/Asylees, Other
        results[country] = {
            "total": nums[0],
            "immediate_relative": nums[1],
            "family": nums[2],
            "employment": nums[3],
            "diversity": nums[4],
            "refugee_asylee": nums[5],
        }
    return results


# PDF configurations: (fiscal_year, filename, table32_pages, table10_pages)
# Pages are 0-indexed
YEARBOOK_CONFIGS = [
    (2016, "2016 Immigration Statistics Yearbook.pdf", range(91, 96), range(34, 40)),
    (2017, "2017 Immigration Statistics Yearbook.pdf", range(91, 96), range(34, 40)),
    (2018, "2018 Immigration Statistics Yearbook.pdf", range(91, 96), range(34, 40)),
    (2019, "2019 Immigration Statistics Yearbook.pdf", range(91, 96), range(34, 40)),
    (2020, "2020 Immigration Statistics Yearbook.pdf", range(91, 96), range(34, 40)),
    (2021, "2021 Immigration Statistics Yearbook.pdf", range(91, 96), range(34, 40)),
    (2022, "2022 Immigration Statistics Yearbook.pdf", range(91, 96), range(34, 40)),
]


def find_table_pages(pdf, table_name, start_search=0, end_search=None):
    """Find pages containing a specific table by searching for table header."""
    if end_search is None:
        end_search = len(pdf.pages)

    table_pages = []
    found = False

    for i in range(start_search, min(end_search, len(pdf.pages))):
        text = pdf.pages[i].extract_text()
        if not text:
            continue

        if table_name in text:
            found = True

        if found:
            # Check if this page has country data (has dot leaders with numbers)
            if re.search(r'\.\s*\.\s*.*\d{2,}', text):
                table_pages.append(i)
            elif table_pages:
                # We've gone past the table
                break

    return table_pages


def main():
    all_tw = {}
    all_lpr = {}

    for fy, filename, default_tw_pages, default_lpr_pages in YEARBOOK_CONFIGS:
        filepath = RAW / filename
        if not filepath.exists():
            print(f"  FY{fy}: {filename} not found, skipping")
            continue

        print(f"\n  FY{fy}: Processing {filename}...")
        pdf = pdfplumber.open(str(filepath))

        # Try to find Table 32 pages dynamically
        tw_pages = find_table_pages(pdf, "Table 32", 80, 100)
        if not tw_pages:
            tw_pages = list(default_tw_pages)
            print(f"    Table 32: using default pages {tw_pages[0]+1}-{tw_pages[-1]+1}")
        else:
            print(f"    Table 32: found on pages {tw_pages[0]+1}-{tw_pages[-1]+1}")

        tw_data = extract_table32_tempworkers(pdf, tw_pages)
        # Remove region entries
        for skip in ["Africa", "Asia", "Europe", "North America", "Oceania", "South America"]:
            tw_data.pop(skip, None)

        total_tw = sum(d["total"] for d in tw_data.values())
        print(f"    Temp workers: {len(tw_data)} countries, {total_tw:,} total")

        if tw_data:
            all_tw[f"fy{fy}"] = tw_data

        # Try to find Table 10 pages dynamically
        lpr_pages = find_table_pages(pdf, "Table 10", 25, 45)
        if not lpr_pages:
            lpr_pages = list(default_lpr_pages)
            print(f"    Table 10: using default pages {lpr_pages[0]+1}-{lpr_pages[-1]+1}")
        else:
            print(f"    Table 10: found on pages {lpr_pages[0]+1}-{lpr_pages[-1]+1}")

        lpr_data = extract_table10_lpr(pdf, lpr_pages)
        for skip in ["Africa", "Asia", "Europe", "North America", "Oceania", "South America"]:
            lpr_data.pop(skip, None)

        total_lpr = sum(d["total"] for d in lpr_data.values())
        print(f"    LPR: {len(lpr_data)} countries, {total_lpr:,} total")

        if lpr_data:
            all_lpr[f"fy{fy}"] = lpr_data

        pdf.close()

    # Save outputs
    tw_path = OUT / "yearbook-tempworkers.json"
    with open(tw_path, "w") as f:
        json.dump(all_tw, f, indent=2)
    print(f"\nSaved temp workers to {tw_path}")
    for k in sorted(all_tw.keys()):
        total = sum(d["total"] for d in all_tw[k].values())
        print(f"  {k}: {len(all_tw[k])} countries, {total:,} total")

    lpr_path = OUT / "yearbook-lpr.json"
    with open(lpr_path, "w") as f:
        json.dump(all_lpr, f, indent=2)
    print(f"\nSaved LPR to {lpr_path}")
    for k in sorted(all_lpr.keys()):
        total = sum(d["total"] for d in all_lpr[k].values())
        print(f"  {k}: {len(all_lpr[k])} countries, {total:,} total")


if __name__ == "__main__":
    main()
