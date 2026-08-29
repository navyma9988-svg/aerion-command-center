/**
 * Deterministic demo data for DFW Airfield Command.
 * No randomness, no I/O — identical on server and client.
 */

export const AIRPORT = {
  code: "DFW",
  name: "Dallas/Fort Worth International",
  shiftDate: "2026-08-28",
  asOf: "14:32",
  timezone: "CT",
};

export const TERMINALS = ["A", "B", "C", "D", "E"] as const;
export type Terminal = (typeof TERMINALS)[number];

export const RUNWAYS = [
  { id: "17R/35L", status: "active", flow: "south", length: "13,401 ft" },
  { id: "18L/36R", status: "active", flow: "south", length: "13,400 ft" },
  { id: "17C/35C", status: "active", flow: "south", length: "13,401 ft" },
  { id: "18R/36L", status: "notam", flow: "south", length: "13,400 ft" },
  { id: "13R/31L", status: "active", flow: "south", length: "9,000 ft" },
  { id: "13L/31R", status: "closed", flow: "south", length: "9,301 ft" },
  { id: "17L/35R", status: "active", flow: "south", length: "8,500 ft" },
] as const;
export type Runway = (typeof RUNWAYS)[number];

export const WIND = { dir: 180, kt: 12, flow: "South flow", approach: "CAT II in effect" };

export type Severity = "p1" | "p2" | "p3";
export type AlertState = "new" | "acknowledged" | "in_progress" | "resolved" | "dismissed";

export type AlertSource = "Ops" | "NOTAM" | "Weather" | "Inspector" | "System" | "Ramp";

export interface OpsAlert {
  id: string;
  time: string; // 24h CT
  severity: Severity;
  source: AlertSource;
  title: string;
  detail: string;
  terminal?: Terminal | "Airside" | undefined;
  runway?: string | undefined;
  stand?: string | undefined;
  taxiway?: string | undefined;
  linkedAction?: string | undefined;
  impact: string;
  state: AlertState;
  escalatesInMin?: number | undefined;
  activity: { at: string; who: string; text: string }[];
}

