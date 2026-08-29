import { AIRPORT, AUDIT_KIND_LABEL, type OpsAlert } from "./airfield-data";
import type { AuditEntry } from "./ops-store";

function download(name: string, mime: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function payload(alert: OpsAlert, trail: AuditEntry[]) {
  return {
    airport: AIRPORT.code,
    exportedAt: `${AIRPORT.shiftDate} ${AIRPORT.asOf} ${AIRPORT.timezone}`,
    disruption: {
      id: alert.id,
      raised: alert.time,
      source: alert.source,
      severity: alert.severity,
      state: alert.state,
      title: alert.title,
      impact: alert.impact,
      asset: alert.runway ?? alert.stand ?? alert.taxiway ?? alert.terminal ?? "Airside",
      linkedAction: alert.linkedAction ?? null,
    },
    auditTrail: trail.map((e, i) => ({
      sequence: i + 1,
      at: `${e.at} ${AIRPORT.timezone}`,
      who: e.who,
      type: AUDIT_KIND_LABEL[e.kind],
      entry: e.text,
      mentions: e.mentions ?? [],
    })),
    note: "Immutable audit trail — demo data, not an operational record.",
  };
}

export function exportAuditJson(alert: OpsAlert, trail: AuditEntry[]) {
  download(
    `${alert.id}-audit-trail.json`,
    "application/json",
    JSON.stringify(payload(alert, trail), null, 2),
  );
}

export function exportAuditCsv(alert: OpsAlert, trail: AuditEntry[]) {
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = [
    ["disruption_id", "sequence", "time_ct", "operator", "entry_type", "entry", "mentions"],
    ...trail.map((e, i) => [
      alert.id,
      String(i + 1),
      e.at,
      e.who,
      AUDIT_KIND_LABEL[e.kind],
      e.text,
      (e.mentions ?? []).join(" "),
    ]),
  ];
  download(
    `${alert.id}-audit-trail.csv`,
    "text/csv",
    rows.map((r) => r.map(q).join(",")).join("\r\n"),
  );
}
