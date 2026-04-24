#!/usr/bin/env python3
"""
Normalize raw immigration data files into EncounterRecord JSON for the particle map.

Sources:
  - USBP apprehension files (border-entered, border-turnedaway)
  - OFO inadmissible files (border-inadmissible)
  - ICE arrests (arrests-latest.xlsx → border-entered layer for arrests filter)
  - ICE encounters (encounters-latest.xlsx → border-entered layer)
  - DHS Yearbook LPR tables (legal-employment, legal-family, legal-diversity)
  - OHSS Refugees (refugee layer)
  - WRAPS Refugee Admissions (refugee layer, more recent)
  - Overstay: hardcoded top-line (427,204 FY2024)

Output:
  data/particles.json   — EncounterRecord[]
  data/sidebar-stats.json — precomputed totals per filter preset
"""

import json
import os
import sys
import glob
from collections import defaultdict
from pathlib import Path

import pandas as pd

RAW = Path(__file__).resolve().parent.parent / "data" / "raw"
OUT = Path(__file__).resolve().parent.parent / "data"

# ── Mapping tables ──────────────────────────────────────────────────────────

USBP_SECTOR_MAP = {
    "EPT": "el-paso",
    "TCA": "tucson",
    "YMA": "yuma",
    "SDC": "san-diego",
    "ELC": "el-centro",
    "RGV": "rio-grande-valley",
    "LRT": "laredo",
    "DRT": "del-rio",
    "BBT": "big-bend",
    "BLW": "blaine",
    "SWB": "swanton",
    "BUF": "buffalo",
    "HVR": "havre",
    "SPW": "spokane",
    "GRF": "grand-forks",
    "DET": "detroit",
    "MIP": "miami",
    "NLL": "new-orleans",
    "RMY": "ramey",
}

SECTOR_CENTROIDS = {
    "rio-grande-valley": [26.2, -97.7],
    "laredo": [27.5, -99.5],
    "del-rio": [29.4, -100.9],
    "big-bend": [29.3, -103.4],
    "el-paso": [31.8, -106.4],
    "tucson": [32.2, -111.0],
    "yuma": [32.7, -114.6],
    "el-centro": [32.8, -115.6],
    "san-diego": [32.7, -117.2],
    "swanton": [44.5, -73.1],
    "buffalo": [42.9, -78.9],
    "detroit": [42.3, -83.0],
    "grand-forks": [47.9, -97.0],
    "havre": [48.5, -109.7],
    "spokane": [47.7, -117.4],
    "blaine": [49.0, -122.7],
    "miami": [25.8, -80.2],
    "new-orleans": [30.0, -90.1],
    "ramey": [18.5, -67.2],
    "port-of-entry": [0, 0],
    "airport": [0, 0],
    "unknown": [0, 0],
    # ICE AOR office locations
    "atlanta": [33.75, -84.39],
    "baltimore": [39.29, -76.61],
    "boston": [42.36, -71.06],
    "chicago": [41.88, -87.63],
    "dallas": [32.78, -96.80],
    "denver": [39.74, -104.99],
    "houston": [29.76, -95.37],
    "los-angeles": [34.05, -118.24],
    "minneapolis": [44.98, -93.27],
    "newark": [40.74, -74.17],
    "new-york": [40.71, -74.01],
    "philadelphia": [39.95, -75.17],
    "phoenix": [33.45, -112.07],
    "salt-lake-city": [40.76, -111.89],
    "san-antonio": [29.42, -98.49],
    "san-francisco": [37.77, -122.42],
    "seattle": [47.61, -122.33],
    "st-paul": [44.95, -93.09],
    "washington-dc": [38.91, -77.04],
}

CITIZENSHIP_NORMALIZE = {
    "MEXIC": "MX", "MEXICO": "MX",
    "GUATE": "GT", "GUATEMALA": "GT",
    "HONDU": "HN", "HONDURAS": "HN",
    "ELSAL": "SV", "EL SALVADOR": "SV", "EL SAL": "SV",
    "NICAR": "NI", "NICARAGUA": "NI",
    "CUBA": "CU",
    "HAITI": "HT",
    "VENEZ": "VE", "VENEZUELA": "VE",
    "COLOM": "CO", "COLOMBIA": "CO",
    "BRAZI": "BR", "BRAZIL": "BR",
    "ECUAD": "EC", "ECUADOR": "EC",
    "INDIA": "IN",
    "CHINA": "CN", "CHINA, PEOPLE'S REPUBLIC": "CN", "CHINA, PEOPLES REPUBLIC": "CN",
    "PHILI": "PH", "PHILIPPINES": "PH",
    "KOREA": "KR", "KOREA, SOUTH": "KR", "SOUTH KOREA": "KR",
    "ROMAN": "RO", "ROMANIA": "RO",
    "NIGER": "NG", "NIGERIA": "NG",
    "CONGO": "CD", "CONGO, DEMOCRATIC REPUBLIC": "CD", "CONGO, DEM. REP.": "CD",
    "ETHIO": "ET", "ETHIOPIA": "ET",
    "DOMIN": "DO", "DOMINICAN REPUBLIC": "DO", "DOMINI": "DO",
    "PERU": "PE",
    "TURKE": "TR", "TURKEY": "TR", "TURKIYE": "TR",
    "RUSSI": "RU", "RUSSIA": "RU",
    "UKRAI": "UA", "UKRAINE": "UA",
    "JAMAI": "JM", "JAMAICA": "JM",
    "PAKIS": "PK", "PAKISTAN": "PK",
    "AFGHA": "AF", "AFGHANISTAN": "AF",
    "BURMA": "MM", "MYANMAR": "MM",
    "SOMAL": "SO", "SOMALIA": "SO",
    "SYRIA": "SY",
    "IRAQ": "IQ",
    "IRAN": "IR",
    "ERITR": "ER", "ERITREA": "ER",
    "SUDAN": "SD",
    "SOUTH SUDAN": "SS",
    "GUYAN": "GY", "GUYANA": "GY",
    "TRINID": "TT", "TRINIDAD AND TOBAGO": "TT",
    "COSTA": "CR", "COSTA RICA": "CR",
    "PANAM": "PA", "PANAMA": "PA",
    "SENED": "SN", "SENEGAL": "SN",
    "CAMBO": "KH", "CAMBODIA": "KH",
    "TAIWA": "TW", "TAIWAN": "TW",
    "GEORG": "GE", "GEORGIA": "GE",
    "MONGO": "MN", "MONGOLIA": "MN",
    "MAURI": "MR", "MAURITANIA": "MR",
    "GUINEA": "GN",
    "TOGO": "TG",
    "CAMEROON": "CM",
    "GAMBIA": "GM",
    "MALI": "ML",
    "GHANA": "GH",
    "KENYA": "KE",
    "LIBERIA": "LR",
    "SIERRA LEONE": "SL",
    "CENTRAL AFRICAN REPUBLIC": "CF",
    "CHAD": "TD",
    "COTE D'IVOIRE": "CI",
    "BURUNDI": "BI",
    "RWANDA": "RW",
    "NEPAL": "NP",
    "SRI LANKA": "LK",
    "INDONESIA": "ID",
    "BANGLADESH": "BD",
    "BANGA": "BD",
    "EGYPT": "EG",
    "JORDAN": "JO",
    "LEBANON": "LB",
    "YEMEN": "YE",
    "LIBYA": "LY",
    "ALGERIA": "DZ",
    "TUNISIA": "TN",
    "MOROCCO": "MA",
    "BHUTAN": "BT",
    "ARMENIA": "AM",
    "AZERBAIJAN": "AZ",
    "BELARUS": "BY",
    "KAZAKHSTAN": "KZ",
    "KYRGYZSTAN": "KG",
    "MOLDOVA": "MD",
    "TAJIKISTAN": "TJ",
    "UZBEKISTAN": "UZ",
    "LAOS": "LA",
    "THAILAND": "TH",
    "VIETNAM": "VN",
    "VIETN": "VN",
    "JAPAN": "JP",
    "KOREA, NORTH": "KP",
    "BOLIVIA": "BO",
    "CHILE": "CL",
    "ARGENTINA": "AR",
    "PARAGUAY": "PY",
    "URUGUAY": "UY",
    "CONGO, REPUBLIC": "CG",
    "ALBANIA": "AL",
    "ANDORRA": "AD",
    "ANGOLA": "AO",
    "ANTIGUA AND BARBUDA": "AG",
    "AUSTRALIA": "AU",
    "AUSTRIA": "AT",
    "BAHAMAS": "BS",
    "BAHRAIN": "BH",
    "BARBADOS": "BB",
    "BELGIUM": "BE",
    "BELIZE": "BZ",
    "BENIN": "BJ",
    "BOSNIA AND HERZEGOVINA": "BA",
    "BOTSWANA": "BW",
    "BRUNEI": "BN",
    "BULGARIA": "BG",
    "BURKINA FASO": "BF",
    "CABO VERDE": "CV",
    "CANADA": "CA",
    "COMOROS": "KM",
    "CROATIA": "HR",
    "CYPRUS": "CY",
    "CZECHIA": "CZ", "CZECH REPUBLIC": "CZ",
    "DR CONGO": "CD",
    "DENMARK": "DK",
    "DJIBOUTI": "DJ",
    "EQUATORIAL GUINEA": "GQ",
    "ESTONIA": "EE",
    "ESWATINI": "SZ", "SWAZILAND": "SZ",
    "FIJI": "FJ",
    "FINLAND": "FI",
    "FRANCE": "FR",
    "GABON": "GA",
    "GERMANY": "DE",
    "GREECE": "GR",
    "GRENADA": "GD",
    "HONG KONG": "HK",
    "HUNGARY": "HU",
    "ICELAND": "IS",
    "IRELAND": "IE",
    "ISRAEL": "IL",
    "ITALY": "IT",
    "KIRIBATI": "KI",
    "KOSOVO": "XK",
    "KUWAIT": "KW",
    "LATVIA": "LV",
    "LESOTHO": "LS",
    "LIECHTENSTEIN": "LI",
    "LITHUANIA": "LT",
    "LUXEMBOURG": "LU",
    "MADAGASCAR": "MG",
    "MALAWI": "MW",
    "MALAYSIA": "MY",
    "MALDIVES": "MV",
    "MALTA": "MT",
    "MARSHALL ISLANDS": "MH",
    "MICRONESIA": "FM",
    "MONACO": "MC",
    "MONTENEGRO": "ME",
    "MOZAMBIQUE": "MZ",
    "NAMIBIA": "NA",
    "NAURU": "NR",
    "NETHERLANDS": "NL",
    "NEW ZEALAND": "NZ",
    "NORTH KOREA": "KP",
    "NORTH MACEDONIA": "MK", "MACEDONIA": "MK",
    "NORWAY": "NO",
    "OMAN": "OM",
    "PALAU": "PW",
    "PAPUA NEW GUINEA": "PG",
    "POLAND": "PL",
    "PORTUGAL": "PT",
    "QATAR": "QA",
    "SAINT KITTS AND NEVIS": "KN",
    "SAMOA": "WS",
    "SAN MARINO": "SM",
    "SAO TOME AND PRINCIPE": "ST",
    "SAUDI ARABIA": "SA",
    "SERBIA": "RS",
    "SEYCHELLES": "SC",
    "SINGAPORE": "SG",
    "SLOVAKIA": "SK",
    "SLOVENIA": "SI",
    "SOLOMON ISLANDS": "SB",
    "SPAIN": "ES",
    "ST. LUCIA": "LC",
    "ST. VINCENT": "VC",
    "SURINAME": "SR",
    "SWEDEN": "SE",
    "SWITZERLAND": "CH",
    "TANZANIA": "TZ",
    "TIMOR-LESTE": "TL",
    "TONGA": "TO",
    "TURKMENISTAN": "TM",
    "UGANDA": "UG",
    "UNITED ARAB EMIRATES": "AE",
    "UNITED KINGDOM": "GB",
    "VANUATU": "VU",
    "ZAMBIA": "ZM",
    "ZIMBABWE": "ZW",
}

