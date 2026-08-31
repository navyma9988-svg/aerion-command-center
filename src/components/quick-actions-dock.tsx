import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Zap,
  TriangleAlert,
  Ban,
  Plus,
  Pause,
  Play,
  ClipboardCheck,
  FileText,
  Bell,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useOps } from "@/lib/ops-store";
import { OpsButton } from "@/components/ops-button";

interface QuickAction {
  key: string;
  label: string;
  full?: string;
  icon: LucideIcon;
  active?: boolean;
  run: () => void;
}

/**
 * Contextual mission-action launcher above the bottom nav.
 * Stays compact until requested so operational content is never covered by a pill rail.
 */
export function QuickActionsDock() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { streaming, setStreaming } = useOps();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const close = () => setOpen(false);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const openFromPage = () => setOpen(true);

    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("aerion:quick-actions", openFromPage);
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("aerion:quick-actions", openFromPage);
    };
  }, []);

  const feed: QuickAction = {
    key: "feed",
    label: streaming ? "Pause" : "Resume",
    full: streaming ? "Pause live feed" : "Resume live feed",
    icon: streaming ? Pause : Play,
    active: !streaming,
    run: () => {
      setStreaming(!streaming);
      toast(streaming ? "Live feed paused" : "Live feed resumed");
    },
  };

  const newDisruption: QuickAction = {
    key: "new",
    label: "New",
    full: "New disruption",
    icon: Plus,
    run: () => {
      toast("Disruption intake opened", { description: "Demo only — no record written." });
      navigate({
        to: "/alerts",
        search: { item: "", status: "open", severity: "", terminal: "", runway: "" },
      });
    },
  };

  const byRoute: Record<string, QuickAction[]> = {
    "/map": [
      {
        key: "fod",
        label: "FOD",
        full: "Report FOD",
        icon: TriangleAlert,
        run: () =>
          toast("FOD report filed", {
            description: "Airfield ops notified — sweeper dispatched to the movement area.",
          }),
      },
      {
        key: "close",
        label: "Close RWY",
        full: "Close runway",
        icon: Ban,
        run: () =>
          toast("Runway closure requested", {
            description: "Tower coordination pending — NOTAM draft queued.",
          }),
      },
      newDisruption,
      feed,
    ],
    "/timeline": [feed, newDisruption],
    "/queue": [
      {
        key: "close-action",
        label: "Close action",
        icon: ClipboardCheck,
        run: () => toast("Pick an action in the queue to close it out."),
      },
      newDisruption,
    ],
    "/brief": [
      {
        key: "print",
        label: "Print brief",
        icon: FileText,
        run: () => window.print(),
      },
      feed,
    ],
  };

  const actions: QuickAction[] = byRoute[pathname] ?? [
    newDisruption,
    feed,
    {
      key: "alerts",
      label: "Triage",
      icon: Bell,
      run: () =>
        navigate({
          to: "/alerts",
          search: { item: "", status: "open", severity: "", terminal: "", runway: "" },
        }),
    },
  ];

  return (
    <div
      ref={rootRef}
      className="quick-action-launcher fixed bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] right-4 flex flex-col items-end gap-2 lg:bottom-6 lg:right-6"
    >
      {open ? (
        <div
          role="group"
          aria-label="Quick actions"
          className="quick-action-menu"
          style={{ animation: "spring-in 220ms cubic-bezier(0.22, 1.4, 0.4, 1)" }}
        >
          <div className="mb-1 flex items-center gap-3 pl-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
              Mission actions
            </span>
            <span className="mono-data ml-auto text-[10px] text-amber">{actions.length} READY</span>
            <OpsButton
              onClick={() => setOpen(false)}
              emphasis="ghost"
              size="icon"
              aria-label="Close quick actions"
            >
              <X aria-hidden />
            </OpsButton>
          </div>
          {actions.map(({ key, label, full, icon: Icon, run, active }) => (
            <OpsButton
              key={key}
              onClick={() => {
                run();
                setOpen(false);
              }}
              aria-label={full ?? label}
              intent={active ? "brand" : "neutral"}
              emphasis="outline"
              className="w-full justify-start"
            >
              <Icon aria-hidden />
              {full ?? label}
            </OpsButton>
          ))}
        </div>
      ) : null}

      {pathname !== "/map" && pathname !== "/" ? (
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label={open ? "Close quick actions" : "Show quick actions"}
          aria-expanded={open}
          className="quick-action-trigger press grid size-12 origin-bottom place-items-center rounded-2xl border border-amber/30 bg-card/92 text-amber backdrop-blur-xl"
          style={{ animation: "spring-in 220ms cubic-bezier(0.22, 1.4, 0.4, 1)" }}
        >
          {open ? <X aria-hidden className="size-5" /> : <Zap aria-hidden className="size-5" />}
        </button>
      ) : null}
    </div>
  );
}
