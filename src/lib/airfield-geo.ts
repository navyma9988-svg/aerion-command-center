/**
 * TRUE surveyed DFW airfield geometry.
 * Runway-end coordinates are FAA/AirNav surveyed decimal degrees.
 * Projected equirectangular around the field, then fitted to the radar viewBox.
 */

export type LatLon = { lat: number; lon: number };
export type Seg = { x1: number; y1: number; x2: number; y2: number };

const LON0 = -97.041;
const LAT0 = 32.894;
const M_PER_DEG = 111320;
const COS_LAT = Math.cos((32.894 * Math.PI) / 180);
const FT_TO_M = 0.3048;

/** Surveyed runway ends: [low-number end, high-number end], width in feet. */
export const RUNWAY_ENDS: Record<string, { a: LatLon; b: LatLon; widthFt: number }> = {
  "17R/35L": {
    a: { lat: 32.915722, lon: -97.029884 },
    b: { lat: 32.878895, lon: -97.03008 },
    widthFt: 200,
  },
  "17C/35C": {
    a: { lat: 32.915707, lon: -97.025975 },
    b: { lat: 32.878879, lon: -97.026172 },
    widthFt: 150,
  },
  "17L/35R": {
    a: { lat: 32.89832, lon: -97.009779 },
    b: { lat: 32.874959, lon: -97.009908 },
    widthFt: 150,
  },
  "18L/36R": {
    a: { lat: 32.9158, lon: -97.050736 },
    b: { lat: 32.878971, lon: -97.050926 },
    widthFt: 200,
  },
  "18R/36L": {
    a: { lat: 32.915813, lon: -97.054646 },
    b: { lat: 32.878986, lon: -97.054833 },
    widthFt: 150,
  },
  "13R/31L": {
    a: { lat: 32.909576, lon: -97.083132 },
    b: { lat: 32.89027, lon: -97.063276 },
    widthFt: 150,
  },
  "13L/31R": {
    a: { lat: 32.912555, lon: -97.021478 },
    b: { lat: 32.894981, lon: -97.000844 },
    widthFt: 200,
  },
};

/** Terminal horseshoe centers and the side their apron opens toward. */
export const PIER_POS: { t: string; pos: LatLon; open: "east" | "west" }[] = [
  { t: "A", pos: { lat: 32.9075, lon: -97.0355 }, open: "west" },
  { t: "C", pos: { lat: 32.8977, lon: -97.0357 }, open: "west" },
  { t: "E", pos: { lat: 32.8895, lon: -97.0367 }, open: "west" },
  { t: "B", pos: { lat: 32.9052, lon: -97.043 }, open: "east" },
  { t: "D", pos: { lat: 32.8945, lon: -97.0432 }, open: "east" },
];

/** DFW control tower. */
const TOWER_POS: LatLon = { lat: 32.8998, lon: -97.0403 };

function meters(p: LatLon) {
  return {
    x: (p.lon - LON0) * COS_LAT * M_PER_DEG,
    y: -(p.lat - LAT0) * M_PER_DEG,
  };
}

// ---- fit to viewBox -------------------------------------------------------
const PAD = 64;
const VIEW_W = 1200;

const allPoints = [
  ...Object.values(RUNWAY_ENDS).flatMap((r) => [meters(r.a), meters(r.b)]),
  ...PIER_POS.map((p) => meters(p.pos)),
];
const minX = Math.min(...allPoints.map((p) => p.x));
const maxX = Math.max(...allPoints.map((p) => p.x));
const minY = Math.min(...allPoints.map((p) => p.y));
const maxY = Math.max(...allPoints.map((p) => p.y));

/** world units per metre (true scale, uniform on both axes) */
export const SCALE = (VIEW_W - PAD * 2) / (maxX - minX);

export const WORLD = {
  w: VIEW_W,
  h: Math.round((maxY - minY) * SCALE + PAD * 2),
};

export function project(p: LatLon) {
  const m = meters(p);
  return {
    x: (m.x - minX) * SCALE + PAD,
    y: (m.y - minY) * SCALE + PAD,
  };
}

export const TOWER = project(TOWER_POS);

/** Runway pavement in world space, drawn at true width. */
export const RUNWAY_GEOM: Record<string, Seg & { width: number }> = Object.fromEntries(
  Object.entries(RUNWAY_ENDS).map(([id, r]) => {
    const a = project(r.a);
    const b = project(r.b);
    return [
      id,
      { x1: a.x, y1: a.y, x2: b.x, y2: b.y, width: Math.max(3, r.widthFt * FT_TO_M * SCALE) },
    ];
  }),
) as Record<string, Seg & { width: number }>;

export const PIERS = PIER_POS.map((p) => ({ ...p, ...project(p.pos) }));

/** Taxiway network derived from the surveyed geometry: terminal spine + cross links. */
export const TAXIWAYS: Seg[] = (() => {
  const segs: Seg[] = [];
  const westInner = RUNWAY_GEOM["18L/36R"]!;
  const eastInner = RUNWAY_GEOM["17R/35L"]!;
  const eastOuter = RUNWAY_GEOM["17C/35C"]!;
  const spineX = (westInner.x1 + eastInner.x1) / 2;
  const top = Math.min(westInner.y1, eastInner.y1) + 20;
  const bottom = Math.max(westInner.y2, eastInner.y2) - 20;

  // central spine (International Parkway corridor)
  segs.push({ x1: spineX, y1: top, x2: spineX, y2: bottom });

  // cross links from each pier out to the flanking runways
  for (const p of PIERS) {
    segs.push({ x1: westInner.x1, y1: p.y, x2: eastInner.x1, y2: p.y });
  }
  // outboard connectors
  segs.push({ x1: eastInner.x1, y1: top + 40, x2: eastOuter.x1, y2: top + 40 });
  segs.push({ x1: eastInner.x1, y1: bottom - 60, x2: eastOuter.x1, y2: bottom - 60 });
  segs.push({
    x1: RUNWAY_GEOM["18R/36L"]!.x1,
    y1: top + 40,
    x2: westInner.x1,
    y2: top + 40,
  });
  segs.push({
    x1: RUNWAY_GEOM["18R/36L"]!.x2,
    y1: bottom - 60,
    x2: westInner.x2,
    y2: bottom - 60,
  });
  return segs;
})();
