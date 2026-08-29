import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useOps } from "@/lib/ops-store";
import { FLIGHTS, RUNWAYS, TERMINAL_HEALTH, WIND, type Flight } from "@/lib/airfield-data";
import { AirfieldRadar, ALL_FILTERS, type RadarFilters } from "@/components/airfield-radar";
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
          <h1 className="text-[26px] font-bold tracking-tight">Airfield map</h1>
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
        <div className="overflow-hidden surface-card p-0">
          <AirfieldRadar
            layer={layer}
            focus={focus}
            terminal={terminal}
            runwayStatus={runwayStatus}
            alertsByTerminal={alertsByTerminal}
            onFocusFlight={(f) => setSearch({ focus: f.callsign === focus ? "" : f.callsign, terminal: "" })}
            onSelectTerminal={(t) => setSearch({ terminal: t, focus: "" })}
          />

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
            <span>Pinch or scroll to zoom · drag to pan · double-tap to zoom in</span>
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
              search: { item: "", status: "open", severity: "", terminal: flight.terminal, runway: "" },
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
              <span className="mono-data w-10 text-right text-xs text-muted-foreground">{f.stand}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
