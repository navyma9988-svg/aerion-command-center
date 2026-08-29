import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";
import { FLIGHTS, RUNWAYS, TERMINAL_HEALTH, WIND, type Flight } from "@/lib/airfield-data";

/**
 * ASDE-X style ground surveillance display for DFW.
 * Purely presentational — all data and selection state comes from props.
 */

export const WORLD = { w: 1000, h: 1400 };
const TOWER = { x: 500, y: 700 };

type Seg = { x1: number; y1: number; x2: number; y2: number };

/** Runway pavement geometry in world space (north up, south flow). */
export const RUNWAY_GEOM: Record<string, Seg> = {
  "17R/35L": { x1: 118, y1: 130, x2: 118, y2: 1280 },
  "17C/35C": { x1: 196, y1: 120, x2: 196, y2: 1290 },
  "17L/35R": { x1: 274, y1: 240, x2: 274, y2: 1180 },
  "18L/36R": { x1: 748, y1: 120, x2: 748, y2: 1290 },
  "18R/36L": { x1: 826, y1: 130, x2: 826, y2: 1280 },
  "13R/31L": { x1: 330, y1: 168, x2: 610, y2: 448 },
  "13L/31R": { x1: 430, y1: 980, x2: 706, y2: 1256 },
};

/** Terminal horseshoes between the runway pairs. */
const PIERS = [
  { t: "A", cx: 620, cy: 330, open: "east" },
  { t: "B", cx: 404, cy: 330, open: "west" },
  { t: "C", cx: 620, cy: 700, open: "east" },
  { t: "D", cx: 404, cy: 700, open: "west" },
  { t: "E", cx: 404, cy: 1060, open: "west" },
] as const;

function horseshoePath(cx: number, cy: number, open: "east" | "west", r: number) {
  const sweep = open === "east" ? 0 : 1;
  return `M ${cx},${cy - r} A ${r},${r} 0 0 ${sweep} ${cx},${cy + r}`;
}