export const ALERTS: OpsAlert[] = [
  {
    id: "DIS-2411",
    time: "14:28",
    severity: "p1",
    source: "Weather",
    title: "Low ceiling 300 ft — CAT II in effect, south flow",
    detail:
      "Ceiling dropped below CAT I minima at 14:22 CT. Arrival spacing increased to 6 NM on 17C/17R. Expect 18 min average airborne hold.",
    terminal: "Airside",
    runway: "17C/35C",
    impact: "Runway capacity",
    state: "new",
    escalatesInMin: 12,
    activity: [
      { at: "14:28", who: "System", text: "Alert raised from ATIS Kilo" },
      { at: "14:22", who: "Weather", text: "RVR 1,600 ft reported 17C touchdown" },
    ],
  },
  {
    id: "DIS-2410",
    time: "14:11",
    severity: "p1",
    source: "NOTAM",
    title: "Taxiway B closed 2200–0500 — NOTAM A1142/26 active",
    detail:
      "Duct bank tie-in at Sta 14+50 requires full-width closure. Night departures reroute via Taxiway EK. Ops to publish routing bulletin before 1800.",
    terminal: "C",
    taxiway: "B",
    linkedAction: "AF-133",
    impact: "Taxiway routing",
    state: "new",
    escalatesInMin: 26,
    activity: [
      { at: "14:11", who: "Ops", text: "NOTAM A1142/26 published" },
      { at: "13:40", who: "A. Dadian", text: "Closure window confirmed with airfield maintenance" },
    ],
  },
  {
    id: "DIS-2409",
    time: "13:52",
    severity: "p2",
    source: "Ramp",
    title: "Stand C14 held for maintenance — 2 departures reprotected",
    detail:
      "Jet bridge C14 hydraulic fault. Stand out of service pending vendor. AA2412 and AA1180 moved to C17 and C21.",
    terminal: "C",
    stand: "C14",
    linkedAction: "AF-127",
    impact: "Gate availability",
    state: "acknowledged",
    activity: [
      { at: "13:58", who: "K. Patel", text: "Acknowledged — vendor dispatched, ETA 1500" },
      { at: "13:52", who: "Ramp", text: "Stand reported out of service" },
    ],
  },
  {
    id: "DIS-2408",
    time: "13:20",
    severity: "p2",
    source: "Ops",
    title: "De-ice pad 3 offline — queue 11 aircraft, 22 min",
    detail:
      "Glycol recovery pump failed on pad 3. Pads 1 and 2 absorbing demand. Departure queue holding at Taxiway WL.",
    terminal: "Airside",
    impact: "Schedule only",
    state: "acknowledged",
    activity: [
      { at: "13:31", who: "M. Reyes", text: "Acknowledged — pad 3 isolated, crews reassigned" },
      { at: "13:20", who: "Ops", text: "Pump 3B alarm" },
    ],
  },
  {
    id: "DIS-2407",
    time: "12:44",
    severity: "p3",
    source: "Inspector",
    title: "FOD sweep due — Runway 13R/31L threshold",
    detail: "Scheduled sweep slipped from 1200. Next window 1530 between arrival banks.",
    runway: "13R/31L",
    terminal: "Airside",
    impact: "Safety",
    state: "new",
    activity: [{ at: "12:44", who: "Inspector", text: "Sweep window missed" }],
  },
  {
    id: "DIS-2406",
    time: "11:58",
    severity: "p1",
    source: "Ops",
    title: "Runway 13L/31R closed — pavement spall at 31R threshold",
    detail:
      "Spalling found on the 31R displaced threshold during the 1130 inspection. Runway closed until repair sign-off. Capacity reduced by 9 movements per hour.",
    runway: "13L/31R",
    terminal: "Airside",
    linkedAction: "AF-118",
    impact: "Runway capacity",
    state: "in_progress",
    activity: [
      { at: "12:30", who: "A. Dadian", text: "P1 set — repair crew mobilized, target reopen 1800" },
      { at: "12:02", who: "A. Dadian", text: "Acknowledged" },
      { at: "11:58", who: "Inspector", text: "Closure requested" },
    ],
  },
  {
    id: "DIS-2405",
    time: "11:12",
    severity: "p3",
    source: "System",
    title: "Baggage belt B7 fault cleared — Terminal B",
    detail: "Belt B7 restored after 34 minutes. 240 bags re-inducted, no misconnects reported.",
    terminal: "B",
    impact: "Schedule only",
    state: "resolved",
    activity: [
      { at: "11:46", who: "J. Okafor", text: "Resolved — belt restored, backlog cleared" },
      { at: "11:12", who: "System", text: "Fault raised" },
    ],
  },
  {
    id: "DIS-2404",
    time: "10:35",
    severity: "p2",
    source: "Ops",
    title: "Security lane surge — Terminal D checkpoint 2, 31 min wait",
    detail: "Two lanes down for equipment recalibration. Passengers redirected to checkpoint 3.",
    terminal: "D",
    impact: "Schedule only",
    state: "resolved",
    activity: [
      { at: "11:20", who: "K. Patel", text: "Resolved — lanes back in service, wait 9 min" },
      { at: "10:41", who: "K. Patel", text: "Acknowledged" },
      { at: "10:35", who: "Ops", text: "Wait time threshold breached" },
    ],
  },
  {
    id: "DIS-2403",
    time: "09:47",
    severity: "p2",
    source: "NOTAM",
    title: "Runway 18R/36L NOTAM'd — ILS glideslope unserviceable",
    detail: "Glideslope out of service for flight check until 1900. LOC/DME approaches only.",
    runway: "18R/36L",
    terminal: "Airside",
    impact: "Runway capacity",
    state: "acknowledged",
    activity: [
      { at: "09:55", who: "M. Reyes", text: "Acknowledged — flight check scheduled 1700" },
      { at: "09:47", who: "NOTAM", text: "A1139/26 published" },
    ],
  },
  {
    id: "DIS-2402",
    time: "08:14",
    severity: "p3",
    source: "Ramp",
    title: "GSE staging encroaching Stand A22 safety line",
    detail: "Two belt loaders parked outside the equipment box. Ramp lead notified.",
    terminal: "A",
    stand: "A22",
    impact: "Safety",
    state: "resolved",
    activity: [
      { at: "08:40", who: "J. Okafor", text: "Resolved — equipment restaged, photos filed" },
      { at: "08:14", who: "Ramp", text: "Reported on walkdown" },
    ],
  },
  {
    id: "DIS-2401",
    time: "06:02",
    severity: "p1",
    source: "System",
    title: "Escalation — AF-118 is 21 days overdue",
    detail:
      "No update in 9 days on the Sta 14+50 duct bank RFI response. Program manager copied automatically.",
    terminal: "C",
    linkedAction: "AF-118",
    impact: "Schedule only",
    state: "acknowledged",
    activity: [
      { at: "06:19", who: "A. Dadian", text: "Acknowledged — chasing engineer of record today" },
      { at: "06:02", who: "System", text: "Escalated at 7 days stale" },
    ],
  },
  {
    id: "DIS-2400",
    time: "05:41",
    severity: "p3",
    source: "Inspector",
    title: "Closure approved — AF-112 signed off by inspector",
    detail: "J. Okafor's verification photos accepted. Action closed, closure package generated.",
    terminal: "E",
    linkedAction: "AF-112",
    impact: "Schedule only",
    state: "resolved",
    activity: [{ at: "05:41", who: "Inspector", text: "Sign-off recorded" }],
  },
  {
    id: "DIS-2399",
    time: "05:30",
    severity: "p2",
    source: "Ops",
    title: "Pre-pour survey at 1400 — AF-134, Terminal E apron",
    detail: "Formwork complete. Survey crew confirmed for 1400 CT; pour window 1600–2200.",
    terminal: "E",
    linkedAction: "AF-134",
    impact: "Schedule only",
    state: "new",
    escalatesInMin: 48,
    activity: [{ at: "05:30", who: "Ops", text: "Scheduled item raised for the shift" }],
  },
];

