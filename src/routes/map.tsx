import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useOps } from "@/lib/ops-store";
import { FLIGHTS, RUNWAYS, TERMINAL_HEALTH, WIND, type Flight } from "@/lib/airfield-data";
import { AirfieldRadar, ALL_FILTERS, type RadarFilters } from "@/components/airfield-radar";
import { cn } from "@/lib/utils";
import { Layers3, List, Plane, Radar, Satellite, Zap } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { OpsButton } from "@/components/ops-button";

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

const FILTER_KEY = "dfw.radar.filters";
const FOCUS_KEY = "dfw.radar.focus";
const DISPLAY_KEY = "dfw.radar.display";
type DisplayMode = "aerial" | "surveillance";

const FILTER_META: { k: keyof RadarFilters; label: string }[] = [
  { k: "onTime", label: "On time" },
  { k: "delayed", label: "Delayed" },
  { k: "closedAffected", label: "Closed rwy" },
  { k: "notam", label: "NOTAM" },
];

function MapPage() {
  const { alerts, simulation } = useOps();
  const { focus, terminal, layer } = Route.useSearch();
  const navigate = useNavigate({ from: "/map" });
  const [listView, setListView] = useState(false);
  const [controlPanelOpen, setControlPanelOpen] = useState(false);
  const controlTriggerRef = useRef<HTMLButtonElement>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    if (typeof window === "undefined") return "aerial";
    return window.sessionStorage.getItem(DISPLAY_KEY) === "surveillance"
      ? "surveillance"
      : "aerial";
  });
  const [filters, setFilters] = useState<RadarFilters>(() => {
    if (typeof window === "undefined") return ALL_FILTERS;
    try {
      const raw = window.sessionStorage.getItem(FILTER_KEY);
      return raw ? { ...ALL_FILTERS, ...(JSON.parse(raw) as Partial<RadarFilters>) } : ALL_FILTERS;
    } catch {
      return ALL_FILTERS;
    }
  });

  const focused = FLIGHTS.find((f) => f.callsign === focus) ?? null;
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const setSearch = (patch: Record<string, string>) =>
    navigate({ search: (p) => ({ ...p, ...patch }) });

  // remember filter selection and the last focused aircraft across tab switches
  useEffect(() => {
    try {
      window.sessionStorage.setItem(FILTER_KEY, JSON.stringify(filters));
    } catch {
      /* ignore */
    }
  }, [filters]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(DISPLAY_KEY, displayMode);
    } catch {
      /* ignore */
    }
  }, [displayMode]);

  useEffect(() => {
    try {
      if (focus) window.sessionStorage.setItem(FOCUS_KEY, focus);
    } catch {
      /* ignore */
    }
  }, [focus]);

  useEffect(() => {
    if (focus || terminal) return;
    let last = "";
    try {
      last = window.sessionStorage.getItem(FOCUS_KEY) ?? "";
    } catch {
      /* ignore */
    }
    if (last && FLIGHTS.some((f) => f.callsign === last)) {
      navigate({ search: (p) => ({ ...p, focus: last }), replace: true });
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runwayStatus = useMemo(() => {
    const m = new Map(RUNWAYS.map((r) => [r.id, r.status as string]));
    if (simulation) m.set("17C/35C", "notam");
    return m;
  }, [simulation]);

  const alertsByTerminal = useMemo(() => {
    const m = new Map<string, number>();
    alerts
      .filter((a) => a.state !== "resolved")
      .forEach(
        (a) => a.terminal && m.set(String(a.terminal), (m.get(String(a.terminal)) ?? 0) + 1),
      );
    return m;
  }, [alerts]);

  return (
    <div className="space-y-4">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-success">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-success shadow-[0_0_10px_var(--color-success)]"
            />
            Simulated field view
          </p>
          <h1 className="text-[26px] font-bold tracking-tight">Airfield map</h1>
          <p className="mono-data text-xs text-muted-foreground">
            {WIND.flow} · {WIND.dir}° / {WIND.kt}kt · {WIND.approach}
          </p>
        </div>
        <div className="flex gap-2">
          <OpsButton
            onClick={() => setListView((v) => !v)}
            aria-pressed={listView}
            size="icon"
            aria-label={listView ? "Show map view" : "Show list view"}
          >
            <List aria-hidden />
          </OpsButton>
          <OpsButton
            onClick={() => window.dispatchEvent(new Event("aerion:quick-actions"))}
            intent="brand"
            emphasis="outline"
            size="icon"
            aria-label="Open mission actions"
          >
            <Zap aria-hidden />
          </OpsButton>
        </div>
      </header>

      {!listView && (
        <div className="map-mode-bar">
          <div className="map-mode-switch" role="group" aria-label="Map display">
            <button
              type="button"
              aria-pressed={displayMode === "aerial"}
              onClick={() => setDisplayMode("aerial")}
              className={cn("press", displayMode === "aerial" && "map-mode-switch__active")}
            >
              <Satellite aria-hidden className="size-4" /> Aerial
            </button>
            <button
              type="button"
              aria-pressed={displayMode === "surveillance"}
              onClick={() => setDisplayMode("surveillance")}
              className={cn("press", displayMode === "surveillance" && "map-mode-switch__active")}
            >
              <Radar aria-hidden className="size-4" /> ASDE-X
            </button>
          </div>
          <OpsButton
            ref={controlTriggerRef}
            onClick={() => setControlPanelOpen(true)}
            intent="neutral"
            emphasis="ghost"
            size="compact"
            className="map-control-trigger"
            aria-label={`Open map controls. ${layer} overlay and ${activeFilterCount} traffic filters active.`}
          >
            <Layers3 aria-hidden />
            <span>Controls</span>
            <span className="map-control-trigger__count mono-data" aria-hidden>
              {activeFilterCount}
            </span>
          </OpsButton>
        </div>
      )}

      {listView ? (
        <AirfieldList onFocus={(f) => setSearch({ focus: f.callsign })} />
      ) : (
        <div className="overflow-hidden surface-card p-0">
          <AirfieldRadar
            displayMode={displayMode}
            layer={layer}
            focus={focus}
            terminal={terminal}
            filters={filters}
            runwayStatus={runwayStatus}

            alertsByTerminal={alertsByTerminal}
            onFocusFlight={(f) =>
              setSearch({ focus: f.callsign === focus ? "" : f.callsign, terminal: "" })
            }
            onSelectTerminal={(t) => setSearch({ terminal: t, focus: "" })}
          />

          <p className="mono-data flex flex-wrap gap-x-3 gap-y-1 border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span aria-hidden className="size-2 rounded-full bg-cyan" /> On time
            </span>
            <span className="inline-flex items-center gap-1">
              <span aria-hidden className="size-2 rounded-full bg-amber" /> Delayed
            </span>
            <span className="inline-flex items-center gap-1">
              <span aria-hidden className="size-2 rounded-full bg-coral" /> 15+ min
            </span>
            <span className="basis-full sm:basis-auto">
              Pinch or scroll to zoom · drag to pan · double-tap to zoom in
            </span>
          </p>
        </div>
      )}

      <Drawer open={!!terminal} onOpenChange={(o) => !o && setSearch({ terminal: "" })}>
        <DrawerContent className="max-h-[80dvh]">
          {terminal && <TerminalPanel terminal={terminal} />}
        </DrawerContent>
      </Drawer>

      <Drawer open={!!focused} onOpenChange={(o) => !o && setSearch({ focus: "" })}>
        <DrawerContent className="max-h-[88dvh]">
          {focused && <FlightDetail flight={focused} />}
        </DrawerContent>
      </Drawer>

      <Drawer open={controlPanelOpen} onOpenChange={setControlPanelOpen}>
        <DrawerContent
          className="max-h-[82dvh]"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            controlTriggerRef.current?.focus();
          }}
        >
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2 text-base">
              <Layers3 aria-hidden className="size-4 text-amber" /> Map controls
            </DrawerTitle>
            <DrawerDescription>
              {layer === "gates"
                ? "Gate availability"
                : layer === "actions"
                  ? "Open airfield actions"
                  : "Construction and closures"}
              {` · ${activeFilterCount} of ${FILTER_META.length} traffic groups visible`}
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-5 px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
            <section aria-labelledby="map-overlay-heading">
              <h2
                id="map-overlay-heading"
                className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                Operational overlay
              </h2>
              <div className="map-control-grid" role="group" aria-label="Map overlays">
                {(
                  [
                    { k: "gates", label: "Gates" },
                    { k: "actions", label: "Open actions" },
                    { k: "work", label: "Construction" },
                  ] as { k: Layer; label: string }[]
                ).map((item) => (
                  <button
                    key={item.k}
                    type="button"
                    aria-pressed={layer === item.k}
                    onClick={() => setSearch({ layer: item.k })}
                    className="map-segment-control"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            <section aria-labelledby="map-traffic-heading">
              <h2
                id="map-traffic-heading"
                className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                Traffic visibility
              </h2>
              <div className="map-filter-grid" role="group" aria-label="Traffic filters">
                {FILTER_META.map((item) => (
                  <button
                    key={item.k}
                    type="button"
                    aria-pressed={filters[item.k]}
                    onClick={() =>
                      setFilters((previous) => ({
                        ...previous,
                        [item.k]: !previous[item.k],
                      }))
                    }
                    className="map-filter-control"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function TerminalPanel({ terminal }: { terminal: string }) {
  const t = TERMINAL_HEALTH.find((x) => x.terminal === terminal);
  if (!t) return null;
  return (
    <>
      <DrawerHeader className="text-left">
        <DrawerTitle className="text-base">Terminal {t.terminal}</DrawerTitle>
        <DrawerDescription>
          {t.standsAvailable} of {t.standsTotal} stands available · {t.openActions} open actions
        </DrawerDescription>
      </DrawerHeader>
      <dl className="mono-data grid grid-cols-2 gap-3 px-4 pb-8 text-xs">
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
    </>
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
          <p className="rounded-xl bg-coral/10 p-3 text-sm text-coral">
            Reprotected from Stand C14 — jet bridge hydraulic fault (AF-127).
          </p>
        ) : null}
        <button
          type="button"
          onClick={() =>
            navigate({
              to: "/alerts",
              search: {
                item: "",
                status: "open",
                severity: "",
                terminal: flight.terminal,
                runway: "",
              },
            })
          }
          className="press min-h-11 w-full rounded-xl border border-border text-sm font-medium"
        >
          View Terminal {flight.terminal} disruptions
        </button>
      </div>
    </>
  );
}

function AirfieldList({ onFocus }: { onFocus: (f: Flight) => void }) {
  return (
    <section className="surface-card p-4">
      <h2 className="text-[17px] font-semibold tracking-tight">Active movements</h2>
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
              <span className="mono-data w-10 text-right text-xs text-muted-foreground">
                {f.stand}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
