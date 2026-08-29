import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, BellOff, ArrowRight, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOps, NOTIF_TERMINALS, type OpsNotification } from "@/lib/ops-store";
import {
  CHANGE_LABEL,
  EVENT_KIND_LABEL,
  SEVERITY_LABEL,
  type OpsEvent,
  type Severity,
} from "@/lib/airfield-data";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function useEventLink() {
  const navigate = useNavigate();
  return (e: OpsEvent) => {
    if (e.alertId) {
      void navigate({
        to: "/alerts",
        search: { item: e.alertId, status: "open", severity: "", terminal: "", runway: "" },
      });
      return;
    }
    if (e.actionId) {
      void navigate({ to: "/queue", search: { action: e.actionId, tab: "all" } });
      return;
    }
    void navigate({
      to: "/map",
      search: { focus: e.callsign ?? "", terminal: e.callsign ? "" : (e.terminal ?? ""), layer: "gates" },
    });
  };
}

function severityDot(e: OpsEvent) {
  return e.severity === "p1" ? "bg-coral" : e.severity === "p2" ? "bg-amber" : "bg-cyan";
}

/** Push-style in-app banners for freshly streamed disruptions. */
export function NotificationToasts() {
  const { notifications, markNotificationRead, dismissNotification, quietActive } = useOps();
  const [shown, setShown] = useState<string[]>([]);
  const [queue, setQueue] = useState<OpsNotification[]>([]);
  const jump = useEventLink();

  useEffect(() => {
    const fresh = notifications.filter((n) => !n.read && !shown.includes(n.id));
    if (!fresh.length) return;
    setShown((p) => [...p, ...fresh.map((f) => f.id)]);
    if (quietActive) return;
    setQueue((p) => [...fresh, ...p].slice(0, 3));
    const t = window.setTimeout(
      () => setQueue((p) => p.filter((q) => !fresh.some((f) => f.id === q.id))),
      9000,
    );
    return () => window.clearTimeout(t);
  }, [notifications, shown, quietActive]);


  if (!queue.length) return null;

  return (
    <div
      role="region"
      aria-label="New disruption notifications"
      className="safe-top pointer-events-none fixed inset-x-0 top-16 z-40 mx-auto flex max-w-md flex-col gap-2 px-3 lg:left-56 lg:right-auto lg:mx-0 lg:max-w-sm"
    >
      {queue.map((n) => (
        <div
          key={n.id}
          role="status"
          className="pointer-events-auto flex items-start gap-2 rounded-xl border border-border bg-elevated/95 p-3 shadow-lg backdrop-blur animate-in slide-in-from-top-2"
        >
          <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", severityDot(n.event))} />
          <button
            type="button"
            onClick={() => {
              markNotificationRead(n.id);
              setQueue((p) => p.filter((q) => q.id !== n.id));
              jump(n.event);
            }}
            className="press min-w-0 flex-1 text-left"
          >
            <span className="mono-data block text-[10px] uppercase tracking-wide text-muted-foreground">
              {n.event.at} CT · {CHANGE_LABEL[n.event.change ?? "new"]} ·{" "}
              {EVENT_KIND_LABEL[n.event.kind]}
            </span>
            <span className="mt-0.5 block text-sm font-semibold leading-snug">{n.event.title}</span>
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-cyan">
              Open triage <ArrowRight aria-hidden className="size-3" />
            </span>
          </button>
          <button
            type="button"
            aria-label={`Dismiss notification: ${n.event.title}`}
            onClick={() => {
              dismissNotification(n.id);
              setQueue((p) => p.filter((q) => q.id !== n.id));
            }}
            className="press grid size-11 shrink-0 place-items-center rounded-xl hover:bg-secondary"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    dismissNotification,
    streaming,
    setStreaming,
    notifPrefs,
    setNotifPrefs,
    quietActive,
    mutedCount,
  } = useOps();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const jump = useEventLink();

  const toggle = (key: "severities" | "terminals", value: string) => {
    const cur = notifPrefs[key] as string[];
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
    setNotifPrefs({ [key]: next } as never);
  };


  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={
          unreadCount
            ? `Notification center, ${unreadCount} unread disruption ${unreadCount === 1 ? "alert" : "alerts"}`
            : "Notification center, no unread alerts"
        }
        className="press relative grid size-11 place-items-center rounded-xl hover:bg-secondary"
      >
        <Bell aria-hidden className="size-5" />
        {unreadCount > 0 && (
          <span className="mono-data absolute right-1 top-1 min-w-4 rounded-full bg-coral px-1 text-[10px] font-semibold leading-4 text-background">
            {unreadCount}
          </span>
        )}
      </button>

      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>
            New and escalated disruptions pushed from the live DFW feed.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
          <button
            type="button"
            onClick={markAllNotificationsRead}
            disabled={!unreadCount}
            className="press min-h-11 rounded-full border border-border px-4 text-xs font-medium disabled:opacity-50"
          >
            Mark all read
          </button>
          <button
            type="button"
            onClick={() => setStreaming(!streaming)}
            aria-pressed={!streaming}
            className="press inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-xs font-medium"
          >
            {streaming ? <Bell aria-hidden className="size-4" /> : <BellOff aria-hidden className="size-4" />}
            {streaming ? "Pause feed" : "Resume feed"}
          </button>
          <button
            type="button"
            onClick={() => setSettings((v) => !v)}
            aria-expanded={settings}
            aria-controls="notif-settings"
            className="press inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-xs font-medium"
          >
            <SlidersHorizontal aria-hidden className="size-4" /> Settings
          </button>
        </div>

        {(quietActive || mutedCount > 0) && (
          <p className="mono-data mx-4 mb-3 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
            {quietActive
              ? `Quiet hours ${notifPrefs.quietStart}–${notifPrefs.quietEnd} CT — banners suppressed, items still land here.`
              : `${mutedCount} notification${mutedCount === 1 ? "" : "s"} filtered out by your severity and terminal settings.`}
          </p>
        )}

        {settings && (
          <div id="notif-settings" className="space-y-3 border-y border-border px-4 py-3">
            <fieldset>
              <legend className="mono-data text-[11px] uppercase tracking-wide text-muted-foreground">
                Severity
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["p1", "p2", "p3"] as Severity[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={notifPrefs.severities.includes(s)}
                    onClick={() => toggle("severities", s)}
                    className={cn(
                      "press min-h-11 rounded-full border px-3 text-xs font-medium",
                      notifPrefs.severities.includes(s)
                        ? "border-cyan bg-cyan/15 text-cyan"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {SEVERITY_LABEL[s]}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mono-data text-[11px] uppercase tracking-wide text-muted-foreground">
                Terminal
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {NOTIF_TERMINALS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={notifPrefs.terminals.includes(t)}
                    onClick={() => toggle("terminals", t)}
                    className={cn(
                      "press min-h-11 rounded-full border px-3 text-xs font-medium",
                      notifPrefs.terminals.includes(t)
                        ? "border-amber bg-amber/15 text-amber"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {t === "Airside" ? "Airside" : `Terminal ${t}`}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="space-y-2">
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={notifPrefs.quietEnabled}
                  onChange={(e) => setNotifPrefs({ quietEnabled: e.target.checked })}
                  className="size-4 accent-[var(--cyan)]"
                />
                Quiet hours (suppress push banners)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="quiet-start" className="mono-data text-[11px] text-muted-foreground">
                    From
                  </label>
                  <input
                    id="quiet-start"
                    type="time"
                    value={notifPrefs.quietStart}
                    onChange={(e) => setNotifPrefs({ quietStart: e.target.value })}
                    className="mono-data min-h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="quiet-end" className="mono-data text-[11px] text-muted-foreground">
                    To
                  </label>
                  <input
                    id="quiet-end"
                    type="time"
                    value={notifPrefs.quietEnd}
                    onChange={(e) => setNotifPrefs({ quietEnd: e.target.value })}
                    className="mono-data min-h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <ul className="divide-y divide-border px-4 pb-10">
          {notifications.length === 0 && (
            <li className="py-8 text-center text-sm text-muted-foreground">
              Nothing new. The board is quiet — the feed will push here as events arrive.
            </li>
          )}
          {notifications.map((n) => (
            <li key={n.id} className="flex items-start gap-2 py-3">
              <span
                aria-hidden
                className={cn(
                  "mt-2 size-2 shrink-0 rounded-full",
                  n.mention ? "bg-amber ring-2 ring-amber/40" : severityDot(n.event),
                )}
              />
              <button
                type="button"
                onClick={() => {
                  markNotificationRead(n.id);
                  setOpen(false);
                  jump(n.event);
                }}
                className="press min-w-0 flex-1 text-left"
              >
                <span className="mono-data block text-[10px] uppercase tracking-wide text-muted-foreground">
                  {n.event.at} CT · {n.mention ? "Mention" : CHANGE_LABEL[n.event.change ?? "new"]}
                  {!n.read && <span className="ml-2 text-coral">Unread</span>}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block text-sm leading-snug",
                    n.read ? "font-medium text-muted-foreground" : "font-semibold",
                  )}
                >
                  {n.event.title}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">{n.event.detail}</span>
              </button>
              <button
                type="button"
                aria-label={`Dismiss notification: ${n.event.title}`}
                onClick={() => dismissNotification(n.id)}
                className="press grid size-11 shrink-0 place-items-center rounded-xl hover:bg-secondary"
              >
                <X aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
