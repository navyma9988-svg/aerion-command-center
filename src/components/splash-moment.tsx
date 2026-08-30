import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand-mark";

export function SplashMoment() {
  const [phase, setPhase] = useState<"enter" | "exit" | "done">("enter");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const exitTimer = window.setTimeout(() => setPhase("exit"), reduced ? 120 : 760);
    const doneTimer = window.setTimeout(() => setPhase("done"), reduced ? 180 : 1040);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      role="status"
      aria-label="AERION Command Center is ready"
      className={cn("launch-screen", phase === "exit" && "launch-screen--exit")}
    >
      <div className="launch-screen__glow" aria-hidden />
      <BrandMark className="launch-mark" />
      <div className="text-center">
        <p className="text-[22px] font-bold tracking-[-0.04em]">AERION</p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          DFW Command Center
        </p>
      </div>
      <div className="launch-ready" aria-hidden>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
