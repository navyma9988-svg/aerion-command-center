import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowRight, Gauge, Pause, Play, Check, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOps } from "@/lib/ops-store";
import { useEventLink } from "@/components/notification-center";
import { CHANGE_LABEL, EVENT_KIND_LABEL, type EventKind } from "@/lib/airfield-data";
import { OpsButton } from "@/components/ops-button";

const KINDS: (EventKind | "all")[] = ["all", "weather", "runway", "ramp", "flight", "action"];
const SPEEDS = [0.5, 1, 2, 4];

export const Route = createFileRoute("/timeline")({
  head: () => ({
    meta: [
      { title: "Live operations timeline — DFW Airfield Command" },
      {
        name: "description",
        content:
          "Streaming DFW airfield events with change markers showing what is new, escalated, updated or cleared since your last look.",
      },
      { property: "og:title", content: "Live operations timeline — DFW Airfield Command" },
      {
        property: "og:description",
        content:
          "A streaming DFW event feed that flags everything changed since you last viewed it.",
      },
    ],
  }),
  component: TimelinePage,
});

function TimelinePage() {
  const {
    events,
    unseenEventIds,
    markEventsSeen,
    streaming,
    setStreaming,
    speed,
    setSpeed,
    clock,
  } = useOps();
  const [kind, setKind] = useState<EventKind | "all">("all");
  // Freeze the "since last view" set on entry so the ribbon stays stable while reading.
  const [sinceIds, setSinceIds] = useState<string[]>([]);
  const seeded = useRef(false);

  useEffect(() => {
    if (!seeded.current && unseenEventIds.length) {
      setSinceIds(unseenEventIds);
      seeded.current = true;
    }
  }, [unseenEventIds]);

  const newIds = useMemo(
    () => Array.from(new Set([...sinceIds, ...unseenEventIds])),
    [sinceIds, unseenEventIds],
  );

  const diffSummary = useMemo(() => {
    const fields = new Set<string>();
    for (const e of events) {
      if (!newIds.includes(e.id)) continue;
      for (const d of e.diff ?? []) fields.add(d.field);
    }
    return [...fields].slice(0, 4).join(", ");
  }, [events, newIds]);

  const list = useMemo(
    () => (kind === "all" ? events : events.filter((e) => e.kind === kind)),
    [events, kind],
  );

  return (
    <div className="timeline-command-deck space-y-4">
      <header className="command-page-header grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="command-page-eyebrow">
            <span className="command-live-dot" aria-hidden /> Event surveillance
          </p>
          <h1 className="text-[26px] font-bold tracking-tight">Live timeline</h1>
          <p className="text-xs text-muted-foreground">
            {streaming ? `Streaming ${speed}×` : "Paused"} · {events.length} events · {clock} CT
          </p>
        </div>
        <OpsButton
          onClick={() => setStreaming(!streaming)}
          aria-pressed={!streaming}
          intent={streaming ? "info" : "brand"}
          emphasis="outline"
          size="compact"
          className="shrink-0"
        >
          {streaming ? (
            <Pause aria-hidden className="size-4" />
          ) : (
            <Play aria-hidden className="size-4" />
          )}
          {streaming ? "Pause feed" : "Resume feed"}
        </OpsButton>
      </header>

      <div className="timeline-speed-console">
        <Gauge aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <span
          id="sim-speed-label"
          className="text-[12px] uppercase tracking-wide text-muted-foreground"
        >
          Simulation speed
        </span>
        <div role="group" aria-labelledby="sim-speed-label" className="timeline-speed-bank">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={speed === s}
              onClick={() => setSpeed(s)}
              className={cn("timeline-speed-button press mono-data", speed === s && "is-active")}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      <div
        role="status"
        className={cn(
          "timeline-feed-status flex items-center gap-2 text-xs",
          newIds.length
            ? "border-cyan/50 bg-cyan/10 text-cyan"
            : "border-border bg-card text-muted-foreground",
        )}
      >
        <Activity aria-hidden className="size-4 shrink-0" />
        <span className="min-w-0 flex-1">
          {newIds.length
            ? `${newIds.length} ${newIds.length === 1 ? "event" : "events"} changed since you last viewed this board${diffSummary ? ` — ${diffSummary}` : ""}`
            : "You are caught up with the DFW feed"}
        </span>
        {newIds.length > 0 && (
          <button
            type="button"
            onClick={() => {
              markEventsSeen();
              setSinceIds([]);
            }}
            className="press inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border border-cyan px-3 text-xs font-medium"
          >
            <Check aria-hidden className="size-3.5" /> Mark reviewed
          </button>
        )}
      </div>

      <div
        className="command-segment-rail overflow-x-auto"
        role="group"
        aria-label="Filter timeline by event type"
      >
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className={cn("command-segment", kind === k && "command-segment--active")}
          >
            {k === "all" ? "All events" : EVENT_KIND_LABEL[k]}
          </button>
        ))}
      </div>

      <ol aria-label="Operations event stream" className="timeline-board">
        <span aria-hidden className="timeline-board__spine" />
        {list.map((e) => (
          <TimelineRow key={e.id} eventId={e.id} isNew={newIds.includes(e.id)} />
        ))}
        {!list.length && (
          <li className="empty-state surface-card">
            <span className="empty-state__icon">
              <Radio aria-hidden className="size-5" />
            </span>
            <span>
              No {kind === "all" ? "" : EVENT_KIND_LABEL[kind].toLowerCase()} events on this shift
              yet.
            </span>
          </li>
        )}
      </ol>
    </div>
  );
}