export type ActionStatus = "overdue" | "due_today" | "open" | "blocked" | "closing" | "complete";

export interface AirfieldAction {
  id: string;
  title: string;
  owner: string;
  area: string;
  terminal?: Terminal | "Airside" | undefined;
  status: ActionStatus;
  due: string;
  updatedDaysAgo: number;
  priority: "Routine" | "Critical";
  detail: string;
  activity: { at: string; who: string; text: string }[];
}

export const OWNERS = [
  { initials: "MR", name: "M. Reyes" },
  { initials: "JO", name: "J. Okafor" },
  { initials: "AD", name: "A. Dadian" },
  { initials: "KP", name: "K. Patel" },
];

export const ACTIONS: AirfieldAction[] = [
  {
    id: "AF-118",
    title: "Respond to RFI-214 — duct bank conflict at Sta 14+50",
    owner: "M. Reyes",
    area: "Sta 14+50 duct bank",
    terminal: "C",
    status: "overdue",
    due: "Aug 7",
    updatedDaysAgo: 9,
    priority: "Critical",
    detail:
      'Electrical sub reviewing clearances to existing 5" conduit bank. Engineer of record requested a revised routing sketch before issuing the response.',
    activity: [
      { at: "Aug 19", who: "M. Reyes", text: "Engineer requested revised routing sketch" },
      { at: "Aug 3", who: "System", text: "RFI-214 logged with engineer of record" },
      { at: "Jul 24", who: "A. Dadian", text: "Action created" },
    ],
  },
  {
    id: "AF-104",
    title: "Close out pavement coring report — Runway 13L/31R",
    owner: "A. Dadian",
    area: "Runway 13L/31R",
    terminal: "Airside",
    status: "overdue",
    due: "Aug 14",
    updatedDaysAgo: 11,
    priority: "Critical",
    detail: "Lab results received. Report needs geotech sign-off before it can be filed.",
    activity: [
      { at: "Aug 17", who: "A. Dadian", text: "Lab results attached" },
      { at: "Aug 1", who: "System", text: "Action created" },
    ],
  },
  {
    id: "AF-133",
    title: "Coordinate NOTAM for Taxiway B closure",
    owner: "A. Dadian",
    area: "Taxiway B",
    terminal: "C",
    status: "due_today",
    due: "Aug 28",
    updatedDaysAgo: 0,
    priority: "Critical",
    detail: "Publish routing bulletin and confirm the 2200–0500 window with ATC and airfield ops.",
    activity: [{ at: "Aug 28", who: "Ops", text: "NOTAM A1142/26 published" }],
  },
  {
    id: "AF-134",
    title: "Pre-pour survey at 1400 — Terminal E apron",
    owner: "J. Okafor",
    area: "Terminal E apron",
    terminal: "E",
    status: "due_today",
    due: "Aug 28",
    updatedDaysAgo: 0,
    priority: "Routine",
    detail: "Formwork complete. Survey crew confirmed; pour window 1600–2200.",
    activity: [{ at: "Aug 28", who: "J. Okafor", text: "Formwork inspection passed" }],
  },
  {
    id: "AF-127",
    title: "Jet bridge C14 hydraulic fault — vendor callout",
    owner: "K. Patel",
    area: "Stand C14",
    terminal: "C",
    status: "due_today",
    due: "Aug 28",
    updatedDaysAgo: 0,
    priority: "Critical",
    detail: "Vendor dispatched at 1358 CT. Stand remains out of service until load test passes.",
    activity: [{ at: "Aug 28", who: "K. Patel", text: "Vendor dispatched, ETA 1500" }],
  },
  {
    id: "AF-129",
    title: "Update perimeter road detour signage",
    owner: "K. Patel",
    area: "Perimeter road",
    terminal: "Airside",
    status: "due_today",
    due: "Aug 28",
    updatedDaysAgo: 2,
    priority: "Routine",
    detail: "Six sign panels to be relocated ahead of the north gate closure.",
    activity: [{ at: "Aug 26", who: "K. Patel", text: "Panels staged at yard" }],
  },
  {
    id: "AF-121",
    title: "Verify grounding continuity — Terminal A apron lighting",
    owner: "M. Reyes",
    area: "Terminal A apron",
    terminal: "A",
    status: "open",
    due: "Sep 2",
    updatedDaysAgo: 3,
    priority: "Routine",
    detail: "Megger readings pending on circuits 4 and 5.",
    activity: [{ at: "Aug 25", who: "M. Reyes", text: "Circuits 1–3 tested clear" }],
  },
  {
    id: "AF-123",
    title: "Reconcile as-builts for Taxiway EK realignment",
    owner: "J. Okafor",
    area: "Taxiway EK",
    terminal: "Airside",
    status: "open",
    due: "Sep 4",
    updatedDaysAgo: 4,
    priority: "Routine",
    detail: "Survey deltas from the July realignment need to be folded into the record set.",
    activity: [{ at: "Aug 24", who: "J. Okafor", text: "Survey file received" }],
  },
  {
    id: "AF-125",
    title: "Submit monthly SWPPP inspection — north airfield",
    owner: "K. Patel",
    area: "North airfield",
    terminal: "Airside",
    status: "open",
    due: "Sep 1",
    updatedDaysAgo: 5,
    priority: "Routine",
    detail: "Photos captured; narrative still to be written.",
    activity: [{ at: "Aug 23", who: "K. Patel", text: "Site walk complete" }],
  },
  {
    id: "AF-130",
    title: "Confirm generator load bank test window — Terminal D",
    owner: "M. Reyes",
    area: "Terminal D plant",
    terminal: "D",
    status: "open",
    due: "Sep 5",
    updatedDaysAgo: 1,
    priority: "Routine",
    detail: "Facilities holding two candidate windows; needs ops concurrence.",
    activity: [{ at: "Aug 27", who: "M. Reyes", text: "Windows proposed" }],
  },
  {
    id: "AF-136",
    title: "Stakeholder walkdown — Terminal B baggage tunnel",
    owner: "J. Okafor",
    area: "Terminal B tunnel",
    terminal: "B",
    status: "open",
    due: "Sep 8",
    updatedDaysAgo: 2,
    priority: "Routine",
    detail: "Coordinate access escort with baggage operations.",
    activity: [{ at: "Aug 26", who: "J. Okafor", text: "Access request submitted" }],
  },
  {
    id: "AF-112",
    title: "Verification photos — Terminal E apron joint seal",
    owner: "J. Okafor",
    area: "Terminal E apron",
    terminal: "E",
    status: "closing",
    due: "Aug 25",
    updatedDaysAgo: 0,
    priority: "Routine",
    detail: "Inspector accepted verification photos at 0541 CT. Closure package generating.",
    activity: [{ at: "Aug 28", who: "Inspector", text: "Sign-off recorded" }],
  },
  {
    id: "AF-115",
    title: "Final punch — north gate guardhouse",
    owner: "A. Dadian",
    area: "North gate",
    terminal: "Airside",
    status: "closing",
    due: "Aug 26",
    updatedDaysAgo: 1,
    priority: "Routine",
    detail: "Two punch items remaining, both cosmetic. Awaiting owner sign-off.",
    activity: [{ at: "Aug 27", who: "A. Dadian", text: "Punch list resubmitted" }],
  },
  {
    id: "AF-108",
    title: "Restore Taxiway WL edge lighting circuit",
    owner: "M. Reyes",
    area: "Taxiway WL",
    terminal: "Airside",
    status: "complete",
    due: "Aug 20",
    updatedDaysAgo: 8,
    priority: "Critical",
    detail: "Circuit restored and witnessed by airfield electrical.",
    activity: [{ at: "Aug 20", who: "M. Reyes", text: "Marked complete" }],
  },
  {
    id: "AF-110",
    title: "Issue revised phasing plan — Terminal C apron",
    owner: "A. Dadian",
    area: "Terminal C apron",
    terminal: "C",
    status: "complete",
    due: "Aug 18",
    updatedDaysAgo: 10,
    priority: "Routine",
    detail: "Rev C issued to all stakeholders.",
    activity: [{ at: "Aug 18", who: "A. Dadian", text: "Marked complete" }],
  },
  {
    id: "AF-137",
    title: "Escort plan for night-shift concrete deliveries",
    owner: "K. Patel",
    area: "Taxiway B",
    terminal: "C",
    status: "open",
    due: "Sep 3",
    updatedDaysAgo: 1,
    priority: "Routine",
    detail: "Badging office to confirm two additional escorts for the 2200 window.",
    activity: [{ at: "Aug 27", who: "K. Patel", text: "Escort request filed" }],
  },
];

