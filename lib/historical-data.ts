export interface HistoricalPoint {
  year: number;
  foreignBorn: number;
  totalPop: number;
  share: number;
}

export interface Annotation {
  year: number;
  label: string;
  detail: string;
}

export const HISTORICAL_IMMIGRATION: HistoricalPoint[] = [
  { year: 1850, foreignBorn: 2_244_602,  totalPop: 23_191_876,  share: 0.097 },
  { year: 1860, foreignBorn: 4_138_697,  totalPop: 31_443_321,  share: 0.132 },
  { year: 1870, foreignBorn: 5_567_229,  totalPop: 38_558_371,  share: 0.144 },
  { year: 1880, foreignBorn: 6_679_943,  totalPop: 50_189_209,  share: 0.133 },
  { year: 1890, foreignBorn: 9_249_547,  totalPop: 62_979_766,  share: 0.148 },
  { year: 1900, foreignBorn: 10_341_276, totalPop: 75_994_575,  share: 0.136 },
  { year: 1910, foreignBorn: 13_515_886, totalPop: 92_228_496,  share: 0.147 },
  { year: 1920, foreignBorn: 13_920_692, totalPop: 106_021_537, share: 0.131 },
  { year: 1930, foreignBorn: 14_204_149, totalPop: 123_202_624, share: 0.115 },
  { year: 1940, foreignBorn: 11_594_896, totalPop: 132_164_569, share: 0.088 },
  { year: 1950, foreignBorn: 10_347_395, totalPop: 151_325_798, share: 0.068 },
  { year: 1960, foreignBorn: 9_738_091,  totalPop: 179_323_175, share: 0.054 },
  { year: 1970, foreignBorn: 9_619_302,  totalPop: 203_211_926, share: 0.047 },
  { year: 1980, foreignBorn: 14_079_906, totalPop: 226_545_805, share: 0.062 },
  { year: 1990, foreignBorn: 19_767_316, totalPop: 248_709_873, share: 0.079 },
  { year: 2000, foreignBorn: 31_107_889, totalPop: 281_421_906, share: 0.111 },
  { year: 2010, foreignBorn: 39_955_854, totalPop: 308_745_538, share: 0.129 },
  { year: 2020, foreignBorn: 44_936_960, totalPop: 331_449_281, share: 0.136 },
  { year: 2021, foreignBorn: 45_375_000, totalPop: 332_000_000, share: 0.137 },
  { year: 2022, foreignBorn: 46_200_000, totalPop: 333_300_000, share: 0.139 },
  { year: 2023, foreignBorn: 47_800_000, totalPop: 335_900_000, share: 0.142 },
  { year: 2024, foreignBorn: 50_200_000, totalPop: 340_100_000, share: 0.148 },
];

export const ANNOTATIONS: Annotation[] = [
  {
    year: 1882,
    label: "Chinese Exclusion Act",
    detail: "First federal law banning immigration by nationality. Not repealed until 1943.",
  },
  {
    year: 1924,
    label: "National Origins Act",
    detail: "Strict quotas favoring Northern/Western European immigration. Foreign-born population began 50-year decline.",
  },
  {
    year: 1965,
    label: "Hart-Celler Act",
    detail: "Abolished national-origin quotas. Opened immigration from Asia, Latin America, and Africa. Reversed the decline.",
  },
  {
    year: 1986,
    label: "IRCA amnesty",
    detail: "Immigration Reform and Control Act granted legal status to ~3 million unauthorized immigrants.",
  },
  {
    year: 2001,
    label: "Post-9/11",
    detail: "Department of Homeland Security created. Immigration enforcement dramatically expanded.",
  },
  {
    year: 2020,
    label: "COVID + Title 42",
    detail: "Borders effectively closed. Title 42 allowed immediate expulsion of border crossers.",
  },
  {
    year: 2023,
    label: "Record surge",
    detail: "Unauthorized population reached 14 million. Border encounters hit all-time highs.",
  },
  {
    year: 2025,
    label: "Enforcement crackdown",
    detail: "Mass deportation campaign. Net migration likely went negative for the first time in decades.",
  },
];
