import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useOps } from "@/lib/ops-store";
import { type ActionStatus } from "@/lib/airfield-data";
import { cn } from "@/lib/utils";
import { Search, Check, ArrowUpRight } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

const TABS: { key: string; label: string; match: (s: ActionStatus) => boolean }[] = [
  { key: "all", label: "All", match: (s) => s !== "complete" },
  { key: "overdue", label: "Overdue", match: (s) => s === "overdue" },
  { key: "today", label: "Due today", match: (s) => s === "due_today" },
  { key: "closing", label: "Closing", match: (s) => s === "closing" },
  { key: "complete", label: "Complete", match: (s) => s === "complete" },
];

function validateSearch(search: Record<string, unknown>) {
  return {
    action: typeof search["action"] === "string" ? (search["action"] as string) : "",
    tab: typeof search["tab"] === "string" ? (search["tab"] as string) : "all",
  };
}

export const Route = createFileRoute("/queue")({
  validateSearch,
  head: () => ({
    meta: [
      { title: "Queue — DFW Airfield Command" },
      {
        name: "description",
        content:
          "Worst-first action queue for the DFW airfield program: overdue, due today, blocked and closing items with one tap to act.",
      },
      { property: "og:title", content: "Queue — DFW Airfield Command" },
      { property: "og:description", content: "Worst-first airfield action queue with one tap to act." },
    ],
  }),
  component: QueuePage,
});

const STATUS_LABEL: Record<ActionStatus, string> = {
  overdue: "Overdue",
  due_today: "Due today",
  open: "Open",
  blocked: "Blocked",
  closing: "Closing",
  complete: "Complete",
};

function QueuePage() {
  const { actions, completeAction } = useOps();
  const { action: actionId, tab } = Route.useSearch();
  const navigate = useNavigate({ from: "/queue" });
  const [q, setQ] = useState("");

  const active = TABS.find((t) => t.key === tab) ?? TABS[0]!;
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return actions
      .filter((a) => active.match(a.status))
      .filter(
        (a) =>
          !needle ||
          a.id.toLowerCase().includes(needle) ||
          a.title.toLowerCase().includes(needle) ||
          a.owner.toLowerCase().includes(needle) ||
          a.area.toLowerCase().includes(needle),
      )
      .sort((a, b) => rank(a.status) - rank(b.status) || b.updatedDaysAgo - a.updatedDaysAgo);
  }, [actions, active, q]);

  const selected = actions.find((a) => a.id === actionId) ?? null;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[26px] font-bold tracking-tight">DFW Airfield Queue</h1>
        <p className="mono-data text-xs text-muted-foreground">{list.length} shown · worst first</p>
      </header>

      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search actions, owners, IDs"
          placeholder="Search actions, owners, IDs"
          className="min-h-11 w-full rounded-xl border border-input bg-card pl-9 pr-3 text-sm placeholder:text-muted-foreground"
        />
      </div>

      <div role="tablist" aria-label="Queue filter" className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={t.key === active.key}
            onClick={() => navigate({ search: (p) => ({ ...p, tab: t.key }) })}
            className={cn(
              "press min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium",
              t.key === active.key
                ? "border-amber bg-amber/15 text-amber"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {list.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => navigate({ search: (p) => ({ ...p, action: a.id }) })}
              className="press w-full surface-card p-4 text-left hover:bg-elevated"
            >
              <div className="flex items-center gap-2">
                <span className="mono-data text-xs font-semibold">{a.id}</span>
                <span
                  className={cn(
                    "mono-data rounded px-1.5 py-0.5 text-[10px] font-semibold",
                    a.status === "overdue" && "bg-coral/20 text-coral",
                    a.status === "due_today" && "bg-amber/20 text-amber",
                    a.status === "closing" && "bg-cyan/20 text-cyan",
                    a.status === "complete" && "bg-success/20 text-success",
                    (a.status === "open" || a.status === "blocked") && "bg-secondary text-muted-foreground",
                  )}
                >
                  {STATUS_LABEL[a.status]}
                </span>
                {a.priority === "Critical" && (
                  <span className="mono-data ml-auto text-[10px] text-coral">CRITICAL</span>
                )}
              </div>
              <p className="mt-1.5 text-sm font-medium">{a.title}</p>
              <p className="mono-data mt-1 text-[11px] text-muted-foreground">
                {a.owner} · Due {a.due} · Upd {a.updatedDaysAgo}d · {a.area}
              </p>
            </button>
          </li>
        ))}
        {list.length === 0 && (
          <li className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No actions match this filter.
          </li>
        )}
      </ul>

      <Drawer
        open={!!selected}
        onOpenChange={(o) => !o && navigate({ search: (p) => ({ ...p, action: "" }) })}
      >
        <DrawerContent className="max-h-[92dvh]">
          {selected && (
            <>
              <DrawerHeader className="text-left">
                <DrawerTitle className="text-base">
                  <span className="mono-data">{selected.id}</span> · {STATUS_LABEL[selected.status]}
                </DrawerTitle>
                <DrawerDescription className="text-foreground">{selected.title}</DrawerDescription>
              </DrawerHeader>
              <div className="space-y-4 overflow-y-auto px-4 pb-8">
                <dl className="mono-data grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Owner</dt>
                    <dd>{selected.owner}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Due</dt>
                    <dd>{selected.due}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Area</dt>
                    <dd>{selected.area}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Last update</dt>
                    <dd>{selected.updatedDaysAgo} days ago</dd>
                  </div>
                </dl>
                <p className="text-sm text-muted-foreground">{selected.detail}</p>
                <section>
                  <h3 className="text-[17px] font-semibold tracking-tight">Activity</h3>
                  <ol className="mt-2 space-y-2 border-l border-border pl-3">
                    {selected.activity.map((ev, i) => (
                      <li key={i} className="text-sm">
                        <p>{ev.text}</p>
                        <p className="mono-data text-[11px] text-muted-foreground">
                          {ev.who} · {ev.at}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      completeAction(selected.id);
                      navigate({ search: (p) => ({ ...p, action: "" }) });
                    }}
                    className="press inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                  >
                    <Check aria-hidden className="size-4" /> Mark complete
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/alerts", search: { item: "", status: "open", severity: "", terminal: "", runway: "" } })}
                    className="press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium"
                  >
                    Linked alerts <ArrowUpRight aria-hidden className="size-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function rank(s: ActionStatus) {
  return { overdue: 0, due_today: 1, blocked: 2, closing: 3, open: 4, complete: 5 }[s];
}