export interface Flight {
  id: string;
  callsign: string;
  type: string;
  tail: string;
  origin: string;
  destination: string;
  movement: "arrival" | "departure";
  runway: string;
  stand: string;
  terminal: Terminal;
  sched: string;
  est: string;
  delayMin: number;
  status: "On time" | "Delayed" | "Holding" | "Taxiing" | "At gate" | "Airborne";
  /** normalized 0-1 position along the movement path, for the map */
  progress: number;
}

export const FLIGHTS: Flight[] = [
  { id: "F1", callsign: "AA2412", type: "B738", tail: "N826NN", origin: "MIA", destination: "DFW", movement: "arrival", runway: "17C/35C", stand: "C17", terminal: "C", sched: "14:35", est: "14:51", delayMin: 16, status: "Holding", progress: 0.18 },
  { id: "F2", callsign: "AA1180", type: "A321", tail: "N145AA", origin: "DFW", destination: "SEA", movement: "departure", runway: "17R/35L", stand: "C21", terminal: "C", sched: "14:40", est: "15:04", delayMin: 24, status: "Delayed", progress: 0.42 },
  { id: "F3", callsign: "UA512", type: "B739", tail: "N38459", origin: "ORD", destination: "DFW", movement: "arrival", runway: "17C/35C", stand: "E12", terminal: "E", sched: "14:44", est: "14:44", delayMin: 0, status: "On time", progress: 0.62 },
  { id: "F4", callsign: "DL2207", type: "A220", tail: "N301DU", origin: "ATL", destination: "DFW", movement: "arrival", runway: "17L/35R", stand: "E31", terminal: "E", sched: "14:48", est: "14:56", delayMin: 8, status: "Airborne", progress: 0.31 },
  { id: "F5", callsign: "AA9", type: "B789", tail: "N832AA", origin: "DFW", destination: "LHR", movement: "departure", runway: "17R/35L", stand: "D22", terminal: "D", sched: "15:05", est: "15:05", delayMin: 0, status: "At gate", progress: 0.08 },
  { id: "F6", callsign: "AA2670", type: "E175", tail: "N214NN", origin: "OKC", destination: "DFW", movement: "arrival", runway: "13R/31L", stand: "B14", terminal: "B", sched: "14:38", est: "14:41", delayMin: 3, status: "Taxiing", progress: 0.78 },
  { id: "F7", callsign: "WN1466", type: "B737", tail: "N7844A", origin: "DFW", destination: "DEN", movement: "departure", runway: "18L/36R", stand: "A18", terminal: "A", sched: "14:55", est: "15:22", delayMin: 27, status: "Delayed", progress: 0.25 },
  { id: "F8", callsign: "AA483", type: "A320", tail: "N652AW", origin: "DFW", destination: "LAX", movement: "departure", runway: "17R/35L", stand: "A22", terminal: "A", sched: "15:10", est: "15:10", delayMin: 0, status: "At gate", progress: 0.05 },
  { id: "F9", callsign: "QR730", type: "A350", tail: "A7-ALX", origin: "DOH", destination: "DFW", movement: "arrival", runway: "17C/35C", stand: "D18", terminal: "D", sched: "14:52", est: "15:14", delayMin: 22, status: "Holding", progress: 0.12 },
  { id: "F10", callsign: "AA1745", type: "B738", tail: "N901NN", origin: "DFW", destination: "MCO", movement: "departure", runway: "18L/36R", stand: "C31", terminal: "C", sched: "15:00", est: "15:06", delayMin: 6, status: "Taxiing", progress: 0.55 },
  { id: "F11", callsign: "AS642", type: "B739", tail: "N265AK", origin: "SEA", destination: "DFW", movement: "arrival", runway: "17L/35R", stand: "E08", terminal: "E", sched: "15:02", est: "15:02", delayMin: 0, status: "Airborne", progress: 0.22 },
  { id: "F12", callsign: "AA2288", type: "E175", tail: "N228NN", origin: "DFW", destination: "TUL", movement: "departure", runway: "13R/31L", stand: "B21", terminal: "B", sched: "14:47", est: "14:59", delayMin: 12, status: "Taxiing", progress: 0.66 },
];

