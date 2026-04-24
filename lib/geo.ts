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