const TAXIWAYS: Seg[] = [
  { x1: 118, y1: 330, x2: 404, y2: 330 },
  { x1: 118, y1: 700, x2: 404, y2: 700 },
  { x1: 118, y1: 1060, x2: 404, y2: 1060 },
  { x1: 620, y1: 330, x2: 826, y2: 330 },
  { x1: 620, y1: 700, x2: 826, y2: 700 },
  { x1: 512, y1: 220, x2: 512, y2: 1180 },
  { x1: 274, y1: 480, x2: 404, y2: 480 },
  { x1: 620, y1: 900, x2: 748, y2: 900 },
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export interface RadarProps {
  layer: "gates" | "actions" | "work";
  focus: string;
  terminal: string;
  runwayStatus: Map<string, string>;
  alertsByTerminal: Map<string, number>;
  onFocusFlight: (f: Flight) => void;
  onSelectTerminal: (t: string) => void;
}

export function AirfieldRadar({
  layer,
  focus,
  terminal,
  runwayStatus,
  alertsByTerminal,
  onFocusFlight,
  onSelectTerminal,
}: RadarProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const baseRef = useRef<SVGGElement | null>(null);
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;

  const clamp = useCallback((k: number, x: number, y: number) => {
    const kk = Math.min(6, Math.max(1, k));
    return {
      k: kk,
      x: Math.min(0, Math.max(WORLD.w - WORLD.w * kk, x)),
      y: Math.min(0, Math.max(WORLD.h - WORLD.h * kk, y)),
    };
  }, []);

  /** screen px -> world units (accounts for viewBox letterboxing) */
  const toWorld = useCallback((cx: number, cy: number) => {
    const base = baseRef.current;
    if (!base) return { x: 0, y: 0, scale: 1 };
    const ctm = base.getScreenCTM();
    if (!ctm) return { x: 0, y: 0, scale: 1 };
    const inv = ctm.inverse();
    const p = new DOMPoint(cx, cy).matrixTransform(inv);
    return { x: p.x, y: p.y, scale: ctm.a || 1 };
  }, []);

  const zoomAt = useCallback(
    (nextK: number, wx: number, wy: number) => {
      setView((v) => {
        const k = Math.min(6, Math.max(1, nextK));
        const ratio = k / v.k;
        return clamp(k, wx - (wx - v.x) * ratio, wy - (wy - v.y) * ratio);
      });
    },
    [clamp],
  );

  const zoomCenter = useCallback(
    (factor: number) => {
      const v = viewRef.current;
      const cx = (WORLD.w / 2 - v.x) / v.k;
      const cy = (WORLD.h / 2 - v.y) / v.k;
      zoomAt(v.k * factor, cx * v.k + v.x, cy * v.k + v.y);
    },
    [zoomAt],
  );

  // wheel + trackpad pinch (non-passive)
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const w = toWorld(e.clientX, e.clientY);
      zoomAt(viewRef.current.k * Math.exp(-dy * 0.0018), w.x, w.y);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [toWorld, zoomAt]);

  // pointer pan / pinch / double-tap
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; k: number } | null>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean; t: number; vx: number; vy: number } | null>(null);
  const raf = useRef<number | null>(null);
  const lastTap = useRef(0);

  const stopMomentum = () => {
    if (raf.current != null) cancelAnimationFrame(raf.current);
    raf.current = null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    stopMomentum();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a!.x - b!.x, a!.y - b!.y), k: viewRef.current.k };
      drag.current = null;
    } else {
      drag.current = { x: e.clientX, y: e.clientY, moved: false, t: performance.now(), vx: 0, vy: 0 };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      const mid = toWorld((a!.x + b!.x) / 2, (a!.y + b!.y) / 2);
      zoomAt((pinch.current.k * dist) / (pinch.current.dist || 1), mid.x, mid.y);
      return;
    }

    const d = drag.current;
    if (!d) return;
    const scale = toWorld(e.clientX, e.clientY).scale || 1;
    const dx = (e.clientX - d.x) / scale;
    const dy = (e.clientY - d.y) / scale;
    if (Math.abs(e.clientX - d.x) > 4 || Math.abs(e.clientY - d.y) > 4) d.moved = true;
    const now = performance.now();
    const dt = Math.max(1, now - d.t);
    d.vx = dx / dt;
    d.vy = dy / dt;
    d.t = now;
    d.x = e.clientX;
    d.y = e.clientY;
    setView((v) => clamp(v.k, v.x + dx, v.y + dy));
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const d = drag.current;
    drag.current = null;
    if (!d) return;

    if (!d.moved) {
      const now = performance.now();
      if (now - lastTap.current < 300) {
        const w = toWorld(e.clientX, e.clientY);
        zoomAt(viewRef.current.k * 1.8, w.x, w.y);
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
      return;
    }

    // momentum
    let vx = d.vx * 14;
    let vy = d.vy * 14;
    const step = () => {
      vx *= 0.92;
      vy *= 0.92;
      if (Math.abs(vx) < 0.05 && Math.abs(vy) < 0.05) {
        raf.current = null;
        return;
      }
      setView((v) => clamp(v.k, v.x + vx, v.y + vy));
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  useEffect(() => stopMomentum, []);

  const focused = FLIGHTS.find((f) => f.callsign === focus) ?? null;

  const planes = useMemo(
    () =>
      FLIGHTS.map((f) => {
        const g = RUNWAY_GEOM[f.runway] ?? RUNWAY_GEOM["17C/35C"]!;
        const t = f.movement === "arrival" ? f.progress : 1 - f.progress;
        const dirX = f.movement === "arrival" ? g.x2 - g.x1 : g.x1 - g.x2;
        const dirY = f.movement === "arrival" ? g.y2 - g.y1 : g.y1 - g.y2;
        const heading = (Math.atan2(dirX, -dirY) * 180) / Math.PI;
        const nx = -dirY / (Math.hypot(dirX, dirY) || 1);
        const ny = dirX / (Math.hypot(dirX, dirY) || 1);
        const off = f.status === "Taxiing" || f.status === "At gate" ? 34 : 0;
        return {
          f,
          x: lerp(g.x1, g.x2, t) + nx * off,
          y: lerp(g.y1, g.y2, t) + ny * off,
          heading,
        };
      }),
    [],
  );

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}
        className="h-[62dvh] w-full touch-none select-none lg:h-[70dvh]"
        style={{ background: "radial-gradient(120% 90% at 50% 45%, color-mix(in oklab, var(--color-cyan) 7%, transparent), transparent 70%)" }}
        role="group"
        aria-label="DFW ground surveillance display — seven runways, five terminal horseshoes and 12 active aircraft. Drag to pan, pinch or scroll to zoom. Use Tab to move between runways, terminals and aircraft, then Enter or Space to focus."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={endPointer}
      >
        <defs>
          <pattern id="closed-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" className="stroke-coral" strokeWidth="3" opacity="0.7" />
          </pattern>
          <radialGradient id="sweep-grad">
            <stop offset="0%" stopColor="var(--color-cyan)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--color-cyan)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g ref={baseRef} />

        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {/* range rings centered on the tower */}
          {[180, 360, 540, 720].map((r) => (
            <circle
              key={r}
              cx={TOWER.x}
              cy={TOWER.y}
              r={r}
              className="fill-none stroke-cyan"
              strokeWidth={1 / view.k}
              opacity="0.14"
            />
          ))}
          <line x1={TOWER.x} y1={0} x2={TOWER.x} y2={WORLD.h} className="stroke-cyan" strokeWidth={1 / view.k} opacity="0.08" />
          <line x1={0} y1={TOWER.y} x2={WORLD.w} y2={TOWER.y} className="stroke-cyan" strokeWidth={1 / view.k} opacity="0.08" />

          {/* periodic sweep */}
          <g style={{ transformOrigin: `${TOWER.x}px ${TOWER.y}px`, animation: "radar-sweep 6s linear infinite" }}>
            <path
              d={`M ${TOWER.x},${TOWER.y} L ${TOWER.x + 760},${TOWER.y - 300} A 820,820 0 0 1 ${TOWER.x + 760},${TOWER.y + 300} Z`}
              fill="url(#sweep-grad)"
              pointerEvents="none"
            />
          </g>

          {/* taxiways */}
          {TAXIWAYS.map((t, i) => (
            <line
              key={i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              style={{ stroke: "color-mix(in oklab, var(--color-foreground) 12%, var(--color-background))" }}
              strokeWidth="9"
              strokeLinecap="round"
              opacity="0.9"
            />
          ))}

          {/* runways */}
          {RUNWAYS.map((r) => {
            const g = RUNWAY_GEOM[r.id]!;
            const status = runwayStatus.get(r.id) ?? "active";
            const [a, b] = r.id.split("/");
            const ang = (Math.atan2(g.y2 - g.y1, g.x2 - g.x1) * 180) / Math.PI;
            return (
              <g
                key={r.id}
                role="img"
                aria-label={`Runway ${r.id}, ${r.length}, ${
                  status === "active"
                    ? `active for ${r.flow} flow, ${WIND.approach}`
                    : status === "notam"
                      ? "restricted by NOTAM"
                      : "closed, crosshatched"
                }`}
              >
                <line
                  x1={g.x1}
                  y1={g.y1}
                  x2={g.x2}
                  y2={g.y2}
                  style={{ stroke: "color-mix(in oklab, var(--color-foreground) 17%, var(--color-background))" }}
                  strokeWidth="26"
                />
                {status === "closed" && (
                  <line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke="url(#closed-hatch)" strokeWidth="26" />
                )}
                {status === "notam" && (
                  <line
                    x1={g.x1}
                    y1={g.y1}
                    x2={g.x2}
                    y2={g.y2}
                    className="stroke-amber"
                    strokeWidth="30"
                    fill="none"
                    strokeDasharray="60 46"
                    opacity="0.22"
                  />
                )}
                <line
                  x1={g.x1}
                  y1={g.y1}
                  x2={g.x2}
                  y2={g.y2}
                  strokeWidth="2"
                  strokeDasharray="16 22"
                  className={cn(
                    status === "active" && "stroke-amber",
                    status === "notam" && "stroke-amber/40",
                    status === "closed" && "stroke-coral",
                  )}
                >
                  {status === "active" && (
                    <animate attributeName="stroke-dashoffset" from="38" to="0" dur="1.8s" repeatCount="indefinite" />
                  )}
                </line>
                {/* approach cone at the active threshold */}
                {status === "active" && (
                  <polygon
                    points={`${g.x1},${g.y1} ${g.x1 - 26},${g.y1 - 56} ${g.x1 + 26},${g.y1 - 56}`}
                    className="fill-cyan/20"
                    transform={`rotate(${ang - 90} ${g.x1} ${g.y1})`}
                  />
                )}
                <text
                  x={g.x1}
                  y={g.y1 - 14}
                  textAnchor="middle"
                  className={cn("fill-muted-foreground text-[16px]", status === "closed" && "fill-coral")}
                  style={{ fontFamily: "var(--font-mono)" }}
                  transform={`rotate(${ang - 90} ${g.x1} ${g.y1})`}
                >
                  {a}
                </text>
                <text
                  x={g.x2}
                  y={g.y2 + 24}
                  textAnchor="middle"
                  className={cn("fill-muted-foreground text-[16px]", status === "closed" && "fill-coral")}
                  style={{ fontFamily: "var(--font-mono)" }}
                  transform={`rotate(${ang - 90} ${g.x2} ${g.y2})`}
                >
                  {b}
                </text>
              </g>
            );
          })}

          {/* construction zones */}
          {layer === "work" && (
            <>
              <rect x="430" y="660" width="150" height="22" rx="6" className="fill-coral/25 stroke-coral" strokeDasharray="6 4" />
              <text x="505" y="648" textAnchor="middle" className="fill-coral text-[15px]" style={{ fontFamily: "var(--font-mono)" }}>
                TWY B CLOSED
              </text>
              <rect x="300" y="1108" width="130" height="20" rx="6" className="fill-amber/25 stroke-amber" strokeDasharray="6 4" />
              <text x="365" y="1098" textAnchor="middle" className="fill-amber text-[15px]" style={{ fontFamily: "var(--font-mono)" }}>
                E APRON POUR
              </text>
            </>
          )}

          {/* tower */}
          <g pointerEvents="none">
            <circle cx={TOWER.x} cy={TOWER.y} r="7" className="fill-amber" />
            <circle cx={TOWER.x} cy={TOWER.y} r="16" className="fill-none stroke-amber" strokeWidth="1.5" opacity="0.5" />
            <text x={TOWER.x + 22} y={TOWER.y + 5} className="fill-amber text-[15px]" style={{ fontFamily: "var(--font-mono)" }}>
              TWR
            </text>
          </g>

          {/* terminal horseshoes */}
          {PIERS.map((p) => {
            const health = TERMINAL_HEALTH.find((t) => t.terminal === p.t)!;
            const selected = terminal === p.t;
            const dim = (terminal && !selected) || (focus && focused?.terminal !== p.t);
            const d = horseshoePath(p.cx, p.cy, p.open, 78);
            const labelX = p.open === "east" ? p.cx - 46 : p.cx + 46;
            const select = () => onSelectTerminal(selected ? "" : p.t);
            return (
              <g
                key={p.t}
                opacity={dim ? 0.4 : 1}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={`Terminal ${p.t}: ${health.standsAvailable} of ${health.standsTotal} stands available, ${health.openActions} open airfield actions, ${health.overdueActions} overdue, security wait ${health.securityWaitMin} minutes${alertsByTerminal.get(p.t) ? `, ${alertsByTerminal.get(p.t)} active disruptions` : ""}. ${selected ? "Selected — activate to clear focus" : "Activate to open terminal detail"}.`}
                className="cursor-pointer outline-none focus-visible:[&_.hs]:stroke-cyan"
                onClick={select}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    select();
                  }
                }}
              >
                <path d={d} className="fill-none stroke-transparent" strokeWidth="72" pointerEvents="stroke" />
                <path
                  d={d}
                  className={cn("hs fill-none", selected && "stroke-amber")}
                  style={selected ? undefined : { stroke: "color-mix(in oklab, var(--color-foreground) 24%, var(--color-background))" }}
                  strokeWidth="30"
                  strokeLinecap="round"
                />
                <text
                  x={labelX}
                  y={p.cy + 8}
                  textAnchor="middle"
                  className={cn("text-[26px] font-bold", selected ? "fill-amber" : "fill-foreground")}
                >
                  {p.t}
                </text>
                {layer === "gates" &&
                  Array.from({ length: 8 }).map((_, i) => {
                    const ang = (-70 + i * 20) * (Math.PI / 180);
                    const rr = 78;
                    const gx = p.cx + (p.open === "east" ? -1 : 1) * rr * Math.cos(ang);
                    const gy = p.cy + rr * Math.sin(ang);
                    return (
                      <circle
                        key={i}
                        cx={gx}
                        cy={gy}
                        r="6"
                        className={
                          i < Math.round((health.standsAvailable / health.standsTotal) * 8)
                            ? "fill-success"
                            : "fill-amber"
                        }
                      />
                    );
                  })}
                {layer === "actions" && (
                  <>
                    <circle
                      cx={labelX}
                      cy={p.cy + 44}
                      r="18"
                      className={health.overdueActions ? "fill-coral/25" : "fill-cyan/20"}
                    />
                    <text
                      x={labelX}
                      y={p.cy + 50}
                      textAnchor="middle"
                      className={cn("text-[16px]", health.overdueActions ? "fill-coral" : "fill-cyan")}
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {health.openActions}
                    </text>
                  </>
                )}
                {alertsByTerminal.get(p.t) ? (
                  <circle cx={labelX} cy={p.cy - 52} r="8" className="fill-coral" />
                ) : null}
              </g>
            );
          })}

          {/* aircraft targets */}
          {planes.map(({ f, x, y, heading }) => {
            const isFocused = focused?.callsign === f.callsign;
            const dim = (focus && !isFocused) || (terminal && f.terminal !== terminal);
            const tone =
              f.delayMin > 15 ? "text-coral" : f.delayMin > 0 ? "text-amber" : "text-cyan";
            const select = () => onFocusFlight(f);
            return (
              <g
                key={f.id}
                opacity={dim ? 0.35 : 1}
                role="button"
                tabIndex={0}
                aria-pressed={isFocused}
                aria-label={`${f.callsign}, ${f.type} ${f.movement === "arrival" ? `arriving from ${f.origin}` : `departing to ${f.destination}`}, heading ${Math.round((heading + 360) % 360)} degrees, runway ${f.runway}, stand ${f.stand} Terminal ${f.terminal}, ${f.status}${f.delayMin > 0 ? `, ${f.delayMin} minutes delayed` : ", on schedule"}. ${isFocused ? "Focused — activate to clear" : "Activate to open flight detail"}.`}
                className={cn("cursor-pointer outline-none focus-visible:[&_.hit]:stroke-cyan", tone)}
                onClick={select}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    select();
                  }
                }}
              >
                <circle className="hit fill-transparent stroke-transparent" cx={x} cy={y} r="30" strokeWidth="3" pointerEvents="all" />
                {/* fading motion trail */}
                <g transform={`rotate(${heading} ${x} ${y})`}>
                  <line x1={x} y1={y + 12} x2={x} y2={y + 40} stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.35" />
                  <line x1={x} y1={y + 40} x2={x} y2={y + 66} stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.14" />
                  <path
                    d={`M ${x},${y - 13} L ${x + 11},${y + 12} L ${x},${y + 5} L ${x - 11},${y + 12} Z`}
                    fill="currentColor"
                  />
                  {isFocused && (
                    <circle cx={x} cy={y} r="26" className="fill-none stroke-cyan" strokeWidth="2.5" />
                  )}
                </g>
                <text
                  x={x + 20}
                  y={y - 4}
                  className="fill-current text-[15px]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {f.callsign}
                </text>
                <text
                  x={x + 20}
                  y={y + 13}
                  className="fill-muted-foreground text-[13px]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {f.status === "At gate" || f.status === "Taxiing" ? f.stand : f.runway.split("/")[0]}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* touch controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => zoomCenter(1.5)}
          aria-label="Zoom in"
          className="press grid size-11 place-items-center rounded-xl border border-border bg-card/85 backdrop-blur-md"
        >
          <Plus aria-hidden className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => zoomCenter(1 / 1.5)}
          aria-label="Zoom out"
          className="press grid size-11 place-items-center rounded-xl border border-border bg-card/85 backdrop-blur-md"
        >
          <Minus aria-hidden className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => {
            stopMomentum();
            setView({ k: 1, x: 0, y: 0 });
          }}
          aria-label="Recenter airfield"
          className="press grid size-11 place-items-center rounded-xl border border-amber/40 bg-amber/12 text-amber backdrop-blur-md"
        >
          <Crosshair aria-hidden className="size-5" />
        </button>
      </div>

      <p className="mono-data pointer-events-none absolute left-3 top-3 rounded-lg bg-background/70 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur-md">
        ASDE-X · {WIND.flow} · {Math.round(view.k * 10) / 10}×
      </p>
    </div>
  );
}
