import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ACTIONS,
  ALERTS,
  INCOMING_EVENTS,
  ROLES,
  SEED_EVENTS,
  type AirfieldAction,
  type AlertState,
  type AuditKind,
  type OpsAlert,
  type OpsEvent,
  type Severity,
} from "./airfield-data";

export interface AlertOverlay {
  state?: AlertState | undefined;
  severity?: Severity | undefined;
  owner?: string | undefined;
  impact?: string | undefined;
}

/** Append-only record. Entries are never edited or removed once written. */
export interface AuditEntry {
  id: string;
  alertId: string;
  seq: number;
  at: string;
  who: string;
  kind: AuditKind;
  text: string;
  mentions?: string[] | undefined;
}

export interface EscalationRule {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  /** severity the rule promotes a matching disruption to */
  to: Severity;
}

export interface NotifPrefs {
  severities: Severity[];
  terminals: string[];
  quietEnabled: boolean;
  quietStart: string;
  quietEnd: string;
}

export interface OpsNotification {
  id: string;
  event: OpsEvent;
  read: boolean;
  mention?: boolean | undefined;
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
  /* operator notes + immutable audit trail */
  addNote: (alertId: string, text: string) => void;
  auditFor: (alertId: string) => AuditEntry[];
  /* configurable escalation rules */
  escalationRules: EscalationRule[];
  setRuleEnabled: (id: string, enabled: boolean) => void;
  slaMinutes: number;
  setSlaMinutes: (m: number) => void;
  /* live operations timeline */
  events: OpsEvent[];
  unseenEventIds: string[];
  markEventsSeen: () => void;
  streaming: boolean;
  setStreaming: (v: boolean) => void;
  speed: number;
  setSpeed: (v: number) => void;
  /* notification center */
  notifications: OpsNotification[];
  unreadCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  dismissNotification: (id: string) => void;
  notifPrefs: NotifPrefs;
  setNotifPrefs: (p: Partial<NotifPrefs>) => void;
  quietActive: boolean;
  mutedCount: number;
}

export const NOTIF_TERMINALS = ["A", "B", "C", "D", "E", "Airside"];

const DEFAULT_RULES: EscalationRule[] = [
  {
    id: "runway",
    label: "Runway closure or capacity loss",
    description: "Any disruption tagged Runway capacity is worked as P1.",
    enabled: true,
    to: "p1",
  },
  {
    id: "sla",
    label: "Missed acknowledgement SLA",
    description: "Unacknowledged items inside the SLA window are promoted one level.",
    enabled: true,
    to: "p1",
  },
  {
    id: "gates",
    label: "Severe gate or stand pressure",
    description: "Gate availability items on the international piers ride at P2 or higher.",
    enabled: false,
    to: "p2",
  },
];

const SEV_RANK: Record<Severity, number> = { p1: 0, p2: 1, p3: 2 };

function eventTerminal(e: OpsEvent): string {
  if (e.terminal) return e.terminal;
  const tag = e.tags.find((t) => t.startsWith("Terminal "));
  if (tag) return tag.replace("Terminal ", "");
  return "Airside";
}

function inQuietWindow(now: string, start: string, end: string) {
  const m = (s: string) => {
    const [h, mm] = s.split(":");
    return Number(h) * 60 + Number(mm ?? 0);
  };
  const n = m(now.slice(0, 5));
  const s = m(start);
  const e = m(end);
  return s <= e ? n >= s && n < e : n >= s || n < e;
}

/** Pull @handles out of an operator note and map them to a staffed role. */
export function parseMentions(text: string) {
  const found = new Set<string>();
  for (const m of text.matchAll(/@([a-z]+)/gi)) {
    const handle = (m[1] ?? "").toLowerCase();
    if (ROLES.some((r) => r.handle === handle)) found.add(handle);
  }
  return [...found];
}

