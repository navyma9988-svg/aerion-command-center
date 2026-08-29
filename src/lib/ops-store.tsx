import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ACTIONS,
  ALERTS,
  INCOMING_EVENTS,
  SEED_EVENTS,
  type AirfieldAction,
  type AlertState,
  type OpsAlert,
  type OpsEvent,
  type Severity,
} from "./airfield-data";

export interface AlertOverlay {
  state?: AlertState | undefined;
  severity?: Severity | undefined;
  owner?: string | undefined;
  impact?: string | undefined;
  note?: string | undefined;
  ackBy?: string | undefined;
  ackAt?: string | undefined;
  resolvedAt?: string | undefined;
}

interface OpsContextValue {
  alerts: OpsAlert[];
  actions: AirfieldAction[];
  currentUser: string;
  simulation: boolean;
  setSimulation: (v: boolean) => void;
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;
  density: "comfortable" | "compact";
  setDensity: (d: "comfortable" | "compact") => void;
  acknowledge: (id: string) => void;
  triage: (id: string, patch: { severity: Severity; owner: string; impact: string; note?: string }) => void;
  resolve: (id: string, note: string) => void;
  reopen: (id: string) => void;
  completeAction: (id: string) => void;
  clock: string;
  lastSync: string;
  /* live operations timeline */
  events: OpsEvent[];
  unseenEventIds: string[];
  markEventsSeen: () => void;
  streaming: boolean;
  setStreaming: (v: boolean) => void;
  /* notification center */
  notifications: OpsNotification[];
  unreadCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  dismissNotification: (id: string) => void;
}

export interface OpsNotification {
  id: string;
  event: OpsEvent;
  read: boolean;
}

const OpsContext = createContext<OpsContextValue | null>(null);

