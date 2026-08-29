import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useOps } from "@/lib/ops-store";
import { AIRPORT, OWNERS, RUNWAYS, TERMINAL_HEALTH, WIND } from "@/lib/airfield-data";
import { ChevronRight, RefreshCw, Wind } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pulse — DFW Airfield Command" },
      {
        name: "description",
        content:
          "Live DFW airfield program pulse: overdue actions, disruptions, runway status and terminal health at a glance.",
      },
      { property: "og:title", content: "Pulse — DFW Airfield Command" },
      {
        property: "og:description",
        content: "Overdue actions, disruptions, runway status and terminal health at a glance.",
      },
    ],
  }),
  component: PulsePage,
});

function PulsePage() {
  const { actions, alerts, lastSync, simulation } = useOps();
  const [syncing, setSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState(lastSync);

  const counts = useMemo(() => {
    const overdue = actions.filter((a) => a.status === "overdue");
    return {
      open: actions.filter((a) => a.status !== "complete").length,
      overdue,
      dueToday: actions.filter((a) => a.status === "due_today").length,
      blocked: actions.filter((a) => a.status === "blocked").length,
      closing: actions.filter((a) => a.status === "closing").length,
    };
  }, [actions]);

  const openAlerts = alerts.filter((a) => a.state === "new");
  const workload = OWNERS.map((o) => {
    const mine = actions.filter((a) => a.owner === o.name && a.status !== "complete");
    return {
      ...o,
      total: mine.length,
      overdue: mine.filter((a) => a.status === "overdue").length,
    };
  });
  const maxLoad = Math.max(1, ...workload.map((w) => w.total));

  const refresh = () => {
    setSyncing(true);
    window.setTimeout(() => {
      setSyncing(false);
      const d = new Date();
      setSyncedAt(
        `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d
          .getSeconds()
          .toString()
          .padStart(2, "0")}`,
      );
    }, 700);
  };

  return (
    <div className="stagger-in space-y-4">
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold">DFW Airfield Pulse</h1>
            <p className="mono-data text-xs text-muted-foreground">
              As of {AIRPORT.shiftDate.slice(5)} {AIRPORT.asOf} {AIRPORT.timezone} · synced {syncedAt}
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="press grid size-11 shrink-0 place-items-center rounded-lg border border-border hover:bg-secondary"
            aria-label="Refresh program data"
          >
            <RefreshCw aria-hidden className={cn("size-4", syncing && "animate-spin")} />
          </button>
        </div>
        <p className="mt-4 text-4xl font-bold">
          <span className="mono-data">{counts.open}</span>{" "}
          <span className="text-base font-medium text-muted-foreground">
            open actions across the program
          </span>
        </p>
        <p className="mono-data mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Wind aria-hidden className="size-3.5" /> {WIND.dir}° / {WIND.kt}kt
          </span>
          <span>{WIND.flow}</span>
          <span className="text-amber">{WIND.approach}</span>
        </p>
      </section>

      <section aria-labelledby="status-h" className="grid grid-cols-2 gap-3">
        <h2 id="status-h" className="sr-only">
          Action status
        </h2>
        <StatTile label="Overdue" value={counts.overdue.length} sub="worst 21 days past due" tone="coral" />
        <StatTile label="Due today" value={counts.dueToday} sub="need action by EOD" tone="amber" />
        <StatTile label="Blocked" value={counts.blocked} sub="nothing waiting" tone="muted" />
        <StatTile label="Closing" value={counts.closing} sub="sign-off pending" tone="cyan" />
      </section>

      <section aria-labelledby="disrupt-h" className="rounded-xl border border-border bg-card p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h2 id="disrupt-h" className="text-sm font-bold">
            Open disruptions
          </h2>
          <Link
            to="/alerts"
            search={{ item: "", status: "open", severity: "", terminal: "", runway: "" }}
            className="press inline-flex min-h-11 items-center gap-1 text-xs font-medium text-cyan"
          >
            Triage <ChevronRight aria-hidden className="size-4" />
          </Link>
        </div>
        {openAlerts.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing open. Board is clear.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {openAlerts.slice(0, 3).map((a) => (
              <li key={a.id} className="flex items-start gap-2 text-sm">
                <span
                  className={cn(
                    "mono-data mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                    a.severity === "p1" ? "bg-coral/20 text-coral" : "bg-amber/20 text-amber",
                  )}
                >
                  {a.severity.toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2">{a.title}</span>
                  <span className="mono-data block text-[11px] text-muted-foreground">
                    {a.time} {AIRPORT.timezone} · {a.runway ?? a.terminal ?? "Airside"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="aging-h" className="rounded-xl border border-border bg-card p-4">
        <h2 id="aging-h" className="text-sm font-bold">
          Overdue aging
        </h2>
        <ul className="mt-3 space-y-3">
          {counts.overdue.map((a, i) => {
            const days = i === 0 ? 21 : 14;
            return (
              <li key={a.id}>
                <div className="mono-data flex items-baseline justify-between text-xs">
                  <span>{a.id}</span>
                  <span className="text-coral">{days}d</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-coral"
                    style={{ width: `${(days / 24) * 100}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="load-h" className="rounded-xl border border-border bg-card p-4">
        <h2 id="load-h" className="text-sm font-bold">
          Workload by owner
        </h2>
        <ul className="mt-3 space-y-3">
          {workload.map((w) => (
            <li key={w.initials}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium">{w.name}</span>
                <span className="mono-data text-muted-foreground">{w.total}</span>
              </div>
              <div className="mt-1 flex h-2 gap-0.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-coral"
                  style={{ width: `${(w.overdue / maxLoad) * 100}%` }}
                />
                <div
                  className="h-full bg-cyan"
                  style={{ width: `${((w.total - w.overdue) / maxLoad) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
        <p className="mono-data mt-3 flex gap-4 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span aria-hidden className="size-2 rounded-full bg-coral" /> Overdue
          </span>
          <span className="inline-flex items-center gap-1">
            <span aria-hidden className="size-2 rounded-full bg-cyan" /> On track
          </span>
        </p>
      </section>

      <section aria-labelledby="rw-h" className="rounded-xl border border-border bg-card p-4">
        <h2 id="rw-h" className="text-sm font-bold">
          Runway status
        </h2>
        <ul className="mono-data mt-3 grid gap-2 text-xs sm:grid-cols-2">
          {RUNWAYS.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-md bg-elevated px-3 py-2">
              <span>{r.id}</span>
              <span
                className={cn(
                  r.status === "active" && "text-success",
                  r.status === "notam" && "text-amber",
                  r.status === "closed" && "text-coral",
                )}
              >
                {r.status === "active" ? "Active" : r.status === "notam" ? "NOTAM" : "Closed"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="th-h" className="rounded-xl border border-border bg-card p-4">
        <h2 id="th-h" className="text-sm font-bold">
          Terminal health
        </h2>
        <ul className="mt-3 space-y-2">
          {TERMINAL_HEALTH.map((t) => (
            <li key={t.terminal}>
              <details className="group rounded-lg bg-elevated">
                <summary className="press flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="font-medium">Terminal {t.terminal}</span>
                  <span className="mono-data text-xs text-muted-foreground">
                    {t.standsAvailable}/{t.standsTotal} stands · {t.securityWaitMin} min
                  </span>
                </summary>
                <div className="mono-data space-y-1 px-3 pb-3 text-xs text-muted-foreground">
                  <p>{t.belts}</p>
                  <p>
                    {t.openActions} open action{t.openActions === 1 ? "" : "s"}
                    {t.overdueActions > 0 && <span className="text-coral"> · {t.overdueActions} overdue</span>}
                  </p>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>

      {simulation && (
        <p role="status" className="mono-data text-center text-xs text-coral">
          Ground stop in effect — arrivals reprotected until 1615 CT
        </p>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number;
  sub: string;
  tone: "coral" | "amber" | "cyan" | "muted";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mono-data mt-1 text-3xl font-bold",
          tone === "coral" && "text-coral",
          tone === "amber" && "text-amber",
          tone === "cyan" && "text-cyan",
          tone === "muted" && "text-foreground",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}
