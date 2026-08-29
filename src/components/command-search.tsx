import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { FLIGHTS, TERMINAL_HEALTH } from "@/lib/airfield-data";
import { useOps } from "@/lib/ops-store";
import { Plane, Building2, ClipboardList, TriangleAlert, Radar, Settings2 } from "lucide-react";

export function CommandSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const { alerts, actions, simulation, setSimulation, theme, setTheme } = useOps();
  const [recent, setRecent] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const go = (to: string, search?: Record<string, string>, label?: string) => {
    if (label) setRecent((r) => [label, ...r.filter((x) => x !== label)].slice(0, 5));
    onOpenChange(false);
    void navigate({ to, search: search ?? {} });
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command search"
      description="Search flights, gates, terminals, actions and alerts"
      className="top-[8%] translate-y-0 sm:top-1/2 sm:-translate-y-1/2"
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Flight, gate, runway, action ID, owner…"
      />
      <CommandList className="max-h-[62dvh]">
        <CommandEmpty>
          No match for <span className="mono-data">{query || "—"}</span>. Try an action ID, gate, or
          owner.
        </CommandEmpty>

        {!query && recent.length > 0 && (
          <CommandGroup heading="Recent">
            {recent.map((r) => (
              <CommandItem key={r} onSelect={() => setQuery(r)}>
                <Radar aria-hidden className="text-muted-foreground" />
                {r}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Jump to">
          <CommandItem onSelect={() => go("/")}>
            <Radar aria-hidden /> Pulse — program at a glance
          </CommandItem>
          <CommandItem onSelect={() => go("/queue")}>
            <ClipboardList aria-hidden /> Queue — worst first
          </CommandItem>
          <CommandItem onSelect={() => go("/map")}>
            <Plane aria-hidden /> Airfield map
          </CommandItem>
          <CommandItem onSelect={() => go("/alerts")}>
            <TriangleAlert aria-hidden /> Alerts triage
          </CommandItem>
          <CommandItem onSelect={() => go("/brief")}>
            <Settings2 aria-hidden /> Shift brief
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Flights">
          {FLIGHTS.slice(0, 12).map((f) => (
            <CommandItem
              key={f.id}
              value={`${f.callsign} ${f.tail} ${f.type} ${f.stand} ${f.origin} ${f.destination}`}
              onSelect={() => go("/map", { focus: f.callsign }, f.callsign)}
            >
              <Plane aria-hidden className="text-cyan" />
              <span className="mono-data">{f.callsign}</span>
              <span className="text-muted-foreground">
                {f.movement === "arrival" ? `${f.origin} → DFW` : `DFW → ${f.destination}`}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">{f.stand}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Terminals & stands">
          {TERMINAL_HEALTH.map((t) => (
            <CommandItem
              key={t.terminal}
              value={`Terminal ${t.terminal} stands gates`}
              onSelect={() => go("/map", { terminal: t.terminal }, `Terminal ${t.terminal}`)}
            >
              <Building2 aria-hidden className="text-amber" />
              Terminal {t.terminal}
              <span className="ml-auto text-xs text-muted-foreground">
                {t.standsAvailable}/{t.standsTotal} stands
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Actions">
          {actions.slice(0, 10).map((a) => (
            <CommandItem
              key={a.id}
              value={`${a.id} ${a.title} ${a.owner} ${a.area}`}
              onSelect={() => go("/queue", { action: a.id }, a.id)}
            >
              <ClipboardList aria-hidden className="text-amber" />
              <span className="mono-data">{a.id}</span>
              <span className="truncate text-muted-foreground">{a.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Alerts">
          {alerts.slice(0, 8).map((a) => (
            <CommandItem
              key={a.id}
              value={`${a.id} ${a.title} ${a.source} ${a.runway ?? ""} ${a.terminal ?? ""}`}
              onSelect={() => go("/alerts", { item: a.id }, a.id)}
            >
              <TriangleAlert aria-hidden className="text-coral" />
              <span className="mono-data">{a.id}</span>
              <span className="truncate text-muted-foreground">{a.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Commands">
          <CommandItem
            value="> toggle disruption simulation"
            onSelect={() => {
              setSimulation(!simulation);
              onOpenChange(false);
            }}
          >
            <Radar aria-hidden /> {simulation ? "Stop" : "Start"} disruption simulation
          </CommandItem>
          <CommandItem
            value="> switch theme"
            onSelect={() => {
              setTheme(theme === "dark" ? "light" : "dark");
              onOpenChange(false);
            }}
          >
            <Settings2 aria-hidden /> Switch to {theme === "dark" ? "daylight" : "night"} theme
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
