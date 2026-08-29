import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useOps } from "@/lib/ops-store";
import { FLIGHTS, RUNWAYS, TERMINAL_HEALTH, WIND, type Flight } from "@/lib/airfield-data";
import { cn } from "@/lib/utils";
import { Plane, Crosshair, List } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type Layer = "gates" | "actions" | "work";

function validateSearch(search: Record<string, unknown>) {
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    focus: str(search["focus"]),
    terminal: str(search["terminal"]),
    layer: (str(search["layer"]) || "gates") as Layer,
  };
}

export const Route = createFileRoute("/map")({
  validateSearch,
  head: () => ({
    meta: [
      { title: "Airfield map — DFW Airfield Command" },
      {
        name: "description",
        content:
          "Interactive DFW airfield schematic with terminal overlays, runway and approach indicators, and tap-to-focus on active flights.",
      },
      { property: "og:title", content: "Airfield map — DFW Airfield Command" },
      {
        property: "og:description",
        content: "Terminal overlays, runway status and tap-to-focus aircraft on a DFW schematic.",
      },
    ],
  }),
  component: MapPage,
});

/** Terminal pier geometry in the 0-400 x 0-560 schematic space. */
const PIERS = [
  { t: "A", x: 118, y: 112 },
  { t: "B", x: 258, y: 112 },
  { t: "C", x: 258, y: 268 },
  { t: "D", x: 118, y: 268 },
  { t: "E", x: 118, y: 420 },
] as const;

const RUNWAY_X = [46, 78, 196, 226, 330, 358, 300];