function TimelineRow({ eventId, isNew }: { eventId: string; isNew: boolean }) {
  const { events } = useOps();
  const jump = useEventLink();
  const e = events.find((x) => x.id === eventId);
  if (!e) return null;

  const tone =
    e.change === "escalated"
      ? "text-coral"
      : e.change === "cleared"
        ? "text-success"
        : e.change === "new"
          ? "text-amber"
          : "text-muted-foreground";

  return (
    <li className="timeline-board__item">
      <span
        aria-hidden
        className={cn(
          "timeline-board__marker",
          e.severity === "p1"
            ? "bg-coral text-coral"
            : e.severity === "p2"
              ? "bg-amber text-amber"
              : "bg-cyan text-cyan",
        )}
      />
      <button
        type="button"
        onClick={() => jump(e)}
        className={cn("timeline-board__row press w-full text-left", isNew && "is-new")}
      >
        <span className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          <span>{e.at} CT</span>
          <span aria-hidden>·</span>
          <span>{EVENT_KIND_LABEL[e.kind]}</span>
          <span className={cn("font-semibold", tone)}>{CHANGE_LABEL[e.change ?? "updated"]}</span>
          {isNew && (
            <span className="rounded-full bg-cyan/20 px-2 py-0.5 text-[11px] font-semibold text-cyan">
              New since last view
            </span>
          )}
        </span>
        <span className="mt-1 block text-sm font-semibold leading-snug">{e.title}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{e.detail}</span>
        {e.diff?.length ? (
          <span
            className="mono-data mt-2 flex flex-wrap gap-1.5 text-[11px]"
            aria-label={`Changed since last view: ${e.diff
              .map((d) => `${d.field} from ${d.from} to ${d.to}`)
              .join("; ")}`}
          >
            {e.diff.map((d) => (
              <span
                key={d.field}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
                  isNew ? "border-cyan/60 text-cyan" : "border-border text-foreground",
                )}
              >
                <span className="uppercase tracking-wide text-foreground">{d.field}</span>
                <span aria-hidden className="text-foreground line-through">
                  {d.from}
                </span>
                <ArrowRight aria-hidden className="size-2.5" />
                <span className="font-semibold">{d.to}</span>
              </span>
            ))}
          </span>
        ) : null}
        <span className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {e.tags.map((t) => (
            <span key={t} className="rounded-full border border-border px-2 py-0.5">
              {t}
            </span>
          ))}
          <span className="ml-auto inline-flex items-center gap-1 text-cyan">
            {e.alertId ? "Triage" : e.actionId ? "Open action" : "Show on map"}
            <ArrowRight aria-hidden className="size-3" />
          </span>
        </span>
      </button>
    </li>
  );
}
