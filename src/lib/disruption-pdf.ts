import { AIRPORT, SEVERITY_LABEL, STATE_LABEL, type OpsAlert } from "./airfield-data";

function esc(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);
}

/**
 * One-tap printable closure summary. Opens a print-ready document and hands off
 * to the browser print dialog, where the user can "Save as PDF".
 */
export function printDisruptionSummary(alert: OpsAlert, preparedBy: string) {
  const asset =
    alert.runway ??
    alert.stand ??
    (alert.taxiway ? `Taxiway ${alert.taxiway}` : (alert.terminal ?? "Airside"));

  const rows: [string, string][] = [
    ["Reference", alert.id],
    ["Severity", SEVERITY_LABEL[alert.severity]],
    ["Status", STATE_LABEL[alert.state]],
    ["Raised", `${alert.time} ${AIRPORT.timezone} · ${alert.source}`],
    ["Asset", asset],
    ["Operational impact", alert.impact],
    ["Linked action", alert.linkedAction ?? "—"],
    ["Prepared by", `${preparedBy} · ${AIRPORT.code} Airfield Operations`],
  ];

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<title>${esc(alert.id)} closure summary — ${esc(AIRPORT.code)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { font: 12px/1.5 "Helvetica Neue", Arial, sans-serif; color: #10151c; margin: 0; }
  h1 { font-size: 19px; margin: 0 0 2px; }
  .sub { font: 11px/1.4 "SFMono-Regular", Menlo, monospace; color: #5b6675; text-transform: uppercase; letter-spacing: .06em; }
  .rule { height: 3px; background: #10151c; margin: 12px 0 16px; }
  .lead { font-size: 14px; font-weight: 600; margin: 0 0 6px; }
  table { width: 100%; border-collapse: collapse; margin: 14px 0; }
  td { border-top: 1px solid #d7dce3; padding: 7px 0; vertical-align: top; }
  td.k { width: 38%; color: #5b6675; font: 11px/1.5 "SFMono-Regular", Menlo, monospace; text-transform: uppercase; letter-spacing: .04em; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; margin: 18px 0 6px; }
  ol { margin: 0; padding-left: 16px; }
  li { margin-bottom: 6px; }
  .meta { font: 10px/1.4 "SFMono-Regular", Menlo, monospace; color: #5b6675; }
  footer { margin-top: 24px; border-top: 1px solid #d7dce3; padding-top: 8px; font: 10px/1.4 "SFMono-Regular", Menlo, monospace; color: #5b6675; }
</style></head><body>
<h1>Disruption closure summary</h1>
<p class="sub">${esc(AIRPORT.code)} ${esc(AIRPORT.name)} · Airfield Command · ${esc(AIRPORT.asOf)} ${esc(AIRPORT.timezone)}</p>
<div class="rule"></div>
<p class="lead">${esc(alert.title)}</p>
<p>${esc(alert.detail)}</p>
<table>${rows
    .map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`)
    .join("")}</table>
<h2>Activity log</h2>
<ol>${alert.activity
    .slice()
    .reverse()
    .map(
      (a) =>
        `<li>${esc(a.text)}<div class="meta">${esc(a.who)} · ${esc(a.at)} ${esc(AIRPORT.timezone)}</div></li>`,
    )
    .join("")}</ol>
<footer>Generated from the DFW Airfield Command demo board. Demo data — not an operational record.</footer>
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=1200");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  window.setTimeout(() => w.print(), 350);
  return true;
}
