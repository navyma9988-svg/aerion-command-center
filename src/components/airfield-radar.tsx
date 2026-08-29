import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";
import { FLIGHTS, RUNWAYS, TERMINAL_HEALTH, WIND, type Flight } from "@/lib/airfield-data";
import { PIERS, RUNWAY_GEOM, TAXIWAYS, TOWER, WORLD } from "@/lib/airfield-geo";

/**
 * ASDE-X style ground surveillance display for DFW, drawn from surveyed
 * runway-end coordinates. Purely presentational — all data and selection
 * state comes from props.
 */

export { WORLD, RUNWAY_GEOM };

export type RadarFilters = {
  onTime: boolean;
  delayed: boolean;
  closedAffected: boolean;
  notam: boolean;
};

export const ALL_FILTERS: RadarFilters = {
  onTime: true,
  delayed: true,
  closedAffected: true,
  notam: true,
};

type ViewState = { k: number; x: number; y: number };
const DEFAULT_VIEW: ViewState = { k: 1, x: 0, y: 0 };
const VIEW_KEY = "dfw.radar.view";

/** Session-scoped memory so zoom/pan survives tab switches. */
function readStoredView(): ViewState {
  if (typeof window === "undefined") return DEFAULT_VIEW;
  try {
    const raw = window.sessionStorage.getItem(VIEW_KEY);
    if (!raw) return DEFAULT_VIEW;
    const v = JSON.parse(raw) as ViewState;
    if (typeof v?.k === "number" && typeof v.x === "number" && typeof v.y === "number") return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_VIEW;
}

function horseshoePath(cx: number, cy: number, open: "east" | "west", r: number) {
  const sweep = open === "east" ? 0 : 1;
  return `M ${cx},${cy - r} A ${r},${r} 0 0 ${sweep} ${cx},${cy + r}`;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export interface RadarProps {
  layer: "gates" | "actions" | "work";
  focus: string;
  terminal: string;
  filters?: RadarFilters;
  runwayStatus: Map<string, string>;
  alertsByTerminal: Map<string, number>;
  onFocusFlight: (f: Flight) => void;
  onSelectTerminal: (t: string) => void;
}

export function AirfieldRadar({
  layer,
  focus,
  terminal,
  filters = ALL_FILTERS,
  runwayStatus,
  alertsByTerminal,
  onFocusFlight,
  onSelectTerminal,
}: RadarProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const baseRef = useRef<SVGGElement | null>(null);
  const sweepRef = useRef<SVGGElement | null>(null);
  const [view, setView] = useState<ViewState>(readStoredView);
  const viewRef = useRef(view);
  viewRef.current = view;

  // persist zoom/pan for the session (throttled to idle frames)
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        window.sessionStorage.setItem(VIEW_KEY, JSON.stringify(view));
      } catch {
        /* ignore */
      }
    }, 250);
    return () => window.clearTimeout(id);
  }, [view]);

  // rAF-driven sweep: mutates the DOM directly so it never re-renders React
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const deg = (((now - start) / 6000) * 360) % 360;
      sweepRef.current?.setAttribute("transform", `rotate(${deg} ${TOWER.x} ${TOWER.y})`);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

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
      zoomAt(viewRef.current.k * factor, WORLD.w / 2, WORLD.h / 2);
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
        const len = Math.hypot(dirX, dirY) || 1;
        const nx = -dirY / len;
        const ny = dirX / len;
        const off = f.status === "Taxiing" || f.status === "At gate" ? 26 : 0;
        return {
          f,
          x: lerp(g.x1, g.x2, t) + nx * off,
          y: lerp(g.y1, g.y2, t) + ny * off,
          heading,
        };
      }),
    [],
  );

  const visiblePlanes = useMemo(() => {
    const on = Object.values(filters).some(Boolean);
    if (!on) return [];
    return planes.filter(({ f }) => {
      const st = runwayStatus.get(f.runway) ?? "active";
      if (filters.onTime && f.delayMin === 0) return true;
      if (filters.delayed && f.delayMin > 0) return true;
      if (filters.closedAffected && st === "closed") return true;
      if (filters.notam && st === "notam") return true;
      return false;
    });
  }, [planes, filters, runwayStatus]);

  // live region announcements for status / selection changes
  const [announcement, setAnnouncement] = useState("");
  const statusKey = RUNWAYS.map((r) => `${r.id}:${runwayStatus.get(r.id) ?? "active"}`).join(",");
  useEffect(() => {
    const closed = RUNWAYS.filter((r) => (runwayStatus.get(r.id) ?? "active") === "closed").map((r) => r.id);
    const notam = RUNWAYS.filter((r) => (runwayStatus.get(r.id) ?? "active") === "notam").map((r) => r.id);
    setAnnouncement(
      `Runway status updated. ${closed.length ? `Closed: ${closed.join(", ")}. ` : "No closed runways. "}${
        notam.length ? `NOTAM restricted: ${notam.join(", ")}.` : "No NOTAM restrictions."
      }`,
    );
  }, [statusKey, runwayStatus]);

  useEffect(() => {
    if (focused) {
      setAnnouncement(
        `${focused.callsign} focused. ${focused.movement === "arrival" ? `Arriving from ${focused.origin}` : `Departing to ${focused.destination}`}, runway ${focused.runway}, stand ${focused.stand}, ${focused.status}.`,
      );
    }
  }, [focused]);

  useEffect(() => {
    setAnnouncement(
      `${visiblePlanes.length} of ${planes.length} aircraft shown for the current map filters.`,
    );
  }, [visiblePlanes.length, planes.length]);

  return (
    <div className="relative">
      <p aria-live="polite" role="status" className="sr-only">
        {announcement}
      </p>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-auto max-h-[74dvh] w-full touch-none select-none"
        style={{
          aspectRatio: `${WORLD.w} / ${WORLD.h}`,
          background:
            "radial-gradient(120% 90% at 50% 45%, color-mix(in oklab, var(--color-cyan) 7%, transparent), transparent 70%)",
        }}
        role="group"
        aria-label="DFW ground surveillance display, north up, drawn to surveyed runway geometry. Contains seven runways, five terminal horseshoes and active aircraft. Drag to pan, pinch or scroll to zoom. Tab moves through runways, then terminals, then aircraft; Enter or Space selects."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
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
          <RadarBackdrop k={view.k} sweepRef={sweepRef} />

          {/* runways — true surveyed positions and widths */}
          {RUNWAYS.map((r) => {
            const g = RUNWAY_GEOM[r.id]!;
            const status = runwayStatus.get(r.id) ?? "active";
            const [a, b] = r.id.split("/");
            const ang = (Math.atan2(g.y2 - g.y1, g.x2 - g.x1) * 180) / Math.PI;
            return (
              <g
                key={r.id}
                role="button"
                tabIndex={0}
                aria-label={`Runway ${r.id}, ${r.length}, ${
                  status === "active"
                    ? `active for ${r.flow} flow, ${WIND.approach}`
                    : status === "notam"
                      ? "restricted by NOTAM, amber outline"
                      : "closed, red crosshatch"
                }`}
                className="outline-none focus-visible:[&_.rwy]:stroke-cyan"
              >
                <line
                  className="rwy"
                  x1={g.x1}
                  y1={g.y1}
                  x2={g.x2}
                  y2={g.y2}
                  style={{ stroke: "color-mix(in oklab, var(--color-foreground) 17%, var(--color-background))" }}
                  strokeWidth={g.width}
                />
                {status === "closed" && (
                  <line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke="url(#closed-hatch)" strokeWidth={g.width} />
                )}
                {status === "notam" && (
                  <line
                    x1={g.x1}
                    y1={g.y1}
                    x2={g.x2}
                    y2={g.y2}
                    className="stroke-amber"
                    strokeWidth={g.width + 4}
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
                {status === "active" && (
                  <polygon
                    points={`${g.x1},${g.y1} ${g.x1 - 20},${g.y1 - 46} ${g.x1 + 20},${g.y1 - 46}`}
                    className="fill-cyan/20"
                    transform={`rotate(${ang - 90} ${g.x1} ${g.y1})`}
                  />
                )}
                <text
                  x={g.x1}
                  y={g.y1 - 12}
                  textAnchor="middle"
                  className={cn("fill-muted-foreground text-[15px]", status === "closed" && "fill-coral")}
                  style={{ fontFamily: "var(--font-mono)" }}
                  transform={`rotate(${ang - 90} ${g.x1} ${g.y1})`}
                >
                  {a}
                </text>
                <text
                  x={g.x2}
                  y={g.y2 + 22}
                  textAnchor="middle"
                  className={cn("fill-muted-foreground text-[15px]", status === "closed" && "fill-coral")}
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
              <rect
                x={TOWER.x - 70}
                y={TOWER.y + 60}
                width="140"
                height="18"
                rx="6"
                className="fill-coral/25 stroke-coral"
                strokeDasharray="6 4"
              />
              <text
                x={TOWER.x}
                y={TOWER.y + 52}
                textAnchor="middle"
                className="fill-coral text-[14px]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                TWY B CLOSED
              </text>
              <rect
                x={PIERS.find((p) => p.t === "E")!.x - 60}
                y={PIERS.find((p) => p.t === "E")!.y + 70}
                width="120"
                height="16"
                rx="6"
                className="fill-amber/25 stroke-amber"
                strokeDasharray="6 4"
              />
              <text
                x={PIERS.find((p) => p.t === "E")!.x}
                y={PIERS.find((p) => p.t === "E")!.y + 64}
                textAnchor="middle"
                className="fill-amber text-[14px]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                E APRON POUR
              </text>
            </>
          )}

          {/* tower */}
          <g pointerEvents="none">
            <circle cx={TOWER.x} cy={TOWER.y} r="6" className="fill-amber" />
            <circle cx={TOWER.x} cy={TOWER.y} r="14" className="fill-none stroke-amber" strokeWidth="1.5" opacity="0.5" />
            <text x={TOWER.x + 20} y={TOWER.y + 5} className="fill-amber text-[14px]" style={{ fontFamily: "var(--font-mono)" }}>
              TWR
            </text>
          </g>

          {/* terminal horseshoes */}
          {PIERS.map((p) => {
            const health = TERMINAL_HEALTH.find((t) => t.terminal === p.t)!;
            const selected = terminal === p.t;
            const dim = (terminal && !selected) || (focus && focused?.terminal !== p.t);
            const r = 52;
            const d = horseshoePath(p.x, p.y, p.open, r);
            const labelX = p.open === "east" ? p.x - 32 : p.x + 32;
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
                <path d={d} className="fill-none stroke-transparent" strokeWidth="52" pointerEvents="stroke" />
                <path
                  d={d}
                  className={cn("hs fill-none", selected && "stroke-amber")}
                  style={selected ? undefined : { stroke: "color-mix(in oklab, var(--color-foreground) 24%, var(--color-background))" }}
                  strokeWidth="22"
                  strokeLinecap="round"
                />
                <text
                  x={labelX}
                  y={p.y + 7}
                  textAnchor="middle"
                  className={cn("text-[22px] font-bold", selected ? "fill-amber" : "fill-foreground")}
                >
                  {p.t}
                </text>
                {layer === "gates" &&
                  Array.from({ length: 8 }).map((_, i) => {
                    const ang = (-70 + i * 20) * (Math.PI / 180);
                    const gx = p.x + (p.open === "east" ? -1 : 1) * r * Math.cos(ang);
                    const gy = p.y + r * Math.sin(ang);
                    return (
                      <circle
                        key={i}
                        cx={gx}
                        cy={gy}
                        r="4.5"
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
                      cy={p.y + 34}
                      r="14"
                      className={health.overdueActions ? "fill-coral/25" : "fill-cyan/20"}
                    />
                    <text
                      x={labelX}
                      y={p.y + 39}
                      textAnchor="middle"
                      className={cn("text-[14px]", health.overdueActions ? "fill-coral" : "fill-cyan")}
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {health.openActions}
                    </text>
                  </>
                )}
                {alertsByTerminal.get(p.t) ? (
                  <circle cx={labelX} cy={p.y - 38} r="6" className="fill-coral" />
                ) : null}
              </g>
            );
          })}

          {/* aircraft targets */}
          {visiblePlanes.map(({ f, x, y, heading }) => {
            const isFocused = focused?.callsign === f.callsign;
            const dim = (focus && !isFocused) || (terminal && f.terminal !== terminal);
            const tone = f.delayMin > 15 ? "text-coral" : f.delayMin > 0 ? "text-amber" : "text-cyan";
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
                <circle className="hit fill-transparent stroke-transparent" cx={x} cy={y} r="26" strokeWidth="3" pointerEvents="all" />
                <g transform={`rotate(${heading} ${x} ${y})`}>
                  <line x1={x} y1={y + 10} x2={x} y2={y + 32} stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity="0.35" />
                  <line x1={x} y1={y + 32} x2={x} y2={y + 54} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.14" />
                  <path d={`M ${x},${y - 11} L ${x + 9},${y + 10} L ${x},${y + 4} L ${x - 9},${y + 10} Z`} fill="currentColor" />
                  {isFocused && <circle cx={x} cy={y} r="22" className="fill-none stroke-cyan" strokeWidth="2.5" />}
                </g>
                <text x={x + 16} y={y - 3} className="fill-current text-[14px]" style={{ fontFamily: "var(--font-mono)" }}>
                  {f.callsign}
                </text>
                <text x={x + 16} y={y + 12} className="fill-muted-foreground text-[12px]" style={{ fontFamily: "var(--font-mono)" }}>
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
            setView(DEFAULT_VIEW);
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

/** Static chrome (rings, crosshair, sweep, taxiways) — memoized so pans don't rebuild it. */
const RadarBackdrop = memo(function RadarBackdrop({
  k,
  sweepRef,
}: {
  k: number;
  sweepRef: React.RefObject<SVGGElement | null>;
}) {
  const rings = useMemo(() => [140, 280, 420, 560], []);
  return (
    <g pointerEvents="none">
      {rings.map((r) => (
        <circle key={r} cx={TOWER.x} cy={TOWER.y} r={r} className="fill-none stroke-cyan" strokeWidth={1 / k} opacity="0.14" />
      ))}
      <line x1={TOWER.x} y1={0} x2={TOWER.x} y2={WORLD.h} className="stroke-cyan" strokeWidth={1 / k} opacity="0.08" />
      <line x1={0} y1={TOWER.y} x2={WORLD.w} y2={TOWER.y} className="stroke-cyan" strokeWidth={1 / k} opacity="0.08" />

      <g ref={sweepRef}>
        <path
          d={`M ${TOWER.x},${TOWER.y} L ${TOWER.x + 620},${TOWER.y - 240} A 670,670 0 0 1 ${TOWER.x + 620},${TOWER.y + 240} Z`}
          fill="url(#sweep-grad)"
        />
      </g>

      {TAXIWAYS.map((t, i) => (
        <line
          key={i}
          x1={t.x1}
          y1={t.y1}
          x2={t.x2}
          y2={t.y2}
          style={{ stroke: "color-mix(in oklab, var(--color-foreground) 12%, var(--color-background))" }}
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.9"
        />
      ))}
    </g>
  );
});
