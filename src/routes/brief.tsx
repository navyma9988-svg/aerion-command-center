import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useOps } from "@/lib/ops-store";
import { AIRPORT } from "@/lib/airfield-data";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/brief")({
  head: () => ({
    meta: [
      { title: "Shift brief — DFW Airfield Command" },
      {
        name: "description",
        content:
          "A two-minute AI shift brief that reads the DFW airfield action register and ranks the day worst first.",
      },
      { property: "og:title", content: "Shift brief — DFW Airfield Command" },
      {
        property: "og:description",
        content: "Two-minute superintendent brief, ranked by risk and due date.",
      },
    ],
  }),
  component: BriefPage,
});

function BriefPage() {
  const { actions, alerts, simulation } = useOps();
  const [phase, setPhase] = useState<"idle" | "scanning" | "ranking" | "writing" | "done">("idle");
  const [text, setText] = useState("");
  const timers = useRef<number[]>([]);

  const overdue = actions.filter((a) => a.status === "overdue");
  const dueToday = actions.filter((a) => a.status === "due_today");
  const closing = actions.filter((a) => a.status === "closing");
  const p1 = alerts.filter((a) => a.severity === "p1" && a.state !== "resolved");

  const brief = [
    `Worst first: ${overdue[0]?.id ?? "—"} is ${overdue.length ? "21" : "0"} days past due — ${overdue[0]?.title ?? "nothing outstanding"}. No update in ${overdue[0]?.updatedDaysAgo ?? 0} days; the engineer of record is the blocker.`,
    `${p1.length} P1 disruption${p1.length === 1 ? "" : "s"} carrying into the shift. ${p1[0]?.title ?? "Board is clear."}`,
    `${dueToday.length} items due before end of shift, led by ${dueToday[0]?.id ?? "—"} — ${dueToday[0]?.title ?? ""}. Confirm the 2200 window with ATC before 1800 CT.`,
    `${closing.length} awaiting closure sign-off. ${closing[0]?.id ?? "—"} needs inspector acceptance to generate the package.`,
    simulation
      ? "Simulation: ground stop in effect until 1615 CT — expect ramp congestion on Terminal C and hold departures at Taxiway WL."
      : "Weather: low ceiling 300 ft, CAT II in effect, south flow. Plan for 6 NM arrival spacing through the afternoon bank.",
  ].join("\n\n");

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const generate = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setText("");
    setPhase("scanning");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setText(brief);
      setPhase("done");
      return;
    }
    timers.current.push(window.setTimeout(() => setPhase("ranking"), 700));
    timers.current.push(
      window.setTimeout(() => {
        setPhase("writing");
        const words = brief.split(" ");
        words.forEach((w, i) => {
          timers.current.push(
            window.setTimeout(() => {
              setText((t) => (t ? `${t} ${w}` : w));
              if (i === words.length - 1) setPhase("done");
            }, i * 22),
          );
        });
      }, 1400),
    );
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">DFW Airfield Brief</h1>
        <p className="mono-data text-xs text-muted-foreground">
          Shift start 0600 {AIRPORT.timezone} · reads today's register
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Each morning the app reads the whole action register and writes the superintendent a
          two-minute brief: what's burning, what's due before end of shift, and who's carrying the
          most risk.
        </p>
        <p className="mono-data mt-3 text-[11px] text-muted-foreground">
          {overdue.length} overdue · {dueToday.length} due today · {closing.length} awaiting closure ·
          Stalest: {overdue[1]?.id ?? overdue[0]?.id ?? "—"}, {overdue[1]?.updatedDaysAgo ?? 0} days
          without update
        </p>
      </section>

      <section
        aria-live="polite"
        className="min-h-40 rounded-xl border border-border bg-card p-4 text-sm leading-relaxed"
      >
        {phase === "idle" && (
          <p className="text-muted-foreground">Tap generate to write the morning briefing.</p>
        )}
        {(phase === "scanning" || phase === "ranking") && (
          <p className="mono-data text-cyan">
            {phase === "scanning"
              ? `Scanning ${actions.length} actions…`
              : "Ranking by risk and due date…"}
          </p>
        )}
        {(phase === "writing" || phase === "done") && (
          <div className="space-y-3 whitespace-pre-line">{text}</div>
        )}
      </section>

      <button
        type="button"
        onClick={generate}
        className={cn(
          "press inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground",
        )}
      >
        <Sparkles aria-hidden className="size-4" />
        {phase === "done" ? "Regenerate brief" : "Generate brief"}
      </button>

      <p className="mono-data text-center text-[11px] text-muted-foreground">Demo visuals only</p>
    </div>
  );
}