function MapPage() {
  const { alerts, simulation } = useOps();
  const { focus, terminal, layer } = Route.useSearch();
  const navigate = useNavigate({ from: "/map" });
  const [listView, setListView] = useState(false);

  const focused = FLIGHTS.find((f) => f.callsign === focus) ?? null;
  const setSearch = (patch: Record<string, string>) =>
    navigate({ search: (p) => ({ ...p, ...patch }) });

  const runwayStatus = useMemo(() => {
    const m = new Map(RUNWAYS.map((r) => [r.id, r.status as string]));
    if (simulation) m.set("17C/35C", "notam");
    return m;
  }, [simulation]);

  const alertsByTerminal = useMemo(() => {
    const m = new Map<string, number>();
    alerts
      .filter((a) => a.state !== "resolved")
      .forEach((a) => a.terminal && m.set(String(a.terminal), (m.get(String(a.terminal)) ?? 0) + 1));
    return m;
  }, [alerts]);

  return (
    <div className="space-y-4">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold">Airfield map</h1>
          <p className="mono-data text-xs text-muted-foreground">
            {WIND.flow} · {WIND.dir}° / {WIND.kt}kt · {WIND.approach}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setListView((v) => !v)}
          aria-pressed={listView}
          className="press inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-border px-4 text-xs font-medium"
        >
          <List aria-hidden className="size-4" /> {listView ? "Map view" : "List view"}
        </button>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Map overlays">
        {(
          [
            { k: "gates", label: "Gates" },
            { k: "actions", label: "Open actions" },
            { k: "work", label: "Construction" },
          ] as { k: Layer; label: string }[]
        ).map((l) => (
          <button
            key={l.k}
            type="button"
            aria-pressed={layer === l.k}
            onClick={() => setSearch({ layer: l.k })}
            className={cn(
              "press min-h-11 shrink-0 rounded-full border px-4 text-xs font-medium",
              layer === l.k
                ? "border-amber bg-amber/15 text-amber"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {l.label}
          </button>
        ))}
        {(terminal || focus) && (
          <button
            type="button"
            onClick={() => setSearch({ terminal: "", focus: "" })}
            className="press inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-cyan px-4 text-xs font-medium text-cyan"
          >
            <Crosshair aria-hidden className="size-4" /> Recenter
          </button>
        )}
      </div>

      {listView ? (
        <AirfieldList onFocus={(f) => setSearch({ focus: f.callsign })} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <svg
            viewBox="0 0 400 560"
            className="h-[62dvh] w-full touch-pan-y"
            role="img"
            aria-label="DFW airfield schematic with seven runways, five terminals and active aircraft"
          >
            <rect width="400" height="560" fill="transparent" />

            {/* Runways */}
            {RUNWAYS.map((r, i) => {
              const status = runwayStatus.get(r.id) ?? "active";
              const x = RUNWAY_X[i];
              const short = r.id.startsWith("13");
              return (
                <g key={r.id}>
                  <rect
                    x={x}
                    y={short ? 300 : 40}
                    width="16"
                    height={short ? 200 : 480}
                    rx="3"
                    className={cn(
                      status === "closed" ? "fill-coral/20" : "fill-muted",
                      "stroke-border",
                    )}
                    strokeWidth="1"
                    transform={short ? `rotate(-32 ${x + 8} 400)` : undefined}
                  />
                  <line
                    x1={x + 8}
                    y1={short ? 310 : 50}
                    x2={x + 8}
                    y2={short ? 490 : 510}
                    strokeWidth="2"
                    strokeDasharray="10 14"
                    className={cn(
                      status === "active" && "stroke-amber",
                      status === "notam" && "stroke-amber/40",
                      status === "closed" && "stroke-coral",
                    )}
                    transform={short ? `rotate(-32 ${x + 8} 400)` : undefined}
                  >
                    {status === "active" && (
                      <animate
                        attributeName="stroke-dashoffset"
                        from="24"
                        to="0"
                        dur="1.6s"
                        repeatCount="indefinite"
                      />
                    )}
                  </line>
                  <text
                    x={x + 8}
                    y={short ? 296 : 32}
                    textAnchor="middle"
                    className={cn(
                      "fill-muted-foreground text-[9px]",
                      status === "closed" && "fill-coral",
                    )}
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {r.id.split("/")[0]}
                  </text>
                  {/* approach cone on active thresholds, south flow */}
                  {status === "active" && !short && (
                    <polygon
                      points={`${x + 8},44 ${x - 6},14 ${x + 22},14`}
                      className="fill-cyan/25"
                    />
                  )}
                </g>
              );
            })}

            {/* Construction zones */}
            {layer === "work" && (
              <>
                <rect x="150" y="240" width="90" height="18" rx="4" className="fill-coral/25 stroke-coral" strokeDasharray="4 3" />
                <text x="195" y="234" textAnchor="middle" className="fill-coral text-[9px]" style={{ fontFamily: "var(--font-mono)" }}>
                  TWY B CLOSED
                </text>
                <rect x="150" y="404" width="70" height="16" rx="4" className="fill-amber/25 stroke-amber" strokeDasharray="4 3" />
                <text x="185" y="398" textAnchor="middle" className="fill-amber text-[9px]" style={{ fontFamily: "var(--font-mono)" }}>
                  E APRON POUR
                </text>
              </>
            )}

            {/* Terminals */}
            {PIERS.map((p) => {
              const health = TERMINAL_HEALTH.find((t) => t.terminal === p.t)!;
              const selectedT = terminal === p.t;
              const dim = (terminal && !selectedT) || (focus && focused?.terminal !== p.t);
              return (
                <g
                  key={p.t}
                  opacity={dim ? 0.4 : 1}
                  className="cursor-pointer"
                  onClick={() => setSearch({ terminal: selectedT ? "" : p.t, focus: "" })}
                >
                  <rect
                    x={p.x}
                    y={p.y}
                    width="64"
                    height="80"
                    rx="26"
                    className={cn("stroke-border", selectedT ? "fill-elevated" : "fill-secondary")}
                    strokeWidth="1.5"
                  />
                  <text
                    x={p.x + 32}
                    y={p.y + 34}
                    textAnchor="middle"
                    className="fill-foreground text-[15px] font-bold"
                  >
                    {p.t}
                  </text>
                  {layer === "gates" && (
                    <>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <circle
                          key={i}
                          cx={p.x + 12 + (i % 3) * 20}
                          cy={p.y + 52 + Math.floor(i / 3) * 14}
                          r="3.5"
                          className={
                            i < Math.round((health.standsAvailable / health.standsTotal) * 6)
                              ? "fill-success"
                              : "fill-amber"
                          }
                        />
                      ))}
                    </>
                  )}
                  {layer === "actions" && (
                    <>
                      <circle
                        cx={p.x + 32}
                        cy={p.y + 58}
                        r="12"
                        className={health.overdueActions ? "fill-coral/25" : "fill-cyan/20"}
                      />
                      <text
                        x={p.x + 32}
                        y={p.y + 62}
                        textAnchor="middle"
                        className={cn("text-[10px]", health.overdueActions ? "fill-coral" : "fill-cyan")}
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {health.openActions}
                      </text>
                    </>
                  )}
                  {alertsByTerminal.get(p.t) && (
                    <circle cx={p.x + 58} cy={p.y + 8} r="5" className="fill-coral" />
                  )}
                </g>
              );
            })}

            {/* Aircraft pucks */}
            {FLIGHTS.map((f, i) => {
              const rw = RUNWAY_X[RUNWAYS.findIndex((r) => r.id === f.runway)] ?? 200;
              const x = rw + 8 + (i % 2 === 0 ? -22 : 22);
              const y = 60 + f.progress * 420;
              const isFocused = focused?.callsign === f.callsign;
              const dim = (focus && !isFocused) || (terminal && f.terminal !== terminal);
              return (
                <g
                  key={f.id}
                  opacity={dim ? 0.35 : 1}
                  className="cursor-pointer"
                  onClick={() => setSearch({ focus: isFocused ? "" : f.callsign, terminal: "" })}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={isFocused ? 11 : 7}
                    className={cn(
                      f.delayMin > 15 ? "fill-coral" : f.delayMin > 0 ? "fill-amber" : "fill-cyan",
                    )}
                  />
                  <circle cx={x} cy={y} r={isFocused ? 18 : 0} className="fill-none stroke-cyan" strokeWidth="1.5" />
                  {isFocused && (
                    <text
                      x={x + 22}
                      y={y + 4}
                      className="fill-foreground text-[10px]"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {f.callsign} · {f.stand}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          <p className="mono-data flex flex-wrap gap-3 border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span aria-hidden className="size-2 rounded-full bg-cyan" /> On time
            </span>
            <span className="inline-flex items-center gap-1">
              <span aria-hidden className="size-2 rounded-full bg-amber" /> Delayed
            </span>
            <span className="inline-flex items-center gap-1">
              <span aria-hidden className="size-2 rounded-full bg-coral" /> 15+ min
            </span>
            <span>Tap an aircraft or pier to focus</span>
          </p>
        </div>
      )}

      {terminal && (
        <TerminalPanel terminal={terminal} onClose={() => setSearch({ terminal: "" })} />
      )}

      <Drawer open={!!focused} onOpenChange={(o) => !o && setSearch({ focus: "" })}>
        <DrawerContent className="max-h-[88dvh]">
          {focused && <FlightDetail flight={focused} />}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function TerminalPanel({ terminal, onClose }: { terminal: string; onClose: () => void }) {
  const t = TERMINAL_HEALTH.find((x) => x.terminal === terminal);
  if (!t) return null;
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h2 className="text-sm font-bold">Terminal {t.terminal}</h2>
        <button type="button" onClick={onClose} className="press min-h-11 text-xs text-cyan">
          Close
        </button>
      </div>
      <dl className="mono-data mt-2 grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-muted-foreground">Stands available</dt>
          <dd>
            {t.standsAvailable}/{t.standsTotal}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Security wait</dt>
          <dd>{t.securityWaitMin} min</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Open actions</dt>
          <dd>{t.openActions}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Belts</dt>
          <dd>{t.belts}</dd>
        </div>
      </dl>
    </section>
  );
}

function FlightDetail({ flight }: { flight: Flight }) {
  const navigate = useNavigate();
  return (
    <>
      <DrawerHeader className="text-left">
        <DrawerTitle className="flex items-center gap-2 text-base">
          <Plane aria-hidden className="size-4 text-cyan" />
          <span className="mono-data">{flight.callsign}</span>
          <span className="text-sm font-normal text-muted-foreground">
            {flight.movement === "arrival"
              ? `${flight.origin} → DFW`
              : `DFW → ${flight.destination}`}
          </span>
        </DrawerTitle>
        <DrawerDescription>
          {flight.status} · {flight.delayMin > 0 ? `+${flight.delayMin} min` : "on schedule"}
        </DrawerDescription>
      </DrawerHeader>
      <div className="space-y-4 px-4 pb-8">
        <dl className="mono-data grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-muted-foreground">Scheduled</dt>
            <dd>{flight.sched} CT</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Estimated</dt>
            <dd className={flight.delayMin > 0 ? "text-coral" : "text-success"}>{flight.est} CT</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Aircraft</dt>
            <dd>
              {flight.type} · {flight.tail}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Stand</dt>
            <dd>
              {flight.stand} · Terminal {flight.terminal}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Runway</dt>
            <dd>{flight.runway}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Movement</dt>
            <dd className="capitalize">{flight.movement}</dd>
          </div>
        </dl>
        {flight.stand === "C17" || flight.stand === "C21" ? (
          <p className="rounded-lg bg-coral/10 p-3 text-sm text-coral">
            Reprotected from Stand C14 — jet bridge hydraulic fault (AF-127).
          </p>
        ) : null}
        <button
          type="button"
          onClick={() =>
            navigate({
              to: "/alerts",
              search: { item: "", status: "open", severity: "", terminal: flight.terminal, runway: "" },
            })
          }
          className="press min-h-11 w-full rounded-lg border border-border text-sm font-medium"
        >
          View Terminal {flight.terminal} disruptions
        </button>
      </div>
    </>
  );
}

function AirfieldList({ onFocus }: { onFocus: (f: Flight) => void }) {
  return (
    <section className="rounded-xl border border-border bg-card p-3">
      <h2 className="text-sm font-bold">Active movements</h2>
      <ul className="mt-2 divide-y divide-border">
        {FLIGHTS.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => onFocus(f)}
              className="press flex min-h-11 w-full items-center gap-3 py-2 text-left"
            >
              <span className="mono-data text-xs font-semibold">{f.callsign}</span>
              <span className="truncate text-xs text-muted-foreground">
                {f.movement === "arrival" ? `${f.origin} → DFW` : `DFW → ${f.destination}`}
              </span>
              <span
                className={cn(
                  "mono-data ml-auto text-xs",
                  f.delayMin > 15 ? "text-coral" : f.delayMin > 0 ? "text-amber" : "text-success",
                )}
              >
                {f.est}
              </span>
              <span className="mono-data w-10 text-right text-xs text-muted-foreground">{f.stand}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
