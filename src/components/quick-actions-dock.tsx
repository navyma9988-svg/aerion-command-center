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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOps } from "@/lib/ops-store";

interface QuickAction {
  key: string;
  label: string;
  full?: string;
  icon: LucideIcon;
  active?: boolean;
  run: () => void;
}

/**
 * Contextual quick-actions pill that floats above the bottom nav.
 * Collapses to a single lightning button while the page is scrolling.
 */
export function QuickActionsDock() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { streaming, setStreaming } = useOps();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedOverride, setExpandedOverride] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setCollapsed(true);
      setExpandedOverride(false);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCollapsed(false), 900);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer.current) clearTimeout(timer.current);
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

  const isCollapsed = collapsed && !expandedOverride;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-[var(--z-header)] flex justify-center px-3 lg:bottom-6 lg:left-auto lg:right-6 lg:justify-end lg:pl-0">
      {isCollapsed ? (
        <button
          type="button"
          onClick={() => setExpandedOverride(true)}
          aria-label="Show quick actions"
          className="press pointer-events-auto grid size-11 origin-bottom place-items-center rounded-full border border-amber/40 bg-card/90 text-amber shadow-[var(--shadow-card)] backdrop-blur-xl transition-transform duration-200"
          style={{ animation: "spring-in 220ms cubic-bezier(0.22, 1.4, 0.4, 1)" }}
        >
          <Zap aria-hidden className="size-5" />
        </button>
      ) : (
        <div
          role="group"
          aria-label="Quick actions"
          className="press-none pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-border bg-card/90 p-1.5 shadow-[var(--shadow-card)] backdrop-blur-xl"
          style={{ animation: "spring-in 240ms cubic-bezier(0.22, 1.4, 0.4, 1)" }}
        >
          {actions.map(({ key, label, full, icon: Icon, run, active }) => (
            <button
              key={key}
              type="button"
              onClick={run}
              aria-label={full ?? label}
              className={cn(
                "press inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium",
                active
                  ? "bg-amber/15 text-amber"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon aria-hidden className="size-4" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