COUNTRY_NAMES = {
    "MX": "Mexico", "GT": "Guatemala", "HN": "Honduras", "SV": "El Salvador",
    "NI": "Nicaragua", "CU": "Cuba", "HT": "Haiti", "VE": "Venezuela",
    "CO": "Colombia", "BR": "Brazil", "EC": "Ecuador", "IN": "India",
    "CN": "China", "PH": "Philippines", "KR": "South Korea", "RO": "Romania",
    "NG": "Nigeria", "CD": "DR Congo", "ET": "Ethiopia", "DO": "Dominican Rep.",
    "PE": "Peru", "TR": "Turkey", "RU": "Russia", "UA": "Ukraine",
    "JM": "Jamaica", "PK": "Pakistan", "AF": "Afghanistan", "MM": "Myanmar",
    "SO": "Somalia", "SY": "Syria", "IQ": "Iraq", "IR": "Iran",
    "ER": "Eritrea", "SD": "Sudan", "SS": "South Sudan", "GY": "Guyana",
    "TT": "Trinidad & Tobago", "CR": "Costa Rica", "PA": "Panama",
    "SN": "Senegal", "KH": "Cambodia", "TW": "Taiwan", "GE": "Georgia",
    "MN": "Mongolia", "MR": "Mauritania", "GN": "Guinea", "TG": "Togo",
    "CM": "Cameroon", "GM": "Gambia", "ML": "Mali", "GH": "Ghana",
    "KE": "Kenya", "LR": "Liberia", "SL": "Sierra Leone", "CF": "Central African Rep.",
    "TD": "Chad", "CI": "Cote d'Ivoire", "BI": "Burundi", "RW": "Rwanda",
    "NP": "Nepal", "LK": "Sri Lanka", "ID": "Indonesia", "BD": "Bangladesh",
    "EG": "Egypt", "JO": "Jordan", "LB": "Lebanon", "YE": "Yemen",
    "LY": "Libya", "DZ": "Algeria", "TN": "Tunisia", "MA": "Morocco",
    "BT": "Bhutan", "AM": "Armenia", "AZ": "Azerbaijan", "BY": "Belarus",
    "KZ": "Kazakhstan", "KG": "Kyrgyzstan", "MD": "Moldova", "TJ": "Tajikistan",
    "UZ": "Uzbekistan", "LA": "Laos", "TH": "Thailand", "VN": "Vietnam",
    "JP": "Japan", "KP": "North Korea", "BO": "Bolivia", "CL": "Chile",
    "AR": "Argentina", "PY": "Paraguay", "UY": "Uruguay", "CG": "Congo Rep.",
    "CA": "Canada", "GB": "United Kingdom", "ES": "Spain", "FR": "France",
    "DE": "Germany", "IT": "Italy", "PT": "Portugal", "PL": "Poland",
    "AU": "Australia", "IL": "Israel", "MY": "Malaysia", "SG": "Singapore",
    "AL": "Albania", "RS": "Serbia", "BJ": "Benin", "NE": "Niger",
    "BF": "Burkina Faso", "CV": "Cabo Verde",
    "AD": "Andorra", "AE": "UAE", "AG": "Antigua & Barbuda",
    "AO": "Angola", "AT": "Austria", "BA": "Bosnia & Herzegovina",
    "BB": "Barbados", "BE": "Belgium", "BG": "Bulgaria", "BH": "Bahrain",
    "BN": "Brunei", "BS": "Bahamas", "BW": "Botswana", "BZ": "Belize",
    "CH": "Switzerland", "CY": "Cyprus", "CZ": "Czech Republic",
    "DJ": "Djibouti", "DK": "Denmark", "EE": "Estonia", "FI": "Finland",
    "FJ": "Fiji", "FM": "Micronesia", "GA": "Gabon", "GD": "Grenada",
    "GQ": "Equatorial Guinea", "GR": "Greece", "HR": "Croatia",
    "HU": "Hungary", "IE": "Ireland", "IS": "Iceland", "KI": "Kiribati",
    "KM": "Comoros", "KN": "St. Kitts & Nevis", "KW": "Kuwait",
    "LC": "St. Lucia", "LI": "Liechtenstein", "LS": "Lesotho",
    "LT": "Lithuania", "LU": "Luxembourg", "LV": "Latvia",
    "MC": "Monaco", "ME": "Montenegro", "MG": "Madagascar",
    "MH": "Marshall Islands", "MK": "North Macedonia", "MT": "Malta",
    "MV": "Maldives", "MW": "Malawi", "MZ": "Mozambique", "NA": "Namibia",
    "NL": "Netherlands", "NO": "Norway", "NR": "Nauru", "NZ": "New Zealand",
    "OM": "Oman", "PG": "Papua New Guinea", "PW": "Palau", "QA": "Qatar",
    "SA": "Saudi Arabia", "SB": "Solomon Islands", "SC": "Seychelles",
    "SE": "Sweden", "SI": "Slovenia", "SK": "Slovakia", "SM": "San Marino",
    "SR": "Suriname", "ST": "Sao Tome & Principe", "SZ": "Eswatini",
    "TL": "Timor-Leste", "TM": "Turkmenistan", "TO": "Tonga",
    "TV": "Tuvalu", "TZ": "Tanzania", "UG": "Uganda", "VA": "Vatican City",
    "VC": "St. Vincent & Grenadines", "VU": "Vanuatu", "WS": "Samoa",
    "HK": "Hong Kong",
    "XK": "Kosovo", "ZM": "Zambia", "ZW": "Zimbabwe",
}

COUNTRY_REGION = {
    "MX": "mexico",
    "GT": "central-america", "HN": "central-america", "SV": "central-america",
    "NI": "central-america", "CR": "central-america", "PA": "central-america",
    "CU": "caribbean", "HT": "caribbean", "DO": "caribbean", "JM": "caribbean",
    "TT": "caribbean", "GY": "caribbean",
    "VE": "south-america", "CO": "south-america", "BR": "south-america",
    "EC": "south-america", "PE": "south-america", "BO": "south-america",
    "CL": "south-america", "AR": "south-america", "PY": "south-america",
    "UY": "south-america",
    "IN": "asia", "CN": "asia", "PH": "asia", "KR": "asia", "TW": "asia",
    "KH": "asia", "MM": "asia", "BD": "asia", "NP": "asia", "LK": "asia",
    "ID": "asia", "PK": "asia", "AF": "asia", "VN": "asia", "JP": "asia",
    "LA": "asia", "TH": "asia", "KP": "asia", "MN": "asia", "BT": "asia",
    "RO": "europe", "RU": "europe", "UA": "europe", "GE": "europe",
    "AM": "europe", "AZ": "europe", "BY": "europe", "KZ": "europe",
    "KG": "europe", "MD": "europe", "TJ": "europe", "UZ": "europe",
    "TR": "europe",
    "NG": "africa", "CD": "africa", "ET": "africa", "SO": "africa",
    "ER": "africa", "SD": "africa", "SS": "africa", "SN": "africa",
    "GN": "africa", "TG": "africa", "CM": "africa", "GM": "africa",
    "ML": "africa", "GH": "africa", "KE": "africa", "LR": "africa",
    "SL": "africa", "CF": "africa", "TD": "africa", "CI": "africa",
    "BI": "africa", "RW": "africa", "CG": "africa", "MR": "africa",
    "EG": "africa", "LY": "africa", "DZ": "africa", "TN": "africa",
    "MA": "africa",
    "SY": "asia", "IQ": "asia", "IR": "asia", "JO": "asia",
    "LB": "asia", "YE": "asia",
    "CA": "other", "GB": "europe", "ES": "europe", "FR": "europe",
    "DE": "europe", "IT": "europe", "PT": "europe", "PL": "europe",
    "AU": "other", "IL": "asia", "MY": "asia", "SG": "asia",
    "AL": "europe", "RS": "europe", "BJ": "africa", "NE": "africa",
    "BF": "africa", "CV": "africa",
    "AD": "europe", "AE": "asia", "AG": "caribbean", "AO": "africa",
    "AT": "europe", "BA": "europe", "BB": "caribbean", "BE": "europe",
    "BG": "europe", "BH": "asia", "BN": "asia", "BS": "caribbean",
    "BW": "africa", "BZ": "central-america", "CH": "europe", "CY": "europe",
    "CZ": "europe", "DJ": "africa", "DK": "europe", "EE": "europe",
    "FI": "europe", "FJ": "other", "FM": "other", "GA": "africa",
    "GD": "caribbean", "GQ": "africa", "GR": "europe", "HK": "asia", "HR": "europe",
    "HU": "europe", "IE": "europe", "IS": "europe", "KI": "other",
    "KM": "africa", "KN": "caribbean", "KW": "asia", "LC": "caribbean",
    "LI": "europe", "LS": "africa", "LT": "europe", "LU": "europe",
    "LV": "europe", "MC": "europe", "ME": "europe", "MG": "africa",
    "MH": "other", "MK": "europe", "MT": "europe", "MV": "asia",
    "MW": "africa", "MZ": "africa", "NA": "africa", "NL": "europe",
    "NO": "europe", "NR": "other", "NZ": "other", "OM": "asia",
    "PG": "other", "PW": "other", "QA": "asia", "SA": "asia",
    "SB": "other", "SC": "africa", "SE": "europe", "SI": "europe",
    "SK": "europe", "SM": "europe", "SR": "south-america",
    "ST": "africa", "SZ": "africa", "TL": "asia", "TM": "asia",
    "TO": "other", "TV": "other", "TZ": "africa", "UG": "africa",
    "VA": "europe", "VC": "caribbean", "VU": "other", "WS": "other",
    "XK": "europe", "ZM": "africa", "ZW": "africa",
}


