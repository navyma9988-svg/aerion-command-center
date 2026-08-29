import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, BellOff, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOps, type OpsNotification } from "@/lib/ops-store";
import { CHANGE_LABEL, EVENT_KIND_LABEL, type OpsEvent } from "@/lib/airfield-data";
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
            className="press grid size-11 shrink-0 place-items-center rounded-lg hover:bg-secondary"
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
  } = useOps();
  const [open, setOpen] = useState(false);
  const jump = useEventLink();

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
        className="press relative grid size-11 place-items-center rounded-lg hover:bg-secondary"
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
        <div className="flex items-center gap-2 px-4 pb-3">
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
        </div>
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
                className={cn("mt-2 size-2 shrink-0 rounded-full", severityDot(n.event))}
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
                  {n.event.at} CT · {CHANGE_LABEL[n.event.change ?? "new"]}
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
                className="press grid size-11 shrink-0 place-items-center rounded-lg hover:bg-secondary"
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
