import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useOps, type AuditEntry } from "@/lib/ops-store";
import {
  AIRPORT,
  OWNERS,
  IMPACTS,
  RUNWAYS,
  AUDIT_KIND_LABEL,
  ROLES,
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
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileDown,
  FileJson,
  Filter,
  Lock,
  MapPin,
  RadioTower,
  Send,
  ShieldAlert,
  Sliders,
  Table,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { printDisruptionSummary } from "@/lib/disruption-pdf";
import { exportAuditCsv, exportAuditJson } from "@/lib/audit-export";
import { OpsButton } from "@/components/ops-button";

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
  const { alerts, acknowledge, triage, resolve, currentUser, addNote, auditFor } = useOps();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/alerts" });
  const [mineOnly, setMineOnly] = useState(false);
  const [filterBank, setFilterBank] = useState<"severity" | "terminal" | "runway" | null>(
    "severity",
  );
  const statusRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const tab = STATUS_TABS.find((t) => t.key === search.status) ?? STATUS_TABS[0]!;
  const sevFilter = useMemo(
    () => (search.severity ? search.severity.split(",").filter(Boolean) : []),
    [search.severity],
  );
  const terminalFilter = useMemo(
    () => (search.terminal ? search.terminal.split(",").filter(Boolean) : []),
    [search.terminal],
  );

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
    [alerts, tab, search.runway, sevFilter, terminalFilter, mineOnly, currentUser],
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
    <div className="stagger-in space-y-4">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold tracking-tight">Disruption triage</h1>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 aria-hidden className="size-3.5" />
            <span>
              {filtered.length} of {alerts.length} items · {AIRPORT.asOf} {AIRPORT.timezone}
            </span>
          </p>
        </div>
        <OpsButton
          onClick={() => setMineOnly((v) => !v)}
          aria-pressed={mineOnly}
          intent={mineOnly ? "brand" : "neutral"}
          emphasis="outline"
          size="compact"
        >
          <UserRound aria-hidden />
          Mine
        </OpsButton>
      </header>

      <div role="tablist" aria-label="Triage status" className="triage-status-grid">
        {STATUS_TABS.map((t, tabIndex) => (
          <button
            key={t.key}
            ref={(node) => {
              statusRefs.current[tabIndex] = node;
            }}
            role="tab"
            aria-selected={t.key === tab.key}
            tabIndex={t.key === tab.key ? 0 : -1}
            onClick={() => setSearch({ status: t.key, item: "" })}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              const direction = event.key === "ArrowRight" ? 1 : -1;
              const next = (tabIndex + direction + STATUS_TABS.length) % STATUS_TABS.length;
              statusRefs.current[next]?.focus();
              statusRefs.current[next]?.click();
            }}
            className="triage-status-grid__tab"
          >
            <span className="mono-data triage-status-grid__count">{counts[t.key] ?? 0}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <FilterConsole
        openBank={filterBank}
        onOpenBank={(bank) => setFilterBank((current) => (current === bank ? null : bank))}
        sevFilter={sevFilter}
        terminalFilter={terminalFilter}
        runway={search.runway}
        activeFilterCount={activeFilterCount}
        onToggleSeverity={(severity) => toggleMulti("severity", severity)}
        onToggleTerminal={(terminal) => toggleMulti("terminal", terminal)}
        onToggleRunway={(runway) => setSearch({ runway: search.runway === runway ? "" : runway })}
        onClear={() => {
          setMineOnly(false);
          setSearch({ severity: "", terminal: "", runway: "" });
        }}
      />

      <EscalationRulesPanel />

      <ul className="space-y-2">
        {filtered.map((a) => (
          <li key={a.id}>
            <AlertCard
              alert={a}
              onOpen={() => setSearch({ item: a.id })}
              onAck={() => acknowledge(a.id)}
            />
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="empty-state">
            <span className="empty-state__icon">
              <RadioTower aria-hidden className="size-5" />
            </span>
            <span>Nothing open under these filters · cleared 05:41 CT</span>
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
        onNote={addNote}
        trail={selected ? auditFor(selected.id) : []}
        currentUser={currentUser}
      />
    </div>
  );
}

function FilterConsole({
  openBank,
  onOpenBank,
  sevFilter,
  terminalFilter,
  runway,
  activeFilterCount,
  onToggleSeverity,
  onToggleTerminal,
  onToggleRunway,
  onClear,
}: {
  openBank: "severity" | "terminal" | "runway" | null;
  onOpenBank: (bank: "severity" | "terminal" | "runway") => void;
  sevFilter: string[];
  terminalFilter: string[];
  runway: string;
  activeFilterCount: number;
  onToggleSeverity: (severity: Severity) => void;
  onToggleTerminal: (terminal: string) => void;
  onToggleRunway: (runway: string) => void;
  onClear: () => void;
}) {
  const bankMeta = {
    severity: { label: "Priority", count: sevFilter.length, icon: ShieldAlert },
    terminal: { label: "Terminal", count: terminalFilter.length, icon: MapPin },
    runway: { label: "Runway", count: runway ? 1 : 0, icon: RadioTower },
  } as const;

  return (
    <section className="triage-filter-console" aria-labelledby="triage-filters-heading">
      <div className="triage-filter-console__header">
        <div>
          <p
            id="triage-filters-heading"
            className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            <Filter aria-hidden className="size-3.5 text-amber" /> Filter console
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {activeFilterCount > 0
              ? `${activeFilterCount} active constraint${activeFilterCount === 1 ? "" : "s"}`
              : "Showing the full operational queue"}
          </p>
        </div>
        {activeFilterCount > 0 ? (
          <OpsButton onClick={onClear} intent="brand" emphasis="ghost" size="compact">
            Clear all
          </OpsButton>
        ) : null}
      </div>

      <div className="triage-filter-console__banks" aria-label="Filter categories">
        {(Object.keys(bankMeta) as Array<keyof typeof bankMeta>).map((bank) => {
          const meta = bankMeta[bank];
          const Icon = meta.icon;
          const expanded = openBank === bank;
          return (
            <button
              key={bank}
              type="button"
              onClick={() => onOpenBank(bank)}
              aria-expanded={expanded}
              aria-controls={`filter-bank-${bank}`}
              className="triage-filter-console__bank"
            >
              <Icon aria-hidden />
              <span>{meta.label}</span>
              {meta.count > 0 ? (
                <span className="mono-data triage-filter-console__badge">{meta.count}</span>
              ) : (
                <ChevronDown aria-hidden className="triage-filter-console__chevron" />
              )}
            </button>
          );
        })}
      </div>

      {openBank ? (
        <fieldset id={`filter-bank-${openBank}`} className="triage-filter-console__options">
          <legend className="sr-only">{bankMeta[openBank].label} filters</legend>
          {openBank === "severity" &&
            (["p1", "p2", "p3"] as Severity[]).map((severity) => (
              <FilterOption
                key={severity}
                active={sevFilter.includes(severity)}
                onClick={() => onToggleSeverity(severity)}
                tone={severity === "p1" ? "critical" : severity === "p2" ? "warning" : "info"}
                label={SEVERITY_LABEL[severity].replace(`${severity.toUpperCase()} `, "")}
                value={severity.toUpperCase()}
              />
            ))}
          {openBank === "terminal" &&
            [...TERMINALS, "Airside"].map((terminal) => (
              <FilterOption
                key={terminal}
                active={terminalFilter.includes(terminal)}
                onClick={() => onToggleTerminal(terminal)}
                label={terminal === "Airside" ? "Airside" : `Terminal ${terminal}`}
                value={terminal === "Airside" ? "OPS" : terminal}
              />
            ))}
          {openBank === "runway" &&
            RUNWAYS.map((runwayItem) => (
              <FilterOption
                key={runwayItem.id}
                active={runway === runwayItem.id}
                onClick={() => onToggleRunway(runwayItem.id)}
                label={
                  runwayItem.status === "active"
                    ? "Active"
                    : runwayItem.status === "notam"
                      ? "NOTAM"
                      : "Closed"
                }
                value={runwayItem.id}
                tone={
                  runwayItem.status === "closed"
                    ? "critical"
                    : runwayItem.status === "notam"
                      ? "warning"
                      : "normal"
                }
              />
            ))}
        </fieldset>
      ) : null}
    </section>
  );
}

function FilterOption({
  active,
  onClick,
  label,
  value,
  tone = "neutral",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  value: string;
  tone?: "neutral" | "critical" | "warning" | "info" | "normal";
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      data-tone={tone}
      onClick={onClick}
      className="triage-filter-option"
    >
      <span className="mono-data triage-filter-option__value">{value}</span>
      <span className="triage-filter-option__label">{label}</span>
      <span className="triage-filter-option__state" aria-hidden>
        {active ? <Check /> : null}
      </span>
    </button>
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
        "press min-h-11 shrink-0 rounded-xl border px-3.5 text-xs font-medium",
        !active && "border-border bg-card text-muted-foreground",
        active && tone === "coral" && "border-coral bg-coral/15 text-coral",
        active && tone === "amber" && "border-amber bg-amber/15 text-amber",
        active && (tone === "cyan" || !tone) && "border-amber bg-amber/12 text-amber",
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
    <article className="triage-item" data-severity={alert.severity}>
      <button type="button" onClick={onOpen} className="triage-item__body">
        <div className="triage-item__eyebrow">
          <span className="triage-item__severity">{alert.severity.toUpperCase()}</span>
          <span className="mono-data text-[11px] font-medium text-foreground">{alert.id}</span>
          <span className="mono-data text-[11px] text-muted-foreground">
            {alert.time} {AIRPORT.timezone} · {alert.source}
          </span>
          <span className="triage-item__state">{STATE_LABEL[alert.state]}</span>
        </div>
        <h2 className="triage-item__title">{alert.title}</h2>
        <div className="triage-item__meta">
          <span>
            <MapPin aria-hidden />
            {[
              alert.runway,
              alert.taxiway && `TWY ${alert.taxiway}`,
              alert.stand,
              alert.terminal && `Terminal ${alert.terminal}`,
            ]
              .filter(Boolean)
              .join(" · ") || "Airside"}
          </span>
          <span>
            <Sliders aria-hidden /> {alert.impact}
          </span>
        </div>
        {alert.escalationReason && (
          <p className="triage-item__signal text-amber">
            <TrendingUp aria-hidden /> Auto-ranked {alert.severity.toUpperCase()} ·{" "}
            {alert.escalationReason}
          </p>
        )}
      </button>
      {alert.state === "new" && (
        <div className="triage-item__footer">
          <p className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock3 aria-hidden className="size-3.5 shrink-0" />
            {alert.escalatesInMin ? (
              <span>
                Escalation in <span className="mono-data text-coral">{alert.escalatesInMin}m</span>
              </span>
            ) : (
              <span>Manual dispatch</span>
            )}
          </p>
          <OpsButton onClick={onAck} intent="brand" emphasis="outline" size="compact">
            <Check aria-hidden /> Acknowledge
          </OpsButton>
        </div>
      )}
    </article>
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
  onNote,
  trail,
  currentUser,
}: {
  alert: OpsAlert | null;
  position: number;
  total: number;
  onClose: () => void;
  onStep: (dir: 1 | -1) => void;
  onAck: (id: string) => void;
  onTriage: (
    id: string,
    patch: { severity: Severity; owner: string; impact: string; note?: string },
  ) => void;
  onResolve: (id: string, note: string) => void;
  onNote: (id: string, text: string) => void;
  trail: AuditEntry[];
  currentUser: string;
}) {
  const [mode, setMode] = useState<"detail" | "prioritize" | "resolve">("detail");
  const [severity, setSeverity] = useState<Severity>("p2");
  const [owner, setOwner] = useState(OWNERS[0]!.name);
  const [impact, setImpact] = useState(IMPACTS[0]!);
  const [note, setNote] = useState("");
  const [operatorNote, setOperatorNote] = useState("");
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
      <DrawerContent className="flex max-h-[92dvh] flex-col">
        <div
          className="flex min-h-0 flex-1 flex-col"
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
                  "mono-data rounded px-1.5 py-0.5 text-[11px] font-semibold",
                  alert.severity === "p1" && "bg-coral/20 text-coral",
                  alert.severity === "p2" && "bg-amber/20 text-amber",
                  alert.severity === "p3" && "bg-amber/12 text-amber",
                )}
              >
                {SEVERITY_LABEL[alert.severity]}
              </span>
              <span className="mono-data text-xs">{alert.id}</span>
              <span className="ml-auto text-[12px] text-muted-foreground">
                {position} of {total}
              </span>
            </div>
            <DrawerTitle className="text-base">{alert.title}</DrawerTitle>
            <DrawerDescription>{alert.detail}</DrawerDescription>
          </DrawerHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-24">
            <ol className="flex items-center gap-1" aria-label="Triage progress">
              {steps.map((s, i) => (
                <li key={s.key} className="flex flex-1 flex-col gap-1">
                  <span
                    className={cn(
                      "h-1.5 rounded-full",
                      i <= stepIndex ? "bg-cyan" : "bg-secondary",
                    )}
                  />
                  <span className="text-[11px] text-muted-foreground">{s.label}</span>
                </li>
              ))}
            </ol>

            <dl className="triage-facts-grid mono-data">
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
                <dd>
                  {alert.runway ??
                    alert.stand ??
                    (alert.taxiway ? `Taxiway ${alert.taxiway}` : (alert.terminal ?? "Airside"))}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Linked action</dt>
                <dd>{alert.linkedAction ?? "—"}</dd>
              </div>
            </dl>

            {mode === "prioritize" && (
              <section className="triage-sheet-panel space-y-3">
                <h3 className="text-[17px] font-semibold tracking-tight">Prioritize</h3>
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
                  className="min-h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
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
                  className="min-h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
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
                  className="w-full resize-none rounded-xl border border-input bg-card p-2 text-sm"
                  placeholder="Crew mobilized, target restore 1800 CT"
                />
                <OpsButton
                  onClick={() => {
                    onTriage(alert.id, { severity, owner, impact, note });
                    setNote("");
                    setMode("detail");
                  }}
                  intent="brand"
                  emphasis="solid"
                  className="w-full"
                >
                  <ShieldAlert aria-hidden />
                  Set priority and assign
                </OpsButton>
              </section>
            )}

            {mode === "resolve" && (
              <section className="triage-sheet-panel space-y-3">
                <h3 className="text-[17px] font-semibold tracking-tight">Resolve</h3>
                <label className="block text-xs text-muted-foreground" htmlFor="resolve-note">
                  Closure note (required)
                </label>
                <textarea
                  id="resolve-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-input bg-card p-2 text-sm"
                  placeholder="Runway 17C inspection complete, returned to service 05:12 CT"
                />
                <OpsButton
                  disabled={!note.trim()}
                  onClick={() => {
                    onResolve(alert.id, note.trim());
                    setNote("");
                    setMode("detail");
                  }}
                  intent="success"
                  emphasis="solid"
                  className="w-full"
                >
                  <Check aria-hidden />
                  Resolve item
                </OpsButton>
              </section>
            )}

            {alert.state === "resolved" && (
              <section className="triage-sheet-panel space-y-2 border-success/30">
                <h3 className="text-[17px] font-semibold tracking-tight text-success">
                  Closure exports
                </h3>
                <OpsButton
                  onClick={() => printDisruptionSummary(alert, currentUser)}
                  intent="success"
                  emphasis="outline"
                  className="w-full"
                >
                  <FileDown aria-hidden />
                  Printable closure summary (PDF)
                </OpsButton>
                <div className="grid grid-cols-2 gap-2">
                  <OpsButton onClick={() => exportAuditJson(alert, trail)} size="compact">
                    <FileJson aria-hidden /> Audit JSON
                  </OpsButton>
                  <OpsButton onClick={() => exportAuditCsv(alert, trail)} size="compact">
                    <Table aria-hidden /> Audit CSV
                  </OpsButton>
                </div>
              </section>
            )}

            <section className="triage-sheet-panel space-y-2">
              <h3 className="text-[17px] font-semibold tracking-tight">Operator note</h3>
              <p className="text-[12px] text-muted-foreground">
                Mention a role to page them: {ROLES.map((r) => `@${r.handle}`).join(" ")}
              </p>
              <label className="sr-only" htmlFor="operator-note">
                Operator note for {alert.id}
              </label>
              <textarea
                id="operator-note"
                value={operatorNote}
                onChange={(e) => setOperatorNote(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-xl border border-input bg-card p-2 text-sm"
                placeholder="@ramp please hold the push on C17 until sweep completes"
              />
              <div className="flex flex-wrap gap-2">
                {ROLES.map((r) => (
                  <OpsButton
                    key={r.handle}
                    onClick={() =>
                      setOperatorNote((v) => `${v}${v && !v.endsWith(" ") ? " " : ""}@${r.handle} `)
                    }
                    emphasis="ghost"
                    size="compact"
                  >
                    @{r.handle}
                  </OpsButton>
                ))}
              </div>
              <OpsButton
                disabled={!operatorNote.trim()}
                onClick={() => {
                  onNote(alert.id, operatorNote);
                  setOperatorNote("");
                }}
                intent="brand"
                emphasis="solid"
                className="w-full"
              >
                <Send aria-hidden /> Post note to audit trail
              </OpsButton>
            </section>

            <section>
              <div className="flex items-center gap-2">
                <h3 className="text-[17px] font-semibold tracking-tight">Audit trail</h3>
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <Lock aria-hidden className="size-3" /> Immutable · {trail.length} entries
                </span>
              </div>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Append-only. Acknowledgements, status changes and notes are never edited or deleted.
              </p>

              <ol className="mt-2 space-y-2 border-l border-border pl-3">
                {trail
                  .slice()
                  .reverse()
                  .map((ev) => (
                    <li key={ev.id} className="text-sm">
                      <p className="mono-data text-[11px] uppercase tracking-wide text-amber">
                        {AUDIT_KIND_LABEL[ev.kind]}
                      </p>
                      <p>{ev.text}</p>
                      {ev.mentions?.length ? (
                        <p className="text-[12px] text-amber">
                          Paged {ev.mentions.map((m) => `@${m}`).join(" ")}
                        </p>
                      ) : null}
                      <p className="text-[12px] text-muted-foreground">
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
                className="press grid size-11 place-items-center rounded-xl border border-border disabled:opacity-40"
              >
                <ChevronLeft aria-hidden className="size-5" />
              </button>
              <p className="text-[12px] text-muted-foreground">Swipe or use arrow keys</p>
              <button
                type="button"
                onClick={() => onStep(1)}
                disabled={position >= total}
                aria-label="Next item"
                className="press grid size-11 place-items-center rounded-xl border border-border disabled:opacity-40"
              >
                <ChevronRight aria-hidden className="size-5" />
              </button>
            </div>
          </div>

          <div className="triage-action-dock safe-bottom sticky bottom-0 grid grid-cols-2 gap-2 border-t border-border bg-popover p-3">
            <OpsButton
              onClick={() => onAck(alert.id)}
              disabled={alert.state !== "new"}
              intent="brand"
              emphasis="solid"
              className="col-span-2"
            >
              <Check aria-hidden /> Acknowledge incident
            </OpsButton>
            <OpsButton
              onClick={() => setMode(mode === "prioritize" ? "detail" : "prioritize")}
              aria-expanded={mode === "prioritize"}
              intent="warning"
              emphasis="outline"
            >
              <ShieldAlert aria-hidden /> Prioritize
            </OpsButton>
            <OpsButton
              onClick={() => setMode(mode === "resolve" ? "detail" : "resolve")}
              aria-expanded={mode === "resolve"}
              disabled={alert.state === "resolved"}
              intent="success"
              emphasis="outline"
            >
              <Check aria-hidden /> Resolve
            </OpsButton>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function EscalationRulesPanel() {
  const { escalationRules, setRuleEnabled, slaMinutes, setSlaMinutes } = useOps();
  const [open, setOpen] = useState(false);
  const active = escalationRules.filter((r) => r.enabled).length;

  return (
    <section className="surface-card p-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="escalation-rules"
        className="press flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium"
      >
        <Sliders aria-hidden className="size-4 text-amber" />
        Escalation rules
        <span className="ml-auto text-[12px] text-muted-foreground">
          {active} active · SLA {slaMinutes}m
        </span>
      </button>
      {open && (
        <div id="escalation-rules" className="space-y-3 border-t border-border p-3">
          {escalationRules.map((r) => (
            <label key={r.id} className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={r.enabled}
                onChange={(e) => setRuleEnabled(r.id, e.target.checked)}
                className="mt-1 size-4 accent-[var(--amber)]"
              />
              <span>
                <span className="font-medium">{r.label}</span>
                <span className="block text-[12px] text-muted-foreground">
                  {r.description} Promotes to {r.to.toUpperCase()}.
                </span>
              </span>
            </label>
          ))}
          <div>
            <label htmlFor="sla-window" className="text-[12px] text-muted-foreground">
              Acknowledgement SLA window: {slaMinutes} min
            </label>
            <input
              id="sla-window"
              type="range"
              min={5}
              max={45}
              step={5}
              value={slaMinutes}
              onChange={(e) => setSlaMinutes(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--amber)]"
            />
          </div>
          <p className="text-[12px] text-muted-foreground">
            Matching items are re-ranked automatically — worst first, without touching the audit
            trail.
          </p>
        </div>
      )}
    </section>
  );
}
