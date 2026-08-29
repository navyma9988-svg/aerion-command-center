import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useOps } from "@/lib/ops-store";
import {
  AIRPORT,
  OWNERS,
  IMPACTS,
  RUNWAYS,
  SEVERITY_LABEL,
  STATE_LABEL,
  TERMINALS,
  type OpsAlert,
  type Severity,
} from "@/lib/airfield-data";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Check, ChevronLeft, ChevronRight, ShieldAlert, X } from "lucide-react";

const STATUS_TABS = [
  { key: "open", label: "Open", states: ["new"] },
  { key: "ack", label: "Acknowledged", states: ["acknowledged"] },
  { key: "progress", label: "In progress", states: ["in_progress"] },
  { key: "resolved", label: "Resolved", states: ["resolved", "dismissed"] },
] as const;

function validateSearch(search: Record<string, unknown>) {
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    item: str(search["item"]),
    status: str(search["status"]) || "open",
    severity: str(search["severity"]),
    terminal: str(search["terminal"]),
    runway: str(search["runway"]),
  };
}

export const Route = createFileRoute("/alerts")({
  validateSearch,
  head: () => ({
    meta: [
      { title: "Alerts triage — DFW Airfield Command" },
      {
        name: "description",
        content:
          "Acknowledge, prioritize and resolve DFW airfield disruptions filtered by severity, status, terminal and runway.",
      },
      { property: "og:title", content: "Alerts triage — DFW Airfield Command" },
      {
        property: "og:description",
        content: "Acknowledge, prioritize and resolve DFW airfield disruptions from your phone.",
      },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const { alerts, acknowledge, triage, resolve, currentUser } = useOps();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/alerts" });
  const [mineOnly, setMineOnly] = useState(false);

  const tab = STATUS_TABS.find((t) => t.key === search.status) ?? STATUS_TABS[0]!;
  const sevFilter = search.severity ? search.severity.split(",").filter(Boolean) : [];
  const terminalFilter = search.terminal ? search.terminal.split(",").filter(Boolean) : [];

  const filtered = useMemo(
    () =>
      alerts.filter((a) => {
        if (!(tab.states as readonly string[]).includes(a.state)) return false;
        if (sevFilter.length && !sevFilter.includes(a.severity)) return false;
        if (terminalFilter.length && !terminalFilter.includes(String(a.terminal))) return false;
        if (search.runway && a.runway !== search.runway) return false;
        if (mineOnly && !a.activity.some((e) => e.who === currentUser)) return false;
        return true;
      }),
    [alerts, tab, search.runway, search.severity, search.terminal, mineOnly, currentUser],
  );

  const counts = Object.fromEntries(
    STATUS_TABS.map((t) => [
      t.key,
      alerts.filter((a) => (t.states as readonly string[]).includes(a.state)).length,
    ]),
  ) as Record<string, number>;

  const index = filtered.findIndex((a) => a.id === search.item);
  const selected = index >= 0 ? (filtered[index] ?? null) : null;

  const setSearch = (patch: Record<string, string>) =>
    navigate({ search: (p) => ({ ...p, ...patch }) });

  const toggleMulti = (key: "severity" | "terminal", value: string) => {
    const cur = (search[key] ? search[key].split(",") : []).filter(Boolean);
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
    setSearch({ [key]: next.join(",") });
  };

  const activeFilterCount =
    sevFilter.length + terminalFilter.length + (search.runway ? 1 : 0) + (mineOnly ? 1 : 0);

  return (
    <div className="space-y-4">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold">Disruption triage</h1>
          <p className="mono-data text-xs text-muted-foreground">
            {filtered.length} of {alerts.length} items · {AIRPORT.asOf} {AIRPORT.timezone}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMineOnly((v) => !v)}
          aria-pressed={mineOnly}
          className={cn(
            "press min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium",
            mineOnly ? "border-cyan bg-cyan/15 text-cyan" : "border-border bg-card text-muted-foreground",
          )}
        >
          Mine
        </button>
      </header>

      <div role="tablist" aria-label="Triage status" className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={t.key === tab.key}
            onClick={() => setSearch({ status: t.key, item: "" })}
            className={cn(
              "press min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium",
              t.key === tab.key
                ? "border-amber bg-amber/15 text-amber"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {t.label}
            <span className="mono-data ml-2 text-xs opacity-70">{counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      <fieldset className="w-full min-w-0 space-y-2">
        <legend className="sr-only">Filters</legend>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["p1", "p2", "p3"] as Severity[]).map((s) => (
            <FilterChip
              key={s}
              active={sevFilter.includes(s)}
              onClick={() => toggleMulti("severity", s)}
              tone={s === "p1" ? "coral" : s === "p2" ? "amber" : "cyan"}
            >
              {SEVERITY_LABEL[s]}
            </FilterChip>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[...TERMINALS, "Airside"].map((t) => (
            <FilterChip
              key={t}
              active={terminalFilter.includes(t)}
              onClick={() => toggleMulti("terminal", t)}
            >
              {t === "Airside" ? "Airside" : `Terminal ${t}`}
            </FilterChip>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {RUNWAYS.map((r) => (
            <FilterChip
              key={r.id}
              active={search.runway === r.id}
              onClick={() => setSearch({ runway: search.runway === r.id ? "" : r.id })}
            >
              <span className="mono-data">{r.id}</span>
            </FilterChip>
          ))}
        </div>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setMineOnly(false);
              setSearch({ severity: "", terminal: "", runway: "" });
            }}
            className="press min-h-11 text-xs font-medium text-cyan"
          >
            Clear all · {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"}
          </button>
        )}
      </fieldset>

      <ul className="space-y-2">
        {filtered.map((a) => (
          <li key={a.id}>
            <AlertCard alert={a} onOpen={() => setSearch({ item: a.id })} onAck={() => acknowledge(a.id)} />
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nothing open under these filters. Last item cleared 05:41 CT.
          </li>
        )}
      </ul>

      <TriageSheet
        alert={selected}
        position={index + 1}
        total={filtered.length}
        onClose={() => setSearch({ item: "" })}
        onStep={(dir) => {
          const next = filtered[index + dir];
          if (next) setSearch({ item: next.id });
        }}
        onAck={acknowledge}
        onTriage={triage}
        onResolve={resolve}
      />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "coral" | "amber" | "cyan";
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "press min-h-11 shrink-0 rounded-full border px-3.5 text-xs font-medium",
        !active && "border-border bg-card text-muted-foreground",
        active && tone === "coral" && "border-coral bg-coral/15 text-coral",
        active && tone === "amber" && "border-amber bg-amber/15 text-amber",
        active && (tone === "cyan" || !tone) && "border-cyan bg-cyan/15 text-cyan",
      )}
    >
      {children}
    </button>
  );
}

function AlertCard({
  alert,
  onOpen,
  onAck,
}: {
  alert: OpsAlert;
  onOpen: () => void;
  onAck: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <button type="button" onClick={onOpen} className="press w-full p-3 text-left hover:bg-elevated">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "mono-data rounded px-1.5 py-0.5 text-[10px] font-semibold",
              alert.severity === "p1" && "bg-coral/20 text-coral",
              alert.severity === "p2" && "bg-amber/20 text-amber",
              alert.severity === "p3" && "bg-cyan/20 text-cyan",
            )}
          >
            {alert.severity.toUpperCase()}
          </span>
          <span className="mono-data text-xs">{alert.id}</span>
          <span className="mono-data text-[11px] text-muted-foreground">
            {alert.time} {AIRPORT.timezone} · {alert.source}
          </span>
          <span className="mono-data ml-auto text-[10px] uppercase text-muted-foreground">
            {STATE_LABEL[alert.state]}
          </span>
        </div>
        <p className="mt-1.5 text-sm font-medium">{alert.title}</p>
        <p className="mono-data mt-1 text-[11px] text-muted-foreground">
          {[alert.runway, alert.taxiway && `Taxiway ${alert.taxiway}`, alert.stand, alert.terminal && `Terminal ${alert.terminal}`]
            .filter(Boolean)
            .join(" · ") || "Airside"}{" "}
          · {alert.impact}
        </p>
        {alert.state === "new" && alert.escalatesInMin && (
          <p className="mono-data mt-1 text-[11px] text-coral">
            Escalates to program manager in {alert.escalatesInMin}m
          </p>
        )}
      </button>
      {alert.state === "new" && (
        <div className="border-t border-border px-3 py-2">
          <button
            type="button"
            onClick={onAck}
            className="press inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-cyan"
          >
            <Check aria-hidden className="size-4" /> Acknowledge
          </button>
        </div>
      )}
    </div>
  );
}

function TriageSheet({
  alert,
  position,
  total,
  onClose,
  onStep,
  onAck,
  onTriage,
  onResolve,
}: {
  alert: OpsAlert | null;
  position: number;
  total: number;
  onClose: () => void;
  onStep: (dir: 1 | -1) => void;
  onAck: (id: string) => void;
  onTriage: (id: string, patch: { severity: Severity; owner: string; impact: string; note?: string }) => void;
  onResolve: (id: string, note: string) => void;
}) {
  const [mode, setMode] = useState<"detail" | "prioritize" | "resolve">("detail");
  const [severity, setSeverity] = useState<Severity>("p2");
  const [owner, setOwner] = useState(OWNERS[0]!.name);
  const [impact, setImpact] = useState(IMPACTS[0]!);
  const [note, setNote] = useState("");
  const touchX = useRef<number | null>(null);

  if (!alert) return null;

  const steps: { key: string; label: string }[] = [
    { key: "new", label: "New" },
    { key: "acknowledged", label: "Ack" },
    { key: "in_progress", label: "Triaged" },
    { key: "resolved", label: "Resolved" },
  ];
  const stepIndex = steps.findIndex((s) => s.key === alert.state);

  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[92dvh]">
        <div
          className="flex max-h-[88dvh] min-h-0 flex-col"
          onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
            if (Math.abs(dx) > 60) onStep(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") onStep(1);
            if (e.key === "ArrowLeft") onStep(-1);
          }}
          tabIndex={-1}
        >
          <DrawerHeader className="text-left">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "mono-data rounded px-1.5 py-0.5 text-[10px] font-semibold",
                  alert.severity === "p1" && "bg-coral/20 text-coral",
                  alert.severity === "p2" && "bg-amber/20 text-amber",
                  alert.severity === "p3" && "bg-cyan/20 text-cyan",
                )}
              >
                {SEVERITY_LABEL[alert.severity]}
              </span>
              <span className="mono-data text-xs">{alert.id}</span>
              <span className="mono-data ml-auto text-[11px] text-muted-foreground">
                {position} of {total}
              </span>
            </div>
            <DrawerTitle className="text-base">{alert.title}</DrawerTitle>
            <DrawerDescription>{alert.detail}</DrawerDescription>
          </DrawerHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
            <ol className="flex items-center gap-1" aria-label="Triage progress">
              {steps.map((s, i) => (
                <li key={s.key} className="flex flex-1 flex-col gap-1">
                  <span
                    className={cn(
                      "h-1.5 rounded-full",
                      i <= stepIndex ? "bg-cyan" : "bg-secondary",
                    )}
                  />
                  <span className="mono-data text-[10px] text-muted-foreground">{s.label}</span>
                </li>
              ))}
            </ol>

            <dl className="mono-data grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-muted-foreground">Raised</dt>
                <dd>
                  {alert.time} {AIRPORT.timezone} · {alert.source}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Impact</dt>
                <dd>{alert.impact}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Asset</dt>
                <dd>{alert.runway ?? alert.stand ?? (alert.taxiway ? `Taxiway ${alert.taxiway}` : alert.terminal ?? "Airside")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Linked action</dt>
                <dd>{alert.linkedAction ?? "—"}</dd>
              </div>
            </dl>

            {mode === "prioritize" && (
              <section className="space-y-3 rounded-lg border border-border p-3">
                <h3 className="text-sm font-bold">Prioritize</h3>
                <div className="flex flex-wrap gap-2">
                  {(["p1", "p2", "p3"] as Severity[]).map((s) => (
                    <FilterChip key={s} active={severity === s} onClick={() => setSeverity(s)}>
                      {SEVERITY_LABEL[s]}
                    </FilterChip>
                  ))}
                </div>
                <label className="block text-xs text-muted-foreground" htmlFor="triage-owner">
                  Owner
                </label>
                <select
                  id="triage-owner"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="min-h-11 w-full rounded-lg border border-input bg-card px-3 text-sm"
                >
                  {OWNERS.map((o) => (
                    <option key={o.initials}>{o.name}</option>
                  ))}
                </select>
                <label className="block text-xs text-muted-foreground" htmlFor="triage-impact">
                  Impact
                </label>
                <select
                  id="triage-impact"
                  value={impact}
                  onChange={(e) => setImpact(e.target.value)}
                  className="min-h-11 w-full rounded-lg border border-input bg-card px-3 text-sm"
                >
                  {IMPACTS.map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
                <label className="block text-xs text-muted-foreground" htmlFor="triage-note">
                  Note (optional)
                </label>
                <textarea
                  id="triage-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-input bg-card p-2 text-sm"
                  placeholder="Crew mobilized, target restore 1800 CT"
                />
                <button
                  type="button"
                  onClick={() => {
                    onTriage(alert.id, { severity, owner, impact, note });
                    setNote("");
                    setMode("detail");
                  }}
                  className="press min-h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
                >
                  Set priority and assign
                </button>
              </section>
            )}

            {mode === "resolve" && (
              <section className="space-y-3 rounded-lg border border-border p-3">
                <h3 className="text-sm font-bold">Resolve</h3>
                <label className="block text-xs text-muted-foreground" htmlFor="resolve-note">
                  Closure note (required)
                </label>
                <textarea
                  id="resolve-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-input bg-card p-2 text-sm"
                  placeholder="Runway 17C inspection complete, returned to service 05:12 CT"
                />
                <button
                  type="button"
                  disabled={!note.trim()}
                  onClick={() => {
                    onResolve(alert.id, note.trim());
                    setNote("");
                    setMode("detail");
                  }}
                  className="press min-h-11 w-full rounded-lg bg-success text-sm font-semibold text-background disabled:opacity-50"
                >
                  Resolve item
                </button>
              </section>
            )}

            <section>
              <h3 className="text-sm font-bold">Activity</h3>
              <ol className="mt-2 space-y-2 border-l border-border pl-3">
                {alert.activity.map((ev, i) => (
                  <li key={i} className="text-sm">
                    <p>{ev.text}</p>
                    <p className="mono-data text-[11px] text-muted-foreground">
                      {ev.who} · {ev.at} {AIRPORT.timezone}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onStep(-1)}
                disabled={position <= 1}
                aria-label="Previous item"
                className="press grid size-11 place-items-center rounded-lg border border-border disabled:opacity-40"
              >
                <ChevronLeft aria-hidden className="size-5" />
              </button>
              <p className="mono-data text-[11px] text-muted-foreground">Swipe or use arrow keys</p>
              <button
                type="button"
                onClick={() => onStep(1)}
                disabled={position >= total}
                aria-label="Next item"
                className="press grid size-11 place-items-center rounded-lg border border-border disabled:opacity-40"
              >
                <ChevronRight aria-hidden className="size-5" />
              </button>
            </div>
          </div>

          <div className="safe-bottom sticky bottom-0 grid grid-cols-3 gap-2 border-t border-border bg-popover p-3">
            <button
              type="button"
              onClick={() => onAck(alert.id)}
              disabled={alert.state !== "new"}
              className="press inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-border text-sm font-medium disabled:opacity-40"
            >
              <Check aria-hidden className="size-4" /> Ack
            </button>
            <button
              type="button"
              onClick={() => setMode(mode === "prioritize" ? "detail" : "prioritize")}
              aria-expanded={mode === "prioritize"}
              className="press inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-amber text-sm font-semibold text-amber-foreground"
            >
              <ShieldAlert aria-hidden className="size-4" /> Prioritize
            </button>
            <button
              type="button"
              onClick={() => setMode(mode === "resolve" ? "detail" : "resolve")}
              aria-expanded={mode === "resolve"}
              disabled={alert.state === "resolved"}
              className="press inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-border text-sm font-medium disabled:opacity-40"
            >
              <X aria-hidden className="size-4" /> Resolve
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
