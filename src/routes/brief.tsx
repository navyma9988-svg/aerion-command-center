import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useOps } from "@/lib/ops-store";
import { AIRPORT } from "@/lib/airfield-data";
import {
  CircleCheck,
  FileText,
  ListFilter,
  PenLine,
  RadioTower,
  ScanLine,
  Sparkles,
} from "lucide-react";
import { OpsButton } from "@/components/ops-button";

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
  const phaseIndex = { idle: -1, scanning: 0, ranking: 1, writing: 2, done: 3 }[phase];
  const phaseLabel = {
    idle: "Standing by",
    scanning: "Scanning register",
    ranking: "Ranking risk",
    writing: "Writing brief",
    done: "Brief ready",
  }[phase];
  const processSteps = [
    { key: "scanning", label: "Scan", detail: `${actions.length} actions`, icon: ScanLine },
    { key: "ranking", label: "Rank", detail: "Worst first", icon: ListFilter },
    { key: "writing", label: "Write", detail: "Shift voice", icon: PenLine },
    { key: "done", label: "Ready", detail: "2 min read", icon: CircleCheck },
  ] as const;

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
    <div className="brief-command-deck space-y-4">
      <header className="brief-page-header">
        <div>
          <p className="mono-data brief-eyebrow">Command brief · 0600 {AIRPORT.timezone}</p>
          <h1>DFW Airfield Brief</h1>
        </div>
        <span className="brief-register-status">
          <span aria-hidden />
          Register loaded
        </span>
      </header>

      <section className="brief-readiness" aria-labelledby="brief-readiness-title">
        <div className="brief-readiness__header">
          <div className="brief-readiness__identity">
            <span className="brief-readiness__icon" aria-hidden>
              <RadioTower />
            </span>
            <div>
              <p className="brief-eyebrow">Register intelligence</p>
              <h2 id="brief-readiness-title">Morning readiness</h2>
            </div>
          </div>
          <span className="mono-data brief-readiness__phase">{phaseLabel}</span>
        </div>

        <div className="brief-readiness__priority">
          <div>
            <p className="brief-eyebrow">Priority posture</p>
            <p className="brief-readiness__statement">
              {overdue.length
                ? `${overdue.length} overdue actions require shift ownership.`
                : "No overdue actions require shift ownership."}
            </p>
          </div>
          <div className="brief-readiness__stale">
            <strong className="mono-data">{overdue[1]?.updatedDaysAgo ?? 0}d</strong>
            <span>stalest update</span>
          </div>
        </div>

        <dl className="brief-signal-grid">
          <div className="brief-signal" data-tone="coral">
            <dt>Overdue</dt>
            <dd className="mono-data">{overdue.length}</dd>
          </div>
          <div className="brief-signal" data-tone="amber">
            <dt>Due today</dt>
            <dd className="mono-data">{dueToday.length}</dd>
          </div>
          <div className="brief-signal" data-tone="cyan">
            <dt>Closing</dt>
            <dd className="mono-data">{closing.length}</dd>
          </div>
        </dl>
      </section>

      <ol className="brief-process" aria-label="Brief generation stages">
        {processSteps.map((step, index) => {
          const state =
            phaseIndex === index ? "active" : phaseIndex > index ? "complete" : "pending";
          const StepIcon = step.icon;
          return (
            <li
              key={step.key}
              className="brief-stage"
              data-state={state}
              aria-current={state === "active" ? "step" : undefined}
            >
              <span className="brief-stage__marker" aria-hidden>
                <StepIcon />
              </span>
              <span className="brief-stage__label">{step.label}</span>
              <span className="brief-stage__detail">{step.detail}</span>
            </li>
          );
        })}
      </ol>

      <section
        aria-live="polite"
        aria-busy={phase !== "idle" && phase !== "done"}
        className="brief-output"
        data-phase={phase}
      >
        <div className="brief-output__header">
          <span>
            <FileText aria-hidden />
            Command narrative
          </span>
          <span className="mono-data">2 MIN · CT</span>
        </div>
        <div className="brief-output__body">
          {(phase === "scanning" || phase === "ranking") && (
            <span className="brief-output__beam" aria-hidden />
          )}
          {phase === "idle" && (
            <div className="brief-output__idle">
              <span className="brief-output__idle-icon" aria-hidden>
                <FileText />
              </span>
              <div>
                <p>Command narrative ready to compile</p>
                <span>Worst first · shift actions · airfield risk</span>
              </div>
            </div>
          )}
          {(phase === "scanning" || phase === "ranking") && (
            <div className="brief-output__working">
              <p className="mono-data">
                {phase === "scanning"
                  ? `Scanning ${actions.length} actions…`
                  : "Ranking by risk and due date…"}
              </p>
              <div aria-hidden className="brief-output__lines">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
          {(phase === "writing" || phase === "done") && (
            <div className="brief-output__copy whitespace-pre-line">{text}</div>
          )}
        </div>
      </section>

      <OpsButton
        onClick={generate}
        intent="brand"
        emphasis="solid"
        className="brief-generate-button w-full"
        aria-describedby="brief-demo-note"
      >
        <Sparkles aria-hidden className="size-4" />
        {phase === "done" ? "Regenerate brief" : "Generate brief"}
      </OpsButton>

      <p id="brief-demo-note" className="brief-demo-note">
        Deterministic demo · generated locally
      </p>
    </div>
  );
}