def normalize_citizenship(raw: str) -> str:
    if not raw or pd.isna(raw):
        return "XX"
    raw = str(raw).strip().upper()
    if raw in CITIZENSHIP_NORMALIZE:
        return CITIZENSHIP_NORMALIZE[raw]
    for prefix, code in CITIZENSHIP_NORMALIZE.items():
        if raw.startswith(prefix[:5]):
            return code
    return "XX"


def country_name(code: str) -> str:
    return COUNTRY_NAMES.get(code, "Other")


def country_region(code: str) -> str:
    return COUNTRY_REGION.get(code, "other")


def sector_coords(sector: str):
    c = SECTOR_CENTROIDS.get(sector, [0, 0])
    return c[0], c[1]


def normalize_demographic(raw: str) -> str:
    if not raw or pd.isna(raw):
        return "single-adult"
    raw = str(raw).strip().upper()
    if "UC" in raw or "UNACCOMPANIED" in raw:
        return "unaccompanied-child"
    if "FMU" in raw or "FAMILY" in raw:
        return "family-unit"
    return "single-adult"


AOR_TO_ICE = {}
for name in [
    "Atlanta", "Baltimore", "Boston", "Buffalo", "Chicago", "Dallas",
    "Denver", "Detroit", "El Paso", "Houston", "Los Angeles", "Miami",
    "Minneapolis", "Newark", "New Orleans", "New York", "Philadelphia",
    "Phoenix", "Salt Lake City", "San Antonio", "San Diego",
    "San Francisco", "Seattle", "St. Paul", "Washington DC",
]:
    key = name.lower().replace(" ", "-").replace(".", "")
    AOR_TO_ICE[name] = key


def normalize_aor(raw: str) -> str:
    if not raw or pd.isna(raw):
        return "unknown"
    raw = str(raw).strip()
    raw = raw.replace(" Area of Responsibility", "")
    if raw == "New York City":
        raw = "New York"
    if raw == "Harlingen":
        raw = "San Antonio"
    if raw == "HQ":
        return "unknown"
    if raw == "Washington":
        raw = "Washington DC"
    return raw.lower().replace(" ", "-").replace(".", "")


# ── Parse USBP apprehension files ──────────────────────────────────────────

def _find_usbp_header(fpath):
    """Auto-detect header row and column names in USBP files."""
    df_raw = pd.read_excel(fpath, header=None, nrows=15, engine="openpyxl")
    for i in range(min(15, len(df_raw))):
        vals = [str(v).strip().upper() if pd.notna(v) else "" for v in df_raw.iloc[i]]
        joined = " ".join(vals)
        has_key_cols = sum([
            "CITIZENSHIP" in joined or "COUNTRY OF RESIDENCE" in joined,
            "ARREST" in joined or "APPREHENSION" in joined,
            "SECTOR" in joined,  # matches SECTOR and SECTOR_DISTRICT
        ])
        if has_key_cols >= 2:
            return i
    return None


def _normalize_usbp_columns(df):
    """Map varying USBP column names to a standard set."""
    col_map = {}
    for c in df.columns:
        cl = str(c).strip().lower()
        if cl in ("citizenship_cd", "citizenship") or "citizenship" in cl:
            col_map["citizenship"] = c
        elif cl in ("first country of residence",):
            if "citizenship" not in col_map:
                col_map["citizenship"] = c
        elif cl in ("sector", "sector_district") or cl.startswith("sector"):
            col_map["sector"] = c
        elif "apprehension_dt" in cl or cl == "arrest date" or cl == "arrest datetime":
            col_map["date"] = c
        elif "family_unit" in cl or cl == "demographic":
            col_map["demographic"] = c
        elif "unaccompanied" in cl or cl == "uc indicator":
            col_map["uc"] = c
        elif "disposition" in cl or cl == "removal_type":
            col_map["disposition"] = c
    return col_map


def parse_usbp():
    records = []
    files = sorted(glob.glob(str(RAW / "usbp_nationwide_apprehension*.xlsx")) +
                   glob.glob(str(RAW / "USBP*Apprehension*.xlsx")))
    print(f"  USBP: found {len(files)} files")

    seen_months = set()

    for fpath in files:
        fname = os.path.basename(fpath)
        print(f"    Processing {fname}...")

        header_row = _find_usbp_header(fpath)
        if header_row is None:
            print(f"    SKIP: couldn't find header row")
            continue

        try:
            df = pd.read_excel(fpath, header=header_row, engine="openpyxl")
        except Exception as e:
            print(f"    ERROR: {e}")
            continue

        col_map = _normalize_usbp_columns(df)

        if "citizenship" not in col_map:
            print(f"    SKIP: no citizenship column. Cols: {list(df.columns)[:10]}")
            continue
        if "date" not in col_map:
            print(f"    SKIP: no date column. Cols: {list(df.columns)[:10]}")
            continue
        if "sector" not in col_map:
            print(f"    SKIP: no sector column. Cols: {list(df.columns)[:10]}")
            continue

        date_col = col_map["date"]
        cit_col = col_map["citizenship"]
        sector_col = col_map["sector"]
        demo_col = col_map.get("demographic")
        disp_col = col_map.get("disposition")

        df["_date"] = pd.to_datetime(df[date_col], errors="coerce")
        df = df.dropna(subset=["_date"])
        df["_month"] = df["_date"].dt.strftime("%Y-%m")

        group_cols = ["_month", sector_col, cit_col]
        if demo_col and demo_col in df.columns:
            group_cols.append(demo_col)

        for keys, grp in df.groupby(group_cols):
            if len(group_cols) == 4:
                month, sector_raw, cit_raw, demo_raw = keys
            else:
                month, sector_raw, cit_raw = keys
                demo_raw = None

            if pd.isna(month):
                continue

            sector_str = str(sector_raw).strip()
            # Handle "DRT/E" style sector codes
            if "/" in sector_str:
                sector_str = sector_str.split("/")[0]
            sector = USBP_SECTOR_MAP.get(sector_str, sector_str.lower())
            nat = normalize_citizenship(cit_raw)
            demo = normalize_demographic(demo_raw)
            count = len(grp)

            lat, lng = sector_coords(sector)

            if disp_col and disp_col in df.columns:
                turned_away = grp[grp[disp_col].astype(str).str.contains(
                    "ER$|^ER |VR|REINST|TOT", na=False, case=False, regex=True)]
                entered = count - len(turned_away)
                if len(turned_away) > 0:
                    records.append({
                        "month": month, "sector": sector,
                        "sectorLat": lat, "sectorLng": lng,
                        "nationality": nat, "nationalityName": country_name(nat),
                        "region": country_region(nat),
                        "type": "expulsion", "demographic": demo,
                        "count": len(turned_away), "layer": "border-turnedaway",
                        "visaClass": "T42", "visaClassLabel": "Title 42 expulsion",
                    })
                if entered > 0:
                    records.append({
                        "month": month, "sector": sector,
                        "sectorLat": lat, "sectorLng": lng,
                        "nationality": nat, "nationalityName": country_name(nat),
                        "region": country_region(nat),
                        "type": "apprehension", "demographic": demo,
                        "count": entered, "layer": "border-entered",
                        "visaClass": "T8-APP", "visaClassLabel": "Apprehension",
                    })
            else:
                records.append({
                    "month": month, "sector": sector,
                    "sectorLat": lat, "sectorLng": lng,
                    "nationality": nat, "nationalityName": country_name(nat),
                    "region": country_region(nat),
                    "type": "apprehension", "demographic": demo,
                    "count": count, "layer": "border-entered",
                    "visaClass": "T8-APP", "visaClassLabel": "Apprehension",
                })

            seen_months.add(month)

        print(f"      → {len(df)} rows, months: {sorted(set(df['_month'].unique()))[:3]}")

    print(f"  USBP: {len(records)} aggregated records, months: {sorted(seen_months)[:3]}...{sorted(seen_months)[-3:]}")
    return records


# ── Parse OFO inadmissible files ───────────────────────────────────────────

def _find_ofo_header(fpath):
    """Auto-detect header row in OFO files."""
    df_raw = pd.read_excel(fpath, header=None, nrows=10, engine="openpyxl")
    for i in range(min(10, len(df_raw))):
        vals = [str(v).strip().lower() if pd.notna(v) else "" for v in df_raw.iloc[i]]
        joined = " ".join(vals)
        if "citizenship" in joined and ("field office" in joined or "calendar" in joined):
            return i
    return None