const ACTION_WORDS = /\b(assign|please|need|require|request|action|take|handle|cover|escalate)\b/i;

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
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [mentionEvents, setMentionEvents] = useState<OpsEvent[]>([]);
  const [escalationRules, setEscalationRules] = useState<EscalationRule[]>(DEFAULT_RULES);
  const [slaMinutes, setSlaMinutes] = useState(15);
  const [completed, setCompleted] = useState<string[]>([]);
  const [simulation, setSimulation] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [clock, setClock] = useState("14:32:07");
  const [lastSync, setLastSync] = useState("14:32:07");
  const [streamIndex, setStreamIndex] = useState(0);
  const [streaming, setStreaming] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [seenIds, setSeenIds] = useState<string[]>(() => SEED_EVENTS.map((e) => e.id));
  const [readIds, setReadIds] = useState<string[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [notifPrefs, setNotifPrefsState] = useState<NotifPrefs>({
    severities: ["p1", "p2", "p3"],
    terminals: NOTIF_TERMINALS,
    quietEnabled: false,
    quietStart: "22:00",
    quietEnd: "06:00",
  });
  const seq = useRef(0);
  const currentUser = "A. Dadian";

  // Stream one deterministic event at a time while the board is open.
  useEffect(() => {
    if (!streaming) return;
    const t = window.setInterval(
      () => setStreamIndex((i) => (i >= INCOMING_EVENTS.length ? i : i + 1)),
      Math.max(600, Math.round(9000 / speed)),
    );
    return () => window.clearInterval(t);
  }, [streaming, speed]);

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
            diff: [
              { field: "Arrival rate", from: "84/hr", to: "0/hr" },
              { field: "Severity", from: "P2", to: "P1" },
            ],
            alertId: "DIS-2412",
          },
        ]
      : [];
    return [...mentionEvents, ...sim, ...live, ...SEED_EVENTS.slice().reverse()];
  }, [streamIndex, simulation, mentionEvents]);

  const unseenEventIds = useMemo(
    () => events.filter((e) => !seenIds.includes(e.id)).map((e) => e.id),
    [events, seenIds],
  );

  const candidates = useMemo<OpsEvent[]>(
    () =>
      events
        .filter((e) => e.change === "new" || e.change === "escalated")
        .filter((e) => !dismissedIds.includes(e.id))
        .filter((e) => !SEED_EVENTS.some((s) => s.id === e.id)),
    [events, dismissedIds],
  );

  const notifications = useMemo<OpsNotification[]>(() => {
    const isMention = (e: OpsEvent) => e.id.startsWith("MEN-");
    return candidates
      // Direct @mentions always land — they are addressed to a named role.
      .filter(
        (e) =>
          isMention(e) ||
          (notifPrefs.severities.includes(e.severity ?? "p3") &&
            notifPrefs.terminals.includes(eventTerminal(e))),
      )
      .map((e) => ({
        id: e.id,
        event: e,
        read: readIds.includes(e.id),
        mention: isMention(e),
      }));
  }, [candidates, readIds, notifPrefs]);

  const mutedCount = candidates.length - notifications.length;

  const quietActive =
    notifPrefs.quietEnabled && inQuietWindow(clock, notifPrefs.quietStart, notifPrefs.quietEnd);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markEventsSeen = useCallback(() => setSeenIds(events.map((e) => e.id)), [events]);
  const markNotificationRead = useCallback(
    (id: string) => setReadIds((p) => (p.includes(id) ? p : [...p, id])),
    [],
  );
  const markAllNotificationsRead = useCallback(() => setReadIds(events.map((e) => e.id)), [events]);
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

  const stamp = useCallback(() => clock.slice(0, 5), [clock]);

  const appendAudit = useCallback(
    (
      alertId: string,
      kind: AuditKind,
      text: string,
      who: string,
      mentions?: string[],
    ) => {
      seq.current += 1;
      const n = seq.current;
      setAudit((prev) => [
        ...prev,
        {
          id: `AUD-${alertId}-${n}`,
          alertId,
          seq: n,
          at: clock.slice(0, 5),
          who,
          kind,
          text,
          mentions,
        },
      ]);
    },
    [clock],
  );

  /** Base (seeded) trail for an item, rendered as immutable history. */
  const baseAudit = useCallback((alert: OpsAlert): AuditEntry[] => {
    return alert.activity
      .slice()
      .reverse()
      .map((a, i) => ({
        id: `AUD-${alert.id}-seed-${i}`,
        alertId: alert.id,
        seq: -1000 + i,
        at: a.at,
        who: a.who,
        kind: "raised" as AuditKind,
        text: a.text,
      }));
  }, []);

  const rawAlerts = useMemo(() => (simulation ? [SIM_ALERT, ...ALERTS] : ALERTS), [simulation]);

  const auditFor = useCallback(
    (alertId: string) => {
      const alert = rawAlerts.find((a) => a.id === alertId);
      const base = alert ? baseAudit(alert) : [];
      return [...base, ...audit.filter((e) => e.alertId === alertId)].sort((a, b) => a.seq - b.seq);
    },
    [audit, rawAlerts, baseAudit],
  );

  const alerts = useMemo(() => {
    const mapped = rawAlerts.map((a) => {
      const o = overlays[a.id];
      const state = o?.state ?? a.state;
      const trail = [...baseAudit(a), ...audit.filter((e) => e.alertId === a.id)].sort(
        (x, y) => y.seq - x.seq,
      );
      let severity = o?.severity ?? a.severity;
      let escalationReason: string | undefined;

      if (state !== "resolved" && state !== "dismissed") {
        for (const rule of escalationRules) {
          if (!rule.enabled) continue;
          const hit =
            (rule.id === "runway" && (a.impact === "Runway capacity" || Boolean(a.runway))) ||
            (rule.id === "sla" &&
              state === "new" &&
              (a.escalatesInMin ?? 999) <= slaMinutes) ||
            (rule.id === "gates" &&
              a.impact === "Gate availability" &&
              ["C", "D", "E"].includes(String(a.terminal)));
          if (hit && SEV_RANK[rule.to] < SEV_RANK[severity]) {
            severity = rule.to;
            escalationReason = rule.label;
          }
        }
      }

      return {
        ...a,
        state,
        severity,
        baseSeverity: o?.severity ?? a.severity,
        escalationReason,
        impact: o?.impact ?? a.impact,
        escalatesInMin: state !== "new" ? undefined : a.escalatesInMin,
        activity: trail.map((e) => ({ at: e.at, who: e.who, text: e.text })),
      };
    });

    // Auto re-rank: worst first, then most recent.
    return mapped.sort(
      (a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || b.time.localeCompare(a.time),
    );
  }, [overlays, rawAlerts, audit, baseAudit, escalationRules, slaMinutes]);

  const actions = useMemo(
    () => ACTIONS.map((a) => (completed.includes(a.id) ? { ...a, status: "complete" as const } : a)),
    [completed],
  );

  const acknowledge = useCallback(
    (id: string) => {
      setOverlays((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          state: prev[id]?.state && prev[id]?.state !== "new" ? prev[id]!.state : "acknowledged",
        },
      }));
      appendAudit(id, "ack", "Acknowledged — operator has the item", currentUser);
    },
    [appendAudit],
  );

  const triage = useCallback<OpsContextValue["triage"]>(
    (id, patch) => {
      setOverlays((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          state: "in_progress",
          severity: patch.severity,
          owner: patch.owner,
          impact: patch.impact,
        },
      }));
      appendAudit(
        id,
        "triage",
        `Set ${patch.severity.toUpperCase()} · ${patch.impact} — assigned to ${patch.owner}`,
        currentUser,
      );
      if (patch.note?.trim()) appendAudit(id, "note", patch.note.trim(), currentUser);
    },
    [appendAudit],
  );

  const resolve = useCallback(
    (id: string, note: string) => {
      setOverlays((prev) => ({ ...prev, [id]: { ...prev[id], state: "resolved" } }));
      appendAudit(
        id,
        "resolve",
        note || "Resolved — no further action required",
        currentUser,
      );
    },
    [appendAudit],
  );

  const reopen = useCallback(
    (id: string) => {
      setOverlays((prev) => ({ ...prev, [id]: { ...prev[id], state: "new" } }));
      appendAudit(id, "reopen", "Reopened for further review", currentUser);
    },
    [appendAudit],
  );

  /** Operator note. Writes to the trail and pings any @mentioned role. */
  const addNote = useCallback(
    (alertId: string, text: string) => {
      const body = text.trim();
      if (!body) return;
      const mentions = parseMentions(body);
      appendAudit(alertId, "note", body, currentUser, mentions.length ? mentions : undefined);
      if (!mentions.length) return;
      const alert = rawAlerts.find((a) => a.id === alertId);
      const actionable = ACTION_WORDS.test(body);
      const at = clock.slice(0, 5);
      setMentionEvents((prev) => [
        ...mentions.map((h, i) => {
          const role = ROLES.find((r) => r.handle === h)!;
          return {
            id: `MEN-${alertId}-${prev.length + i + 1}`,
            at,
            kind: "alert" as const,
            severity: alert?.severity ?? "p2",
            title: `${role.label} ${actionable ? "action requested" : "mentioned"} on ${alertId}`,
            detail: `${currentUser}: ${body}`,
            tags: [role.label, alertId, actionable ? "Action requested" : "FYI"],
            change: "new" as const,
            alertId,
            terminal: alert?.terminal ? String(alert.terminal) : "Airside",
          };
        }),
        ...prev,
      ]);
    },
    [appendAudit, rawAlerts, clock],
  );

  const completeAction = useCallback(
    (id: string) => setCompleted((prev) => (prev.includes(id) ? prev : [...prev, id])),
    [],
  );

  const setRuleEnabled = useCallback(
    (id: string, enabled: boolean) =>
      setEscalationRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled } : r))),
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
    addNote,
    auditFor,
    escalationRules,
    setRuleEnabled,
    slaMinutes,
    setSlaMinutes,
    events,
    unseenEventIds,
    markEventsSeen,
    streaming,
    setStreaming,
    speed,
    setSpeed,
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    dismissNotification,
    notifPrefs,
    setNotifPrefs: (p) => setNotifPrefsState((prev) => ({ ...prev, ...p })),
    quietActive,
    mutedCount,
  };

  return <OpsContext.Provider value={value}>{children}</OpsContext.Provider>;
}

export function useOps() {
  const ctx = useContext(OpsContext);
  if (!ctx) throw new Error("useOps must be used inside OpsProvider");
  return ctx;
}