export const TERMINAL_HEALTH: {
  terminal: Terminal;
  standsAvailable: number;
  standsTotal: number;
  securityWaitMin: number;
  openActions: number;
  overdueActions: number;
  belts: string;
}[] = [
  { terminal: "A", standsAvailable: 6, standsTotal: 24, securityWaitMin: 11, openActions: 2, overdueActions: 0, belts: "All belts nominal" },
  { terminal: "B", standsAvailable: 9, standsTotal: 22, securityWaitMin: 8, openActions: 1, overdueActions: 0, belts: "Belt B7 restored 11:46" },
  { terminal: "C", standsAvailable: 3, standsTotal: 26, securityWaitMin: 17, openActions: 5, overdueActions: 1, belts: "All belts nominal" },
  { terminal: "D", standsAvailable: 5, standsTotal: 28, securityWaitMin: 22, openActions: 1, overdueActions: 0, belts: "All belts nominal" },
  { terminal: "E", standsAvailable: 8, standsTotal: 20, securityWaitMin: 9, openActions: 3, overdueActions: 0, belts: "All belts nominal" },
];

export const SEVERITY_LABEL: Record<Severity, string> = {
  p1: "P1 Immediate",
  p2: "P2 Same shift",
  p3: "P3 Scheduled",
};

export const STATE_LABEL: Record<AlertState, string> = {
  new: "Open",
  acknowledged: "Acknowledged",
  in_progress: "In progress",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export const IMPACTS = [
  "Runway capacity",
  "Taxiway routing",
  "Gate availability",
  "Safety",
  "Schedule only",
];

/* ------------------------------------------------------------------ */
/* Live operations event stream (deterministic, replayed on a timer)   */
/* ------------------------------------------------------------------ */

export type EventKind = "alert" | "action" | "runway" | "flight" | "weather" | "ramp";

export interface OpsEvent {
  id: string;
  at: string; // 24h CT
  kind: EventKind;
  severity?: Severity | undefined;
  title: string;
  detail: string;
  tags: string[];
  /** what changed, for the "since you last looked" ribbon */
  change?: "new" | "escalated" | "updated" | "cleared" | undefined;
  alertId?: string | undefined;
  actionId?: string | undefined;
  callsign?: string | undefined;
  terminal?: string | undefined;
}

/** Already on the board when the shift opens. */
export const SEED_EVENTS: OpsEvent[] = [
  {
    id: "EV-0801",
    at: "13:20",
    kind: "ramp",
    severity: "p2",
    title: "De-ice pad 3 offline — glycol recovery pump failure",
    detail: "Pads 1 and 2 absorbing demand. Departure queue holding at Taxiway WL, 11 aircraft.",
    tags: ["Airside", "De-ice"],
    change: "new",
    alertId: "DIS-2408",
  },
  {
    id: "EV-0802",
    at: "13:52",
    kind: "ramp",
    severity: "p2",
    title: "Stand C14 out of service — jet bridge hydraulic fault",
    detail: "AA2412 and AA1180 reprotected to C17 and C21. Vendor ETA 1500 CT.",
    tags: ["Terminal C", "C14", "AF-127"],
    change: "new",
    alertId: "DIS-2409",
    actionId: "AF-127",
  },
  {
    id: "EV-0803",
    at: "14:02",
    kind: "flight",
    title: "QR730 entering hold — DOH arrival, 22 min airborne delay",
    detail: "Assigned BOOVE hold at FL200. Stand D18 protected.",
    tags: ["Terminal D", "QR730"],
    change: "updated",
    callsign: "QR730",
    terminal: "D",
  },
  {
    id: "EV-0804",
    at: "14:11",
    kind: "action",
    severity: "p1",
    title: "NOTAM A1142/26 published — Taxiway B closed 2200–0500",
    detail: "Duct bank tie-in at Sta 14+50. Night departures reroute via Taxiway EK.",
    tags: ["Terminal C", "TWY B", "AF-133"],
    change: "new",
    alertId: "DIS-2410",
    actionId: "AF-133",
  },
  {
    id: "EV-0805",
    at: "14:22",
    kind: "weather",
    severity: "p1",
    title: "Ceiling 300 ft — CAT II minima in effect on south flow",
    detail: "RVR 1,600 ft at 17C touchdown. Arrival spacing increased to 6 NM.",
    tags: ["Airside", "17C/35C", "CAT II"],
    change: "escalated",
    alertId: "DIS-2411",
  },
  {
    id: "EV-0806",
    at: "14:29",
    kind: "runway",
    title: "13L/31R remains closed — pavement panel replacement day 3 of 5",
    detail: "No change to published closure. Crossing traffic via WM only.",
    tags: ["Airside", "13L/31R"],
    change: "updated",
  },
];

/** Streamed in one at a time while the board is open. */
export const INCOMING_EVENTS: OpsEvent[] = [
  {
    id: "EV-0807",
    at: "14:36",
    kind: "flight",
    title: "AA2412 breaking hold — cleared ILS 17C, 12 NM final",
    detail: "Stand C17 confirmed, ramp control notified. Revised on-block 14:51 CT.",
    tags: ["Terminal C", "AA2412", "17C/35C"],
    change: "updated",
    callsign: "AA2412",
    terminal: "C",
  },
  {
    id: "EV-0808",
    at: "14:39",
    kind: "ramp",
    severity: "p2",
    title: "Terminal D stand pressure — 5 of 28 stands available",
    detail: "Two widebody arrivals inside 30 min. Ramp requesting tow of N832AA off D22.",
    tags: ["Terminal D", "Stands"],
    change: "new",
    terminal: "D",
    alertId: "DIS-2407",
  },
  {
    id: "EV-0809",
    at: "14:43",
    kind: "weather",
    severity: "p1",
    title: "CAT II escalated — RVR trending 1,200 ft on 17C",
    detail: "Second look at 14:41 CT shows continued deterioration. Consider flow reduction request to Fort Worth Center.",
    tags: ["Airside", "17C/35C", "CAT II"],
    change: "escalated",
    alertId: "DIS-2411",
  },
  {
    id: "EV-0810",
    at: "14:47",
    kind: "action",
    severity: "p3",
    title: "AF-133 evidence attached — closure routing bulletin drafted",
    detail: "Bulletin ready for Ops review before 1800 CT publication deadline.",
    tags: ["Terminal C", "AF-133"],
    change: "updated",
    actionId: "AF-133",
  },
  {
    id: "EV-0811",
    at: "14:51",
    kind: "ramp",
    title: "Stand C14 restored — jet bridge hydraulics tested and signed off",
    detail: "Vendor closed the fault at 14:49 CT. Stand returned to the allocation pool.",
    tags: ["Terminal C", "C14", "AF-127"],
    change: "cleared",
    alertId: "DIS-2409",
    actionId: "AF-127",
  },
  {
    id: "EV-0812",
    at: "14:55",
    kind: "runway",
    severity: "p2",
    title: "17L/35R inspection requested — FOD report from WN1466",
    detail: "Airfield ops rolling for a 10 min surface sweep. Expect single-runway departures on the west side.",
    tags: ["Airside", "17L/35R", "FOD"],
    change: "new",
    alertId: "DIS-2405",
  },
  {
    id: "EV-0813",
    at: "14:59",
    kind: "flight",
    title: "WN1466 pushed — DEN departure off blocks, +27 min",
    detail: "Sequenced 6th for 18L. No further impact to the A pier push schedule.",
    tags: ["Terminal A", "WN1466"],
    change: "updated",
    callsign: "WN1466",
    terminal: "A",
  },
  {
    id: "EV-0814",
    at: "15:03",
    kind: "weather",
    title: "Ceiling improving — 500 ft reported, CAT I review at 1515",
    detail: "Trend supports returning to 5 NM spacing if it holds for two consecutive observations.",
    tags: ["Airside", "CAT II"],
    change: "cleared",
    alertId: "DIS-2411",
  },
];

export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  alert: "Disruption",
  action: "Airfield action",
  runway: "Runway",
  flight: "Flight",
  weather: "Weather",
  ramp: "Ramp",
};

export const CHANGE_LABEL: Record<NonNullable<OpsEvent["change"]>, string> = {
  new: "New",
  escalated: "Escalated",
  updated: "Updated",
  cleared: "Cleared",
};