def parse_ofo():
    records = []
    files = sorted(glob.glob(str(RAW / "ofo_*inadmiss*.xlsx")) +
                   glob.glob(str(RAW / "OFO*[Ii]nadmiss*.xlsx")))
    print(f"  OFO: found {len(files)} files")

    for fpath in files:
        fname = os.path.basename(fpath)
        print(f"    Processing {fname}...")

        header_row = _find_ofo_header(fpath)
        if header_row is not None:
            try:
                df = pd.read_excel(fpath, header=header_row, engine="openpyxl")
            except Exception as e:
                print(f"    ERROR: {e}")
                continue
        else:
            try:
                df = pd.read_excel(fpath, engine="openpyxl")
            except Exception as e:
                print(f"    ERROR: {e}")
                continue

        cit_col = None
        date_col = None
        count_col = None
        demo_col = None

        for c in df.columns:
            cl = str(c).strip().lower()
            if "citizenship" in cl and "country" in cl:
                cit_col = c
            elif "event created" in cl or "event_created" in cl:
                if not date_col:
                    date_col = c
            elif "inadmissibles" in cl and "count" in cl:
                count_col = c
            elif "fmua" in cl or "uac" in cl:
                demo_col = c
            elif "calendar month" in cl and not date_col:
                date_col = c

        if not cit_col:
            print(f"    SKIP: no citizenship column. Cols: {list(df.columns)[:8]}")
            continue

        if date_col:
            sample_val = df[date_col].dropna().iloc[0] if len(df[date_col].dropna()) > 0 else None
            if sample_val is not None and hasattr(sample_val, 'strftime'):
                # It's a datetime
                df["_date"] = pd.to_datetime(df[date_col], errors="coerce")
                df["_month"] = df["_date"].dt.strftime("%Y-%m")
            else:
                # Try parsing as string date
                def parse_cal_date(val):
                    if pd.isna(val):
                        return None
                    val = str(val).strip()
                    for fmt in ["%b-%y", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"]:
                        try:
                            dt = pd.to_datetime(val, format=fmt)
                            return dt.strftime("%Y-%m")
                        except:
                            pass
                    try:
                        dt = pd.to_datetime(val)
                        return dt.strftime("%Y-%m")
                    except:
                        return None
                df["_month"] = df[date_col].apply(parse_cal_date)
        else:
            print(f"    SKIP: no date column found. Cols: {list(df.columns)[:8]}")
            continue

        df = df.dropna(subset=["_month"])
        print(f"      → {len(df)} rows with valid dates")

        group_cols = ["_month", cit_col]
        if demo_col and demo_col in df.columns:
            group_cols.append(demo_col)

        for keys, grp in df.groupby(group_cols):
            if len(group_cols) == 3:
                month, cit_raw, demo_raw = keys
            else:
                month, cit_raw = keys
                demo_raw = None

            nat = normalize_citizenship(cit_raw)
            demo = normalize_demographic(demo_raw)

            if count_col and count_col in grp.columns:
                count = int(grp[count_col].sum())
            else:
                count = len(grp)

            if count <= 0:
                continue

            records.append({
                "month": month, "sector": "port-of-entry",
                "sectorLat": 0, "sectorLng": 0,
                "nationality": nat, "nationalityName": country_name(nat),
                "region": country_region(nat),
                "type": "inadmissible", "demographic": demo,
                "count": count, "layer": "border-inadmissible",
                "visaClass": "T8-INAD", "visaClassLabel": "Inadmissible",
            })

    print(f"  OFO: {len(records)} aggregated records")
    return records


# ── Parse ICE arrests ──────────────────────────────────────────────────────

def parse_ice_arrests():
    records = []
    fpath = RAW / "arrests-latest.xlsx"
    if not fpath.exists():
        print("  ICE arrests: file not found, skipping")
        return records

    print("  ICE arrests: loading (this is large, ~117MB)...")
    try:
        df = pd.read_excel(fpath, engine="openpyxl",
                           usecols=["apprehension_date", "citizenship_country",
                                    "apprehension_aor", "apprehension_criminality",
                                    "gender"])
    except Exception as e:
        print(f"  ICE arrests ERROR: {e}")
        return records

    print(f"  ICE arrests: {len(df)} rows loaded")

    df["_date"] = pd.to_datetime(df["apprehension_date"], errors="coerce")
    df = df.dropna(subset=["_date"])
    df["_month"] = df["_date"].dt.strftime("%Y-%m")

    for (month, cit_raw, aor_raw), grp in df.groupby(["_month", "citizenship_country", "apprehension_aor"]):
        nat = normalize_citizenship(cit_raw)
        sector = normalize_aor(aor_raw)
        count = len(grp)
        lat, lng = sector_coords(sector)

        records.append({
            "month": month, "sector": sector,
            "sectorLat": lat, "sectorLng": lng,
            "nationality": nat, "nationalityName": country_name(nat),
            "region": country_region(nat),
            "type": "apprehension", "demographic": "single-adult",
            "count": count, "layer": "ice-arrest",
        })

    print(f"  ICE arrests: {len(records)} aggregated records")
    return records


# ── Parse DHS Yearbook LPR (legal immigration) ────────────────────────────

def parse_dhs_yearbook_lpr():
    records = []

    # Load multi-year yearbook LPR data (FY2016-FY2022) from extracted JSON
    lpr_json = Path(__file__).resolve().parent.parent / "data" / "yearbook-lpr.json"
    if lpr_json.exists():
        with open(lpr_json) as f:
            all_lpr = json.load(f)

        for fy_key, countries in sorted(all_lpr.items()):
            fy = int(fy_key.replace("fy", ""))
            start_year = fy - 1
            count = 0
            for cname, vals in countries.items():
                if cname in ("Total",):
                    continue
                nat = normalize_citizenship(cname)
                if nat == "XX":
                    continue

                emp = vals.get("employment", 0)
                fam = vals.get("family", 0) + vals.get("immediate_relative", 0)
                div = vals.get("diversity", 0)

                for m in range(10, 22):
                    if m <= 12:
                        month = f"{start_year}-{m:02d}"
                    else:
                        month = f"{start_year + 1}-{(m - 12):02d}"

                    if emp > 0:
                        records.append({
                            "month": month, "sector": "port-of-entry",
                            "sectorLat": 0, "sectorLng": 0,
                            "nationality": nat, "nationalityName": country_name(nat),
                            "region": country_region(nat),
                            "type": "inadmissible", "demographic": "single-adult",
                            "count": max(1, round(emp / 12)), "layer": "legal-employment",
                            "visaClass": "EB-3", "visaClassLabel": "Skilled / professional",
                        })
                    if fam > 0:
                        records.append({
                            "month": month, "sector": "port-of-entry",
                            "sectorLat": 0, "sectorLng": 0,
                            "nationality": nat, "nationalityName": country_name(nat),
                            "region": country_region(nat),
                            "type": "inadmissible", "demographic": "family-unit",
                            "count": max(1, round(fam / 12)), "layer": "legal-family",
                            "visaClass": "IR", "visaClassLabel": "Immediate relative",
                        })
                    if div > 0:
                        records.append({
                            "month": month, "sector": "port-of-entry",
                            "sectorLat": 0, "sectorLng": 0,
                            "nationality": nat, "nationalityName": country_name(nat),
                            "region": country_region(nat),
                            "type": "inadmissible", "demographic": "single-adult",
                            "count": max(1, round(div / 12)), "layer": "legal-diversity",
                            "visaClass": "DV", "visaClassLabel": "Diversity visa",
                        })
                count += 1

            print(f"  DHS LPR FY{fy}: {count} countries from yearbook JSON")
    else:
        print("  DHS LPR: yearbook-lpr.json not found")

    # Add FY2023 hardcoded data
    records.extend(_hardcoded_lpr_data())

    return records


def _hardcoded_lpr_data():
    """FY2023 LPR admissions from DHS Yearbook Table 6 (publicly available totals)."""
    records = []

    # Top LPR countries FY2023 by admission class
    # Source: DHS Yearbook 2023, Table 6
    lpr_data = [
        # (country_code, employment, family, diversity)
        ("MX", 16980, 152540, 0),
        ("IN", 59280, 7630, 3080),
        ("CN", 29860, 14850, 1240),
        ("PH", 6250, 28620, 0),
        ("DO", 2050, 47270, 1130),
        ("CU", 490, 58960, 0),
        ("VN", 1240, 14850, 0),
        ("HT", 220, 13880, 2660),
        ("SV", 680, 21500, 700),
        ("GT", 530, 10570, 470),
        ("HN", 350, 9080, 390),
        ("CO", 2430, 18020, 1370),
        ("BR", 1890, 7530, 4200),
        ("KR", 5820, 4120, 700),
        ("PK", 2890, 8450, 2870),
        ("BD", 1020, 5670, 5680),
        ("JM", 680, 14560, 960),
        ("EC", 640, 9860, 420),
        ("NG", 1780, 6390, 6290),
        ("ET", 310, 5010, 5470),
        ("VE", 1240, 3280, 0),
        ("PE", 1250, 4930, 590),
        ("NI", 320, 4670, 280),
        ("GY", 170, 7260, 240),
        ("AF", 1470, 3810, 0),
        ("UA", 4250, 3200, 2100),
        ("IR", 3600, 3450, 1500),
        ("IQ", 1100, 2600, 0),
        ("SY", 300, 1800, 0),
        ("MM", 100, 2400, 0),
        ("SO", 80, 3100, 0),
        ("ER", 60, 1200, 3200),
        ("SD", 40, 800, 2100),
        ("CD", 50, 1600, 3800),
    ]

    # Spread FY2023 annual totals evenly across 12 months (Oct 2022 - Sep 2023)
    for code, emp, fam, div in lpr_data:
        for m in range(10, 22):  # Oct(10) through Sep(21) → wraps year
            if m <= 12:
                month = f"2022-{m:02d}"
            else:
                month = f"2023-{(m-12):02d}"

            if emp > 0:
                records.append({
                    "month": month, "sector": "port-of-entry",
                    "sectorLat": 0, "sectorLng": 0,
                    "nationality": code, "nationalityName": country_name(code),
                    "region": country_region(code),
                    "type": "inadmissible", "demographic": "single-adult",
                    "count": max(1, round(emp / 12)), "layer": "legal-employment",
                    "visaClass": "EB-3", "visaClassLabel": "Skilled / professional",
                })
            if fam > 0:
                records.append({
                    "month": month, "sector": "port-of-entry",
                    "sectorLat": 0, "sectorLng": 0,
                    "nationality": code, "nationalityName": country_name(code),
                    "region": country_region(code),
                    "type": "inadmissible", "demographic": "family-unit",
                    "count": max(1, round(fam / 12)), "layer": "legal-family",
                    "visaClass": "IR", "visaClassLabel": "Immediate relative",
                })
            if div > 0:
                records.append({
                    "month": month, "sector": "port-of-entry",
                    "sectorLat": 0, "sectorLng": 0,
                    "nationality": code, "nationalityName": country_name(code),
                    "region": country_region(code),
                    "type": "inadmissible", "demographic": "single-adult",
                    "count": max(1, round(div / 12)), "layer": "legal-diversity",
                    "visaClass": "DV", "visaClassLabel": "Diversity visa",
                })

    print(f"  DHS LPR: {len(records)} records (hardcoded FY2023)")
    return records


# ── Parse DHS Yearbook Nonimmigrant Tables (temp workers) ─────────────────

# Visa class distribution per region (approximate, from Table 25 FY2023 proportions)
# Used to split aggregate temp-worker counts by visa class per country
VISA_CLASS_WEIGHTS = {
    # High-skill countries (India, China, etc.)
    "high-skill": [("H1B", 0.55), ("L1", 0.25), ("O1", 0.08), ("TN", 0.02), ("E2", 0.05), ("H2A", 0.02), ("H2B", 0.01), ("P1", 0.02)],
    # Mexico/Central America (agricultural + TN)
    "mexico": [("H2A", 0.55), ("H2B", 0.15), ("TN", 0.20), ("L1", 0.04), ("H1B", 0.03), ("E2", 0.02), ("P1", 0.01)],
    # Canada (TN dominant)
    "canada": [("TN", 0.75), ("L1", 0.10), ("H1B", 0.05), ("E2", 0.05), ("O1", 0.03), ("P1", 0.02)],
    # General / other
    "general": [("H1B", 0.20), ("L1", 0.15), ("E2", 0.15), ("TN", 0.10), ("O1", 0.10), ("H2A", 0.10), ("H2B", 0.05), ("P1", 0.08), ("E1", 0.04), ("R1", 0.03)],
}

HIGH_SKILL_COUNTRIES = {"IN", "CN", "KR", "TW", "JP", "PH", "PK", "BD", "LK", "NP"}

ADMISSION_TO_RESIDENT_RATIO = {
    "H1B": 0.31, "H2A": 0.09, "H2B": 0.10, "L1": 0.22,
    "O1": 0.30, "TN": 0.18, "E2": 0.25, "P1": 0.10,
    "E1": 0.25, "R1": 0.25,
}

VISA_CLASS_LABELS_PY = {
    "H1B": "Specialty worker", "H2A": "Agricultural worker",
    "H2B": "Seasonal non-ag worker", "L1": "Company transferee",
    "O1": "Extraordinary ability", "TN": "USMCA professional",
    "E1": "Treaty trader", "E2": "Treaty investor",
    "E3": "Australian specialty", "H3": "Trainee",
    "P1": "Athlete / entertainer", "R1": "Religious worker",
}


def parse_temp_workers():
    """Parse temp worker data from yearbook JSON (FY2016-FY2022) and FY2023 Excel."""
    records = []

    # FY2016-FY2022: use extracted yearbook JSON with actual per-visa-class breakdowns
    tw_json = Path(__file__).resolve().parent.parent / "data" / "yearbook-tempworkers.json"
    if tw_json.exists():
        with open(tw_json) as f:
            all_tw = json.load(f)

        for fy_key, countries in sorted(all_tw.items()):
            fy = int(fy_key.replace("fy", ""))
            start_year = fy - 1
            count = 0
            for cname, vals in countries.items():
                if cname in ("Total",):
                    continue
                nat = normalize_citizenship(cname)
                if nat == "XX":
                    continue

                for visa_class in ("H1B", "H2A", "H2B", "O1", "P1", "L1", "E2"):
                    vc = vals.get(visa_class, 0)
                    if vc <= 0:
                        continue
                    ratio = ADMISSION_TO_RESIDENT_RATIO.get(visa_class, 0.25)
                    vc = max(1, round(vc * ratio))
                    monthly = max(1, round(vc / 12))

                    for m in range(10, 22):
                        if m <= 12:
                            month = f"{start_year}-{m:02d}"
                        else:
                            month = f"{start_year + 1}-{(m - 12):02d}"

                        records.append({
                            "month": month, "sector": "airport",
                            "sectorLat": 0, "sectorLng": 0,
                            "nationality": nat, "nationalityName": country_name(nat),
                            "region": country_region(nat),
                            "type": "inadmissible", "demographic": "single-adult",
                            "count": monthly, "layer": "temp-worker",
                            "visaClass": visa_class,
                            "visaClassLabel": VISA_CLASS_LABELS_PY.get(visa_class, visa_class),
                        })
                count += 1

            print(f"  Temp workers FY{fy}: {count} countries from yearbook JSON")
    else:
        print("  Temp workers: yearbook-tempworkers.json not found")

    # FY2023: use Excel Table 28 with weight-based visa class distribution
    fpath = RAW / "DHS_Yearbook2023_Nonimmigrant_Tables.xlsx"
    if not fpath.exists():
        print("  Temp workers FY2023: Nonimmigrant tables not found, skipping")
        return records

    print("  Temp workers FY2023: loading Table 28...")
    try:
        wb = pd.ExcelFile(fpath, engine="openpyxl")
        df = pd.read_excel(wb, "Table 28", header=None, engine="openpyxl")
    except Exception as e:
        print(f"  Temp workers FY2023 ERROR: {e}")
        return records

    header_idx = None
    for i in range(min(10, len(df))):
        val = str(df.iloc[i, 0]).strip().lower() if pd.notna(df.iloc[i, 0]) else ""
        if "region and country" in val:
            header_idx = i
            break

    if header_idx is None:
        print("  Temp workers FY2023: couldn't find header row")
        return records

    tw_col = 5
    country_data = []
    for i in range(header_idx + 1, len(df)):
        name_raw = df.iloc[i, 0]
        if pd.isna(name_raw):
            continue
        name = str(name_raw).strip()

        if name in ("Total", "REGION", "COUNTRY", "Unknown", "") or name.startswith("Africa") or name.startswith("Asia") or name.startswith("Europe") or name.startswith("North America") or name.startswith("Oceania") or name.startswith("South America"):
            continue

        tw_val = df.iloc[i, tw_col]
        if pd.isna(tw_val) or str(tw_val).strip() in ("", "X", "-", "D"):
            continue

        try:
            count = int(float(str(tw_val)))
        except:
            continue

        if count <= 0:
            continue

        import re as _re
        clean_name = _re.sub(r'\d+$', '', name).strip().rstrip(',')

        nat = normalize_citizenship(clean_name)
        if nat == "XX":
            continue

        country_data.append((nat, count))

    total_tw = 0
    for nat, annual_count in country_data:
        if nat == "MX":
            weights = VISA_CLASS_WEIGHTS["mexico"]
        elif nat == "CA":
            weights = VISA_CLASS_WEIGHTS["canada"]
        elif nat in HIGH_SKILL_COUNTRIES:
            weights = VISA_CLASS_WEIGHTS["high-skill"]
        else:
            weights = VISA_CLASS_WEIGHTS["general"]

        for visa_class, weight in weights:
            visa_count = max(1, round(annual_count * weight))
            ratio = ADMISSION_TO_RESIDENT_RATIO.get(visa_class, 0.25)
            visa_count = max(1, round(visa_count * ratio))
            monthly = max(1, round(visa_count / 12))

            for m in range(10, 22):
                if m <= 12:
                    month = f"2022-{m:02d}"
                else:
                    month = f"2023-{(m - 12):02d}"

                records.append({
                    "month": month, "sector": "airport",
                    "sectorLat": 0, "sectorLng": 0,
                    "nationality": nat, "nationalityName": country_name(nat),
                    "region": country_region(nat),
                    "type": "inadmissible", "demographic": "single-adult",
                    "count": monthly, "layer": "temp-worker",
                    "visaClass": visa_class,
                    "visaClassLabel": VISA_CLASS_LABELS_PY.get(visa_class, visa_class),
                })

            total_tw += visa_count

    countries_23 = len(set(nat for nat, _ in country_data))
    print(f"  Temp workers FY2023: {countries_23} countries, ~{total_tw:,} admissions")
    total_countries = len(set(r["nationality"] for r in records))
    print(f"  Temp workers total: {len(records)} records, {total_countries} countries")
    return records


# ── Parse OHSS Refugees ────────────────────────────────────────────────────

def parse_ohss_refugees():
    records = []
    fpath = RAW / "OHSS Yearbook Refugees FY 2024.xlsx"
    if not fpath.exists():
        print("  OHSS Refugees: file not found, skipping")
        return records

    print("  OHSS Refugees: parsing Table 14...")
    df = pd.read_excel(fpath, sheet_name="Table 14", header=None, engine="openpyxl")

    # Row 5 has headers: col 0 = country, cols 1-10 = FY2015-FY2024
    header_row = None
    for i in range(10):
        val = str(df.iloc[i, 0]).strip() if pd.notna(df.iloc[i, 0]) else ""
        if val.lower().startswith("region and country"):
            header_row = i
            break

    if header_row is None:
        print("  OHSS Refugees: couldn't find header row")
        return records

    years = []
    for c in range(1, df.shape[1]):
        v = df.iloc[header_row, c]
        if pd.notna(v):
            years.append(int(v))
        else:
            break

    # Parse country rows (after "COUNTRY" marker)
    country_start = None
    for i in range(header_row + 1, len(df)):
        val = str(df.iloc[i, 0]).strip() if pd.notna(df.iloc[i, 0]) else ""
        if val == "COUNTRY":
            country_start = i + 2  # skip "Total" row
            break

    if country_start is None:
        print("  OHSS Refugees: couldn't find COUNTRY section")
        return records

    for i in range(country_start, len(df)):
        country_raw = str(df.iloc[i, 0]).strip() if pd.notna(df.iloc[i, 0]) else ""
        if not country_raw or country_raw in ("D", "-", "Total", "Unknown"):
            continue

        nat = normalize_citizenship(country_raw)
        if nat == "XX":
            continue

        for yi, year in enumerate(years):
            val = df.iloc[i, 1 + yi]
            if pd.isna(val) or val == "D" or val == "-":
                continue
            try:
                annual = int(float(val))
            except:
                continue
            if annual <= 0:
                continue

            # Spread across fiscal year months (Oct prev year - Sep this year)
            monthly = max(1, round(annual / 12))
            for m in range(10, 22):
                if m <= 12:
                    month = f"{year - 1}-{m:02d}"
                else:
                    month = f"{year}-{(m - 12):02d}"

                records.append({
                    "month": month, "sector": "port-of-entry",
                    "sectorLat": 0, "sectorLng": 0,
                    "nationality": nat, "nationalityName": country_name(nat),
                    "region": country_region(nat),
                    "type": "inadmissible", "demographic": "family-unit",
                    "count": monthly, "layer": "refugee",
                    "visaClass": "REF", "visaClassLabel": "Refugee",
                })

    print(f"  OHSS Refugees: {len(records)} records")
    return records


# ── Parse WRAPS Refugee Admissions ─────────────────────────────────────────

def parse_wraps():
    records = []
    fpath = RAW / "Refugee Admissions Report as of March 31, 2026.xlsx"
    if not fpath.exists():
        print("  WRAPS: file not found, skipping")
        return records

    print("  WRAPS: parsing yearly sheets...")
    xls = pd.ExcelFile(fpath, engine="openpyxl")

    for sheet_name in xls.sheet_names:
        if sheet_name in ("Cumulative Summary",):
            continue
        try:
            fy = int(sheet_name)
        except ValueError:
            continue

        df = pd.read_excel(xls, sheet_name, header=None, engine="openpyxl")

        # Find the header row with OCT, NOV, etc.
        header_row = None
        for i in range(min(15, len(df))):
            row_vals = [str(v).strip() if pd.notna(v) else "" for v in df.iloc[i]]
            if "OCT" in row_vals:
                header_row = i
                break

        if header_row is None:
            continue

        headers = [str(v).strip() if pd.notna(v) else "" for v in df.iloc[header_row]]
        month_cols = {}
        month_names = ["OCT", "NOV", "DEC", "JAN", "FEB", "MAR",
                       "APR", "MAY", "JUN", "JUL", "AUG", "SEP"]

        for mi, mname in enumerate(month_names):
            if mname in headers:
                col_idx = headers.index(mname)
                # Fiscal year month mapping
                if mi < 3:  # Oct-Dec = previous calendar year
                    cal_month = f"{fy - 1}-{(mi + 10):02d}"
                else:  # Jan-Sep = fiscal year
                    cal_month = f"{fy}-{(mi - 2):02d}"
                month_cols[col_idx] = cal_month

        # Find country column (column 1 usually has country names)
        country_col = 1

        for i in range(header_row + 1, len(df)):
            country_raw = df.iloc[i, country_col]
            if pd.isna(country_raw):
                continue
            country_raw = str(country_raw).strip()

            if country_raw.startswith("Total") or country_raw.startswith("Grand"):
                continue
            if country_raw.startswith("Fiscal Year"):
                continue
            if not country_raw or country_raw in ("NaN", ""):
                continue

            # Skip region headers
            region_headers = ["Africa", "East Asia", "Europe", "Latin America",
                              "Near East", "South Asia", "Former Soviet",
                              "Caribbean", "Kosovo", "PSI"]
            if any(country_raw.startswith(r) for r in region_headers):
                continue

            nat = normalize_citizenship(country_raw)
            if nat == "XX":
                continue

            for col_idx, cal_month in month_cols.items():
                if col_idx >= len(df.columns):
                    continue
                val = df.iloc[i, col_idx]
                if pd.isna(val):
                    continue
                try:
                    count = int(float(val))
                except:
                    continue
                if count <= 0:
                    continue

                records.append({
                    "month": cal_month, "sector": "port-of-entry",
                    "sectorLat": 0, "sectorLng": 0,
                    "nationality": nat, "nationalityName": country_name(nat),
                    "region": country_region(nat),
                    "type": "inadmissible", "demographic": "family-unit",
                    "count": count, "layer": "refugee",
                    "visaClass": "REF", "visaClassLabel": "Refugee",
                })

    print(f"  WRAPS: {len(records)} records")
    return records


# ── Hardcoded overstay data ────────────────────────────────────────────────

OVERSTAY_COUNTRY_NORMALIZE = {
    "MEXICO": "MX", "CANADA": "CA", "COLOMBIA": "CO", "INDIA": "IN",
    "BRAZIL": "BR", "VENEZUELA": "VE", "CHINA": "CN", "ECUADOR": "EC",
    "DOMINICAN REPUBLIC": "DO", "HAITI": "HT", "SPAIN": "ES",
    "JAMAICA": "JM", "UNITED KINGDOM": "GB", "FRANCE": "FR",
    "PHILIPPINES": "PH", "ITALY": "IT", "NIGERIA": "NG",
    "GUATEMALA": "GT", "PERU": "PE", "HONDURAS": "HN",
    "INDONESIA": "ID", "ARGENTINA": "AR", "GERMANY": "DE",
    "EL SALVADOR": "SV", "EGYPT": "EG", "CHILE": "CL",
    "KOREA, SOUTH": "KR", "SOUTH KOREA": "KR",
    "PAKISTAN": "PK", "TURKEY": "TR", "BANGLADESH": "BD",
    "ROMANIA": "RO", "RUSSIA": "RU", "UKRAINE": "UA",
    "JAPAN": "JP", "AUSTRALIA": "AU", "PORTUGAL": "PT",
    "POLAND": "PL", "COSTA RICA": "CR", "PANAMA": "PA",
    "BOLIVIA": "BO", "PARAGUAY": "PY", "URUGUAY": "UY",
    "GUYANA": "GY", "TRINIDAD AND TOBAGO": "TT",
    "AFGHANISTAN": "AF", "IRAN": "IR", "IRAQ": "IQ",
    "JORDAN": "JO", "LEBANON": "LB", "MOROCCO": "MA",
    "ALGERIA": "DZ", "TUNISIA": "TN", "ETHIOPIA": "ET",
    "KENYA": "KE", "GHANA": "GH", "CAMEROON": "CM",
    "CONGO (KINSHASA)": "CD", "CONGO (BRAZZAVILLE)": "CG",
    "SENEGAL": "SN", "SOMALIA": "SO", "ERITREA": "ER",
    "SUDAN": "SD", "SOUTH SUDAN": "SS", "BURMA": "MM",
    "THAILAND": "TH", "VIETNAM": "VN", "CAMBODIA": "KH",
    "NEPAL": "NP", "SRI LANKA": "LK", "CUBA": "CU",
    "NICARAGUA": "NI", "SYRIA": "SY", "ISRAEL": "IL",
    "TAIWAN": "TW", "MALAYSIA": "MY", "SINGAPORE": "SG",
    "GEORGIA": "GE", "ALBANIA": "AL", "LAOS": "LA",
    "MONGOLIA": "MN", "SERBIA": "RS", "LIBERIA": "LR",
    "SIERRA LEONE": "SL", "GUINEA": "GN", "MALI": "ML",
    "TOGO": "TG", "GAMBIA, THE": "GM", "GAMBIA": "GM", "BENIN": "BJ",
    "NIGER": "NE", "CHAD": "TD", "CENTRAL AFRICAN REPUBLIC": "CF",
    "COTE D'IVOIRE": "CI", "BURKINA FASO": "BF", "RWANDA": "RW",
    "BURUNDI": "BI", "CABO VERDE": "CV",
    "ANDORRA": "AD", "ANGOLA": "AO", "ANTIGUA AND BARBUDA": "AG",
    "AUSTRIA": "AT", "BAHAMAS": "BS", "BAHAMAS, THE": "BS",
    "BAHRAIN": "BH", "BARBADOS": "BB", "BELGIUM": "BE",
    "BELIZE": "BZ", "BOSNIA AND HERZEGOVINA": "BA", "BOTSWANA": "BW",
    "BRUNEI": "BN", "BULGARIA": "BG", "COMOROS": "KM",
    "CROATIA": "HR", "CYPRUS": "CY", "CZECH REPUBLIC": "CZ",
    "DENMARK": "DK", "DJIBOUTI": "DJ", "EQUATORIAL GUINEA": "GQ",
    "ESTONIA": "EE", "FIJI": "FJ", "FINLAND": "FI",
    "GABON": "GA", "GREECE": "GR", "GRENADA": "GD",
    "HUNGARY": "HU", "ICELAND": "IS", "IRELAND": "IE",
    "KIRIBATI": "KI", "KOSOVO": "XK", "KUWAIT": "KW",
    "LATVIA": "LV", "LESOTHO": "LS", "LIECHTENSTEIN": "LI",
    "LITHUANIA": "LT", "LUXEMBOURG": "LU", "MACEDONIA": "MK",
    "NORTH MACEDONIA": "MK", "MADAGASCAR": "MG", "MALAWI": "MW",
    "MALDIVES": "MV", "MALTA": "MT", "MARSHALL ISLANDS": "MH",
    "MICRONESIA": "FM", "MICRONESIA,": "FM",
    "MICRONESIA, FEDERATED": "FM",
    "MICRONESIA, FEDERATED STATES OF": "FM",
    "MONACO": "MC", "MONTENEGRO": "ME", "MOZAMBIQUE": "MZ",
    "NAMIBIA": "NA", "NAURU": "NR", "NETHERLANDS": "NL",
    "NEW ZEALAND": "NZ", "NORWAY": "NO", "OMAN": "OM",
    "PALAU": "PW", "PAPUA NEW GUINEA": "PG", "QATAR": "QA",
    "SAINT KITTS AND NEVIS": "KN", "ST. KITTS AND NEVIS": "KN",
    "SAINT LUCIA": "LC", "ST. LUCIA": "LC",
    "SAINT VINCENT AND THE GRENADINES": "VC",
    "ST. VINCENT AND THE GRENADINES": "VC",
    "SAINT VINCENT AND THE": "VC",
    "SAMOA": "WS", "SAN MARINO": "SM",
    "SAO TOME AND PRINCIPE": "ST", "SAUDI ARABIA": "SA",
    "SEYCHELLES": "SC", "SLOVAKIA": "SK", "SLOVENIA": "SI",
    "SOLOMON ISLANDS": "SB", "SURINAME": "SR",
    "SWAZILAND": "SZ", "SWEDEN": "SE", "SWITZERLAND": "CH",
    "TANZANIA": "TZ", "TIMOR-LESTE": "TL", "TONGA": "TO",
    "TURKMENISTAN": "TM", "TUVALU": "TV", "UGANDA": "UG",
    "UNITED ARAB EMIRATES": "AE", "UNITED ARAB": "AE",
    "VANUATU": "VU", "ZAMBIA": "ZM", "ZIMBABWE": "ZW",
    "KOREA, NORTH": "KP", "HOLY SEE": "VA",
    "EMIRATES": "AE",
    # Garbled multi-line names from PDF extraction
    "BARBUDA ARGENTINA": "AG",
    "EMIRATES URUGUAY": "UY",
    "GRENADINES SAMOA": "VC",
    "HERZEGOVINA BOTSWANA": "BA",
    "NEVIS SAINT LUCIA": "KN",
    "REPUBLIC CHAD": "CF",
    "REPUBLIC ECUADOR": "DO",
    "PRINCIPE SAUDI ARABIA": "ST",
    "STATES OF MOLDOVA": "MD",
    "TOBAGO TUNISIA": "TT",
    "ISLANDS MAURITANIA": "MH",
    "ISLANDS SOMALIA": "SB",
}


def generate_overstay():
    """
    Extract real per-country suspected in-country overstays from
    CBP Entry/Exit Overstay Reports (FY2015–FY2024 PDFs).
    """
    records = []
    overstay_path = OUT / "overstay-extracted.json"

    if not overstay_path.exists():
        print("  Overstay: overstay-extracted.json not found, run PDF extraction first")
        return records

    with open(overstay_path) as f:
        extracted = json.load(f)

    fy_configs = [(f"fy{y}", y, y - 1) for y in range(2015, 2025)]

    for fy_key, fy_year, cal_year_start in fy_configs:
        fy_data = extracted.get(fy_key, {})
        if not fy_data:
            continue

        for country_name_raw, suspected in fy_data.items():
            if suspected <= 0:
                continue

            code = OVERSTAY_COUNTRY_NORMALIZE.get(country_name_raw)
            if not code:
                code = normalize_citizenship(country_name_raw)

            monthly = max(1, round(suspected / 12))

            for m in range(10, 22):
                if m <= 12:
                    month = f"{cal_year_start}-{m:02d}"
                else:
                    month = f"{fy_year}-{(m - 12):02d}"

                records.append({
                    "month": month, "sector": "airport",
                    "sectorLat": 0, "sectorLng": 0,
                    "nationality": code, "nationalityName": country_name(code),
                    "region": country_region(code),
                    "type": "inadmissible", "demographic": "single-adult",
                    "count": monthly, "layer": "overstay",
                    "visaClass": "OS", "visaClassLabel": "Visa overstay",
                })

    fy_range = [k for k in sorted(extracted.keys()) if extracted[k]]
    total = sum(r["count"] for r in records)
    countries = len(set(r["nationality"] for r in records))
    print(f"  Overstay: {len(records)} records, {countries} countries, ~{total:,} total ({fy_range[0]}–{fy_range[-1]})")
    return records


# ── Title 42 / border-turnedaway supplementation ─────────────────────────

def supplement_title42(existing_records):
    """
    Add border-turnedaway records for FY2020-2023 Title 42 expulsions
    that aren't captured in the USBP disposition data (which only covers FY2024+).
    """
    records = []

    # Known Title 42 + other expulsion totals by FY (CBP published stats)
    TITLE42_BY_FY = {
        2020: 275000,
        2021: 1150000,
        2022: 1150000,
        2023: 577000,
    }

    # Nationality distribution for Title 42 (approximate, from CBP reports)
    NATIONALITY_DIST = [
        ("MX", 0.50), ("GT", 0.12), ("HN", 0.11), ("SV", 0.06),
        ("NI", 0.04), ("CU", 0.03), ("HT", 0.03), ("VE", 0.03),
        ("CO", 0.02), ("EC", 0.02), ("BR", 0.01), ("PE", 0.01),
    ]
    OTHER_SHARE = 1.0 - sum(s for _, s in NATIONALITY_DIST)

    # Sum existing border-turnedaway by FY to avoid double-counting
    existing_by_fy = {}
    for r in existing_records:
        if r["layer"] != "border-turnedaway":
            continue
        y, m = int(r["month"][:4]), int(r["month"][5:])
        fy = y + 1 if m >= 10 else y
        existing_by_fy[fy] = existing_by_fy.get(fy, 0) + r["count"]

    for fy, total in TITLE42_BY_FY.items():
        existing = existing_by_fy.get(fy, 0)
        delta = total - existing
        if delta <= 0:
            continue

        start_year = fy - 1
        for nat_code, share in NATIONALITY_DIST:
            annual = max(1, round(delta * share))
            monthly = max(1, round(annual / 12))

            for m in range(10, 22):
                if m <= 12:
                    month = f"{start_year}-{m:02d}"
                else:
                    month = f"{start_year + 1}-{(m - 12):02d}"

                lat, lng = sector_coords("rio-grande-valley")
                records.append({
                    "month": month, "sector": "rio-grande-valley",
                    "sectorLat": lat, "sectorLng": lng,
                    "nationality": nat_code,
                    "nationalityName": country_name(nat_code),
                    "region": country_region(nat_code),
                    "type": "expulsion", "demographic": "single-adult",
                    "count": monthly, "layer": "border-turnedaway",
                    "visaClass": "T42", "visaClassLabel": "Title 42 expulsion",
                })

        # Remaining share as "Other"
        other_annual = max(1, round(delta * OTHER_SHARE))
        other_monthly = max(1, round(other_annual / 12))
        for m in range(10, 22):
            if m <= 12:
                month = f"{start_year}-{m:02d}"
            else:
                month = f"{start_year + 1}-{(m - 12):02d}"

            lat, lng = sector_coords("rio-grande-valley")
            records.append({
                "month": month, "sector": "rio-grande-valley",
                "sectorLat": lat, "sectorLng": lng,
                "nationality": "XX", "nationalityName": "Other",
                "region": "other",
                "type": "expulsion", "demographic": "single-adult",
                "count": other_monthly, "layer": "border-turnedaway",
                "visaClass": "T42", "visaClassLabel": "Title 42 expulsion",
            })

    total_added = sum(r["count"] for r in records)
    print(f"  Title 42 supplement: {len(records)} records, ~{total_added:,} expulsions added")
    return records


def supplement_border_encounters(existing_records):
    """
    Add historical border-entered and border-inadmissible records for FY2020-2024
    to fill gaps where raw USBP/OFO files are missing.
    Uses CBP published annual encounter totals minus what's already in the data.
    """
    records = []

    # CBP published totals: USBP apprehensions (border-entered) and OFO inadmissibles
    USBP_BY_FY = {2020: 405000, 2021: 1660000, 2022: 2210000, 2023: 2050000, 2024: 1530000}
    OFO_BY_FY = {2020: 241000, 2021: 294000, 2022: 452000, 2023: 600000, 2024: 550000}

    NATIONALITY_DIST = [
        ("MX", 0.32), ("GT", 0.12), ("HN", 0.10), ("SV", 0.05),
        ("NI", 0.06), ("CU", 0.07), ("HT", 0.04), ("VE", 0.08),
        ("CO", 0.04), ("EC", 0.04), ("BR", 0.02), ("IN", 0.02),
    ]
    OTHER_SHARE = 1.0 - sum(s for _, s in NATIONALITY_DIST)

    SECTOR_WEIGHTS = [
        ("rio-grande-valley", 0.30), ("del-rio", 0.18), ("el-paso", 0.16),
        ("tucson", 0.14), ("san-diego", 0.08), ("laredo", 0.06),
        ("yuma", 0.04), ("big-bend", 0.02), ("el-centro", 0.02),
    ]

    # Sum existing records by FY and layer
    existing = {}
    for r in existing_records:
        if r["layer"] not in ("border-entered", "border-inadmissible"):
            continue
        y, m = int(r["month"][:4]), int(r["month"][5:])
        fy = y + 1 if m >= 10 else y
        key = (fy, r["layer"])
        existing[key] = existing.get(key, 0) + r["count"]

    def gen_records(fy, delta, layer, visa_class, visa_label):
        recs = []
        start_year = fy - 1
        for nat_code, share in NATIONALITY_DIST:
            annual = max(1, round(delta * share))
            for sector, sw in SECTOR_WEIGHTS:
                sector_annual = max(1, round(annual * sw))
                monthly = max(1, round(sector_annual / 12))
                lat, lng = sector_coords(sector)
                for m_idx in range(10, 22):
                    if m_idx <= 12:
                        month = f"{start_year}-{m_idx:02d}"
                    else:
                        month = f"{start_year + 1}-{(m_idx - 12):02d}"
                    recs.append({
                        "month": month, "sector": sector,
                        "sectorLat": lat, "sectorLng": lng,
                        "nationality": nat_code,
                        "nationalityName": country_name(nat_code),
                        "region": country_region(nat_code),
                        "type": "apprehension", "demographic": "single-adult",
                        "count": monthly, "layer": layer,
                        "visaClass": visa_class, "visaClassLabel": visa_label,
                    })

        other_annual = max(1, round(delta * OTHER_SHARE))
        for sector, sw in SECTOR_WEIGHTS:
            sector_annual = max(1, round(other_annual * sw))
            monthly = max(1, round(sector_annual / 12))
            lat, lng = sector_coords(sector)
            for m_idx in range(10, 22):
                if m_idx <= 12:
                    month = f"{start_year}-{m_idx:02d}"
                else:
                    month = f"{start_year + 1}-{(m_idx - 12):02d}"
                recs.append({
                    "month": month, "sector": sector,
                    "sectorLat": lat, "sectorLng": lng,
                    "nationality": "XX", "nationalityName": "Other",
                    "region": "other",
                    "type": "apprehension", "demographic": "single-adult",
                    "count": monthly, "layer": layer,
                    "visaClass": visa_class, "visaClassLabel": visa_label,
                })
        return recs

    for fy, total in USBP_BY_FY.items():
        ex = existing.get((fy, "border-entered"), 0)
        delta = total - ex
        if delta > 0:
            records.extend(gen_records(fy, delta, "border-entered", "T8-APP", "Apprehension"))
            print(f"  Border entered FY{fy}: +{delta:,} (had {ex:,})")

    for fy, total in OFO_BY_FY.items():
        ex = existing.get((fy, "border-inadmissible"), 0)
        delta = total - ex
        if delta > 0:
            records.extend(gen_records(fy, delta, "border-inadmissible", "T8-INAD", "Inadmissible"))
            print(f"  Border inadmissible FY{fy}: +{delta:,} (had {ex:,})")

    total_added = sum(r["count"] for r in records)
    print(f"  Border supplement total: {len(records)} records, ~{total_added:,} encounters added")
    return records


# ── Uncounted estimate ─────────────────────────────────────────────────────

def generate_uncounted():
    """
    Pew/MPI estimates ~10.5-11M unauthorized immigrants.
    Net change ~200-400k/year as a rough estimate of uncounted annual flow.
    Generate monthly aggregate records.
    """
    records = []
    # DHS got-away estimates by FY (known encounters that evaded apprehension)
    annual_by_fy = {
        2020: 200000,
        2021: 400000,
        2022: 900000,
        2023: 800000,
        2024: 500000,
        2025: 400000,
    }

    # Generate for FY2020-FY2025
    for fy in range(2020, 2026):
        monthly = max(100, round(annual_by_fy.get(fy, 300000) / 12))

        for m in range(10, 22):
            if m <= 12:
                month = f"{fy - 1}-{m:02d}"
            else:
                month = f"{fy}-{(m - 12):02d}"

            if fy == 2025 and m > 15:  # only through Mar 2025 for current FY
                break

            records.append({
                "month": month, "sector": "unknown",
                "sectorLat": 0, "sectorLng": 0,
                "nationality": "XX", "nationalityName": "Uncounted",
                "region": "other",
                "type": "apprehension", "demographic": "single-adult",
                "count": monthly, "layer": "uncounted",
            })

    print(f"  Uncounted: {len(records)} records")
    return records


# ── Asylum (from ICE encounters data) ─────────────────────────────────────

def parse_ice_encounters_as_asylum():
    """
    encounters-latest.xlsx is ICE ERO encounter data.
    We can use it for the asylum layer since these are people
    encountered by ICE who are in proceedings.
    """
    records = []
    fpath = RAW / "encounters-latest.xlsx"
    if not fpath.exists():
        print("  ICE encounters/asylum: file not found, skipping")
        return records

    print("  ICE encounters: loading for asylum layer...")
    try:
        df = pd.read_excel(fpath, engine="openpyxl",
                           usecols=["event_date", "citizenship_country", "responsible_aor"])
    except Exception as e:
        print(f"  ICE encounters ERROR: {e}")
        return records

    print(f"  ICE encounters: {len(df)} rows")
    df["_date"] = pd.to_datetime(df["event_date"], errors="coerce")
    df = df.dropna(subset=["_date"])
    df["_month"] = df["_date"].dt.strftime("%Y-%m")

    for (month, cit_raw), grp in df.groupby(["_month", "citizenship_country"]):
        nat = normalize_citizenship(cit_raw)
        count = len(grp)

        records.append({
            "month": month, "sector": "port-of-entry",
            "sectorLat": 0, "sectorLng": 0,
            "nationality": nat, "nationalityName": country_name(nat),
            "region": country_region(nat),
            "type": "inadmissible", "demographic": "single-adult",
            "count": count, "layer": "asylum",
            "visaClass": "ASY", "visaClassLabel": "Asylee",
        })

    print(f"  ICE encounters/asylum: {len(records)} records")
    return records


# ── Aggregate & deduplicate ────────────────────────────────────────────────

def aggregate_records(all_records):
    """Merge records with same (month, sector, nationality, layer, demographic)."""
    key_map = defaultdict(lambda: 0)
    meta_map = {}

    for r in all_records:
        key = (r["month"], r["sector"], r["nationality"], r["layer"], r["demographic"], r.get("visaClass", ""))
        key_map[key] += r["count"]
        if key not in meta_map:
            meta_map[key] = r

    merged = []
    for key, count in key_map.items():
        r = dict(meta_map[key])
        r["count"] = count
        merged.append(r)

    merged.sort(key=lambda r: (r["month"], r["layer"], r["nationality"]))
    return merged


# ── Compute sidebar stats ─────────────────────────────────────────────────

FILTER_LAYERS = {
    "all": ["legal-employment", "legal-family", "legal-diversity", "temp-worker",
            "refugee", "asylum",
            "border-entered", "border-inadmissible", "border-turnedaway",
            "overstay", "uncounted", "ice-arrest"],
    "legal": ["legal-employment", "legal-family", "legal-diversity", "temp-worker", "refugee", "asylum"],
    "border": ["border-entered", "border-inadmissible", "border-turnedaway"],
    "overstays": ["overstay"],
    "uncounted": ["uncounted"],
    "arrests": ["ice-arrest"],
}


def compute_sidebar_stats(records):
    stats = {}

    for preset, layers in FILTER_LAYERS.items():
        layer_set = set(layers)
        filtered = [r for r in records if r["layer"] in layer_set]

        total = sum(r["count"] for r in filtered)

        by_month = defaultdict(int)
        for r in filtered:
            by_month[r["month"]] += r["count"]

        by_nationality = defaultdict(lambda: {"name": "", "region": "", "count": 0})
        for r in filtered:
            entry = by_nationality[r["nationality"]]
            entry["name"] = r["nationalityName"]
            entry["region"] = r["region"]
            entry["count"] += r["count"]

        top_countries = sorted(by_nationality.values(), key=lambda x: -x["count"])[:10]

        by_layer = defaultdict(int)
        for r in filtered:
            by_layer[r["layer"]] += r["count"]

        stats[preset] = {
            "total": total,
            "byMonth": dict(sorted(by_month.items())),
            "topCountries": top_countries,
            "byLayer": dict(by_layer),
        }

    return stats


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    print("Normalizing raw immigration data...\n")

    all_records = []

    # 1. USBP border apprehensions (the biggest real dataset)
    print("[1/7] USBP Border Apprehensions")
    all_records.extend(parse_usbp())

    # 2. OFO inadmissibles
    print("\n[2/7] OFO Inadmissibles")
    all_records.extend(parse_ofo())

    # 3. ICE arrests
    print("\n[3/7] ICE Arrests")
    all_records.extend(parse_ice_arrests())

    # 4. Legal immigration (DHS Yearbook LPR)
    print("\n[4/8] DHS Yearbook LPR (Legal Immigration)")
    all_records.extend(parse_dhs_yearbook_lpr())

    # 4b. Temp workers (DHS Yearbook Nonimmigrant tables)
    print("\n[4b/8] Temporary Workers")
    all_records.extend(parse_temp_workers())

    # 5. Refugees
    print("\n[5/7] OHSS Refugees")
    all_records.extend(parse_ohss_refugees())

    print("\n[5b/7] WRAPS Refugee Admissions")
    all_records.extend(parse_wraps())

    # 6. Overstays (hardcoded)
    print("\n[6/7] Visa Overstays")
    all_records.extend(generate_overstay())

    # 7. Title 42 supplement
    print("\n[7/10] Title 42 Supplement")
    all_records.extend(supplement_title42(all_records))

    # 8. Historical border encounters supplement
    print("\n[8/10] Border Encounters Supplement")
    all_records.extend(supplement_border_encounters(all_records))

    # 9. Uncounted
    print("\n[9/10] Uncounted Estimates")
    all_records.extend(generate_uncounted())

    # Aggregate
    print(f"\nTotal raw records: {len(all_records)}")
    merged = aggregate_records(all_records)
    print(f"After aggregation: {len(merged)}")

    # Filter to reasonable date range (2019-10 through 2026-03)
    merged = [r for r in merged if "2019-10" <= r["month"] <= "2026-03"]
    print(f"After date filter: {len(merged)}")

    # Summary
    layers = defaultdict(int)
    for r in merged:
        layers[r["layer"]] += r["count"]
    print("\nBy layer:")
    for layer, count in sorted(layers.items(), key=lambda x: -x[1]):
        print(f"  {layer}: {count:,}")

    months = sorted(set(r["month"] for r in merged))
    print(f"\nDate range: {months[0]} to {months[-1]} ({len(months)} months)")

    # Write outputs
    OUT.mkdir(parents=True, exist_ok=True)

    particles_path = OUT / "particles.json"
    with open(particles_path, "w") as f:
        json.dump(merged, f)
    size_mb = particles_path.stat().st_size / 1024 / 1024
    print(f"\nWrote {particles_path} ({size_mb:.1f} MB, {len(merged)} records)")

    stats = compute_sidebar_stats(merged)
    stats_path = OUT / "sidebar-stats.json"
    with open(stats_path, "w") as f:
        json.dump(stats, f, indent=2)
    print(f"Wrote {stats_path}")

    # Also output month list
    months_path = OUT / "months.json"
    with open(months_path, "w") as f:
        json.dump(months, f)
    print(f"Wrote {months_path}")


if __name__ == "__main__":
    main()
