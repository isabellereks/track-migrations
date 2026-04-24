export const SECTOR_CENTROIDS: Record<string, [number, number]> = {
  "rio-grande-valley": [26.2, -97.7],
  laredo: [27.5, -99.5],
  "del-rio": [29.4, -100.9],
  "big-bend": [29.3, -103.4],
  "el-paso": [31.8, -106.4],
  tucson: [32.2, -111.0],
  yuma: [32.7, -114.6],
  "el-centro": [32.8, -115.6],
  "san-diego": [32.7, -117.2],
  swanton: [44.5, -73.1],
  buffalo: [42.9, -78.9],
  detroit: [42.3, -83.0],
  "grand-forks": [47.9, -97.0],
  havre: [48.5, -109.7],
  spokane: [47.7, -117.4],
  blaine: [49.0, -122.7],
  miami: [25.8, -80.2],
  "new-orleans": [30.0, -90.1],
  ramey: [18.5, -67.2],
};

export function sectorDisplayName(sector: string): string {
  return sector
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const ICE_AOR_CENTROIDS: Record<string, [number, number]> = {
  Atlanta:         [33.75, -84.39],
  Baltimore:       [39.29, -76.61],
  Boston:          [42.36, -71.06],
  Buffalo:         [42.89, -78.88],
  Chicago:         [41.88, -87.63],
  Dallas:          [32.78, -96.80],
  Denver:          [39.74, -104.99],
  Detroit:         [42.33, -83.05],
  "El Paso":       [31.76, -106.49],
  Houston:         [29.76, -95.37],
  "Los Angeles":   [34.05, -118.24],
  Miami:           [25.76, -80.19],
  Minneapolis:     [44.98, -93.27],
  Newark:          [40.74, -74.17],
  "New Orleans":   [29.95, -90.07],
  "New York":      [40.71, -74.01],
  Philadelphia:    [39.95, -75.17],
  Phoenix:         [33.45, -112.07],
  "Salt Lake City": [40.76, -111.89],
  "San Antonio":   [29.42, -98.49],
  "San Diego":     [32.72, -117.16],
  "San Francisco": [37.77, -122.42],
  Seattle:         [47.61, -122.33],
  "St. Paul":      [44.94, -93.09],
  "Washington DC": [38.91, -77.04],
};

// Major immigrant settlement metros: [lat, lng, baseWeight, spreadRadius, regionAffinities]
// Weights from ACS foreign-born population. Spread in degrees (~1° ≈ 70mi).
// Region affinities boost probability for specific origin groups.
interface Destination {
  lat: number;
  lng: number;
  weight: number;
  spread: number;
  affinities: Partial<Record<string, number>>;
}

export const SETTLEMENT_DESTINATIONS: Destination[] = [
  // California
  { lat: 34.05, lng: -118.25, weight: 18, spread: 1.2,  affinities: { mexico: 2.5, "central-america": 2, asia: 1.8 } },           // LA
  { lat: 37.78, lng: -122.42, weight: 10, spread: 0.8,  affinities: { asia: 2.5, "central-america": 1.5 } },                       // SF Bay
  { lat: 32.72, lng: -117.16, weight: 6,  spread: 0.5,  affinities: { mexico: 2.5 } },                                             // San Diego
  { lat: 36.75, lng: -119.77, weight: 4,  spread: 0.8,  affinities: { mexico: 3 } },                                               // Central Valley
  { lat: 33.75, lng: -117.85, weight: 5,  spread: 0.6,  affinities: { asia: 1.5, mexico: 1.5 } },                                  // OC/IE

  // Texas
  { lat: 29.76, lng: -95.37,  weight: 12, spread: 0.8,  affinities: { mexico: 2, "central-america": 2, asia: 1.3 } },              // Houston
  { lat: 32.78, lng: -96.80,  weight: 8,  spread: 0.9,  affinities: { mexico: 1.8, asia: 1.5 } },                                  // DFW
  { lat: 29.42, lng: -98.49,  weight: 5,  spread: 0.6,  affinities: { mexico: 2.5 } },                                             // San Antonio
  { lat: 31.76, lng: -106.44, weight: 3,  spread: 0.4,  affinities: { mexico: 3 } },                                               // El Paso
  { lat: 26.20, lng: -98.23,  weight: 3,  spread: 0.5,  affinities: { mexico: 3, "central-america": 2 } },                         // McAllen/RGV

  // Northeast
  { lat: 40.71, lng: -74.01,  weight: 16, spread: 0.7,  affinities: { caribbean: 2.5, "south-america": 2, asia: 1.5, europe: 1.5, africa: 1.8 } }, // NYC
  { lat: 40.75, lng: -73.20,  weight: 4,  spread: 0.5,  affinities: { "central-america": 2, caribbean: 1.5 } },                    // Long Island
  { lat: 40.93, lng: -74.17,  weight: 4,  spread: 0.4,  affinities: { "south-america": 1.8, caribbean: 1.5 } },                    // Northern NJ
  { lat: 42.36, lng: -71.06,  weight: 5,  spread: 0.5,  affinities: { caribbean: 2, "south-america": 1.5, asia: 1.3 } },           // Boston
  { lat: 39.95, lng: -75.17,  weight: 4,  spread: 0.5,  affinities: { caribbean: 1.5, africa: 1.5, asia: 1.3 } },                  // Philly
  { lat: 38.91, lng: -77.04,  weight: 5,  spread: 0.6,  affinities: { "central-america": 2.5, africa: 2, asia: 1.3 } },            // DC metro

  // Florida
  { lat: 25.76, lng: -80.19,  weight: 12, spread: 0.8,  affinities: { caribbean: 3, "south-america": 2.5 } },                      // Miami
  { lat: 28.54, lng: -81.38,  weight: 4,  spread: 0.6,  affinities: { caribbean: 2, "south-america": 1.5 } },                      // Orlando
  { lat: 27.95, lng: -82.46,  weight: 3,  spread: 0.5,  affinities: { caribbean: 1.5 } },                                          // Tampa

  // Midwest
  { lat: 41.88, lng: -87.63,  weight: 8,  spread: 0.7,  affinities: { mexico: 2.5, "central-america": 1.5, europe: 1.3 } },        // Chicago
  { lat: 42.33, lng: -83.05,  weight: 3,  spread: 0.5,  affinities: { asia: 1.5, africa: 1.5 } },                                  // Detroit
  { lat: 44.98, lng: -93.27,  weight: 3,  spread: 0.5,  affinities: { africa: 3, asia: 1.8 } },                                    // Minneapolis

  // Southeast
  { lat: 33.75, lng: -84.39,  weight: 5,  spread: 0.7,  affinities: { mexico: 1.5, "central-america": 1.5, africa: 1.5 } },        // Atlanta
  { lat: 35.23, lng: -80.84,  weight: 3,  spread: 0.6,  affinities: { mexico: 1.5, "central-america": 1.5 } },                     // Charlotte
  { lat: 36.17, lng: -86.78,  weight: 2,  spread: 0.4,  affinities: { mexico: 1.5 } },                                             // Nashville

  // West
  { lat: 47.61, lng: -122.33, weight: 5,  spread: 0.6,  affinities: { asia: 2.5, africa: 1.3 } },                                  // Seattle
  { lat: 45.52, lng: -122.68, weight: 3,  spread: 0.4,  affinities: { asia: 1.5, europe: 1.3 } },                                  // Portland
  { lat: 36.17, lng: -115.14, weight: 4,  spread: 0.5,  affinities: { mexico: 2, asia: 1.5 } },                                    // Las Vegas
  { lat: 33.45, lng: -112.07, weight: 5,  spread: 0.7,  affinities: { mexico: 2.5 } },                                             // Phoenix
  { lat: 39.74, lng: -104.99, weight: 4,  spread: 0.5,  affinities: { mexico: 1.8 } },                                             // Denver
  { lat: 21.31, lng: -157.86, weight: 2,  spread: 0.3,  affinities: { asia: 3 } },                                                 // Honolulu
];