const SIM_ALERT: OpsAlert = {
  id: "DIS-2412",
  time: "14:33",
  severity: "p1",
  source: "Ops",
  title: "Ground stop issued — DFW arrivals, convective activity west",
  detail:
    "Traffic management initiative in effect until 1615 CT. 22 arrivals reprotected, 9 airborne holds. Ramp control moving to single-lane push on Terminal C.",
  terminal: "Airside",
  runway: "17C/35C",
  impact: "Runway capacity",
  state: "new",
  escalatesInMin: 8,
  activity: [{ at: "14:33", who: "Ops", text: "Simulation active — ground stop injected" }],
};

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function OpsProvider({ children }: { children: ReactNode }) {
  const [overlays, setOverlays] = useState<Record<string, AlertOverlay>>({});
  const [completed, setCompleted] = useState<string[]>([]);
  const [simulation, setSimulation] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [clock, setClock] = useState("14:32:07");
  const [lastSync, setLastSync] = useState("14:32:07");
  const [streamIndex, setStreamIndex] = useState(0);
  const [streaming, setStreaming] = useState(true);
  const [seenIds, setSeenIds] = useState<string[]>(() => SEED_EVENTS.map((e) => e.id));
  const [readIds, setReadIds] = useState<string[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const currentUser = "A. Dadian";

  // Stream one deterministic event at a time while the board is open.
  useEffect(() => {
    if (!streaming) return;
    const t = window.setInterval(
      () => setStreamIndex((i) => (i >= INCOMING_EVENTS.length ? i : i + 1)),
      9000,
    );
    return () => window.clearInterval(t);
  }, [streaming]);

  const events = useMemo<OpsEvent[]>(() => {
    const live = INCOMING_EVENTS.slice(0, streamIndex).slice().reverse();
    const sim: OpsEvent[] = simulation
      ? [
          {
            id: "EV-SIM",
            at: "14:33",
            kind: "runway",
            severity: "p1",
            title: "Ground stop issued — DFW arrivals, convective activity west",
            detail:
              "Traffic management initiative until 1615 CT. 22 arrivals reprotected, 9 airborne holds.",
            tags: ["Airside", "17C/35C", "Simulation"],
            change: "escalated",
            alertId: "DIS-2412",
          },
        ]
      : [];
    return [...sim, ...live, ...SEED_EVENTS.slice().reverse()];
  }, [streamIndex, simulation]);

  const unseenEventIds = useMemo(
    () => events.filter((e) => !seenIds.includes(e.id)).map((e) => e.id),
    [events, seenIds],
  );

  const notifications = useMemo<OpsNotification[]>(
    () =>
      events
        .filter((e) => e.change === "new" || e.change === "escalated")
        .filter((e) => !dismissedIds.includes(e.id))
        .filter((e) => !SEED_EVENTS.some((s) => s.id === e.id))
        .map((e) => ({ id: e.id, event: e, read: readIds.includes(e.id) })),
    [events, readIds, dismissedIds],
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markEventsSeen = useCallback(() => setSeenIds(events.map((e) => e.id)), [events]);
  const markNotificationRead = useCallback(
    (id: string) => setReadIds((p) => (p.includes(id) ? p : [...p, id])),
    [],
  );
  const markAllNotificationsRead = useCallback(
    () => setReadIds(events.map((e) => e.id)),
    [events],
  );
  const dismissNotification = useCallback(
    (id: string) => setDismissedIds((p) => (p.includes(id) ? p : [...p, id])),
    [],
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
  }, [theme]);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, []);

  const alerts = useMemo(() => {
    const base = simulation ? [SIM_ALERT, ...ALERTS] : ALERTS;
    return base.map((a) => {
      const o = overlays[a.id];
      if (!o) return a;
      const activity = [...a.activity];
      if (o.ackAt) activity.unshift({ at: o.ackAt, who: o.ackBy ?? currentUser, text: "Acknowledged" });
      if (o.note) activity.unshift({ at: o.resolvedAt ?? o.ackAt ?? a.time, who: currentUser, text: o.note });
      return {
        ...a,
        state: o.state ?? a.state,
        severity: o.severity ?? a.severity,
        impact: o.impact ?? a.impact,
        escalatesInMin: o.state && o.state !== "new" ? undefined : a.escalatesInMin,
        activity,
      };
    });
  }, [overlays, simulation]);

  const actions = useMemo(
    () =>
      ACTIONS.map((a) =>
        completed.includes(a.id) ? { ...a, status: "complete" as const } : a,
      ),
    [completed],
  );

  const stamp = useCallback(() => clock.slice(0, 5), [clock]);

  const acknowledge = useCallback(
    (id: string) =>
      setOverlays((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          state: prev[id]?.state && prev[id]?.state !== "new" ? prev[id]!.state : "acknowledged",
          ackBy: currentUser,
          ackAt: stamp(),
        },
      })),
    [stamp],
  );

  const triage = useCallback<OpsContextValue["triage"]>(
    (id, patch) =>
      setOverlays((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          state: "in_progress",
          severity: patch.severity,
          owner: patch.owner,
          impact: patch.impact,
          note: patch.note
            ? `${patch.note} — assigned to ${patch.owner}`
            : `Triaged as ${patch.severity.toUpperCase()} — assigned to ${patch.owner}`,
          ackAt: prev[id]?.ackAt ?? stamp(),
          ackBy: prev[id]?.ackBy ?? currentUser,
        },
      })),
    [stamp],
  );

  const resolve = useCallback(
    (id: string, note: string) =>
      setOverlays((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          state: "resolved",
          note: note || "Resolved — no further action required",
          resolvedAt: stamp(),
        },
      })),
    [stamp],
  );

  const reopen = useCallback(
    (id: string) => setOverlays((prev) => ({ ...prev, [id]: { ...prev[id], state: "new" } })),
    [],
  );

  const completeAction = useCallback(
    (id: string) => setCompleted((prev) => (prev.includes(id) ? prev : [...prev, id])),
    [],
  );

  const value: OpsContextValue = {
    alerts,
    actions,
    currentUser,
    simulation,
    setSimulation: (v) => {
      setSimulation(v);
      setLastSync(clock);
    },
    theme,
    setTheme,
    density,
    setDensity,
    acknowledge,
    triage,
    resolve,
    reopen,
    completeAction,
    clock,
    lastSync,
    events,
    unseenEventIds,
    markEventsSeen,
    streaming,
    setStreaming,
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    dismissNotification,
  };

  return <OpsContext.Provider value={value}>{children}</OpsContext.Provider>;
}

export function useOps() {
  const ctx = useContext(OpsContext);
  if (!ctx) throw new Error("useOps must be used inside OpsProvider");
  return ctx;
}
