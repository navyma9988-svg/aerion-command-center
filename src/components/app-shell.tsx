import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Radar,
  ClipboardList,
  Map,
  TriangleAlert,
  FileText,
  Search,
  Settings2,
  Activity,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOps } from "@/lib/ops-store";
import { CommandSearch } from "@/components/command-search";
import { NotificationCenter, NotificationToasts } from "@/components/notification-center";
import { QuickActionsDock } from "@/components/quick-actions-dock";
import { Toaster } from "@/components/ui/sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AIRPORT } from "@/lib/airfield-data";
import { SplashMoment } from "@/components/splash-moment";
import { BrandMark } from "@/components/brand-mark";

const NAV = [
  { to: "/", label: "Pulse", icon: Radar },
  { to: "/queue", label: "Queue", icon: ClipboardList },
  { to: "/map", label: "Map", icon: Map },
  { to: "/timeline", label: "Live", icon: Activity },
  { to: "/alerts", label: "Alerts", icon: TriangleAlert },
  { to: "/brief", label: "Brief", icon: FileText },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const pullStart = useRef<number | null>(null);
  const {
    alerts,
    unseenEventIds,
    simulation,
    setSimulation,
    theme,
    setTheme,
    density,
    setDensity,
    clock,
  } = useOps();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const openCount = alerts.filter((a) => a.state === "new").length;
  const p1Open = alerts.some((a) => a.state === "new" && a.severity === "p1");
  const stripState = simulation || p1Open ? "alert" : openCount > 2 ? "busy" : "calm";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const finishPull = () => {
    pullStart.current = null;
    if (pullDistance >= 54) {
      setPullRefreshing(true);
      setPullDistance(42);
      window.setTimeout(() => {
        setPullRefreshing(false);
        setPullDistance(0);
      }, 720);
      return;
    }
    setPullDistance(0);
  };

  return (
    <div
      className={cn(
        "command-app min-h-dvh bg-background",
        density === "compact" && "text-[0.94rem]",
      )}
    >
      <SplashMoment />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[var(--z-toast)] focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <header className="command-header safe-top fixed inset-x-0 top-0 z-[var(--z-header)] border-b border-border bg-background/80 backdrop-blur-xl lg:pl-[4.5rem]">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandMark className="size-9 shrink-0" />
            <div className="min-w-0">
              <p
                aria-label="DFW Airfield Command"
                className="truncate text-[15px] font-semibold leading-tight tracking-tight"
              >
                <span className="sm:hidden">DFW Command</span>
                <span className="hidden sm:inline">DFW Airfield Command</span>
              </p>
              <p className="truncate text-[12px] leading-tight text-muted-foreground">
                {AIRPORT.code ?? "DFW"} · <span className="mono-data">{clock}</span>{" "}
                {AIRPORT.timezone}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <NotificationCenter />
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Open command search"
              aria-keyshortcuts="Meta+K"
              className="press grid size-11 place-items-center rounded-xl hover:bg-secondary"
            >
              <Search aria-hidden className="size-5" />
            </button>
            <Sheet>
              <SheetTrigger
                aria-label="Open tweaks panel"
                className="press grid size-11 place-items-center rounded-xl hover:bg-secondary"
              >
                <Settings2 aria-hidden className="size-5" />
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle>Tweaks</SheetTitle>
                  <SheetDescription>
                    Demo visuals only — settings apply immediately.
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-5 px-4 pb-8">
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="tweak-theme">Daylight theme</Label>
                    <Switch
                      id="tweak-theme"
                      checked={theme === "light"}
                      onCheckedChange={(v) => setTheme(v ? "light" : "dark")}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="tweak-density">Compact density</Label>
                    <Switch
                      id="tweak-density"
                      checked={density === "compact"}
                      onCheckedChange={(v) => setDensity(v ? "compact" : "comfortable")}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label htmlFor="tweak-sim">Disruption simulation</Label>
                      <p className="text-xs text-muted-foreground">
                        Injects a ground stop and re-derives the shift.
                      </p>
                    </div>
                    <Switch id="tweak-sim" checked={simulation} onCheckedChange={setSimulation} />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <div className="closure-hairline" data-state={stripState} aria-hidden>
          <span className="closure-hairline__label">
            {stripState === "alert"
              ? "P1 · degraded"
              : stripState === "busy"
                ? "Elevated ops"
                : "Airfield nominal"}
          </span>
        </div>
        {simulation && (
          <p
            role="status"
            className="bg-coral/12 px-4 py-1 text-center text-[12px] font-medium text-coral"
          >
            Simulation active — demo data
          </p>
        )}
      </header>

      {/* Desktop icon rail */}
      <nav
        aria-label="Sections"
        className="command-rail fixed inset-y-0 left-0 z-[var(--z-header)] hidden w-[4.5rem] flex-col items-center gap-1.5 border-r border-border bg-sidebar py-4 lg:flex"
      >
        <BrandMark className="mb-4 size-9" />
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            title={label}
            aria-label={label}
            className="press group relative grid size-11 place-items-center rounded-xl text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            activeOptions={{ exact: to === "/" }}
            activeProps={{ className: "nav-command-active bg-amber/12 text-amber" }}
          >
            <Icon aria-hidden className="size-5" />
            <span className="pointer-events-none absolute left-[3.5rem] z-[var(--z-popover)] hidden whitespace-nowrap rounded-lg bg-elevated px-2 py-1 text-xs font-medium text-foreground shadow-md group-hover:block">
              {label}
            </span>
            {to === "/alerts" && openCount > 0 && (
              <span className="mono-data absolute right-1 top-1 min-w-4 rounded-full bg-coral px-1 text-[10px] font-semibold leading-4 text-background">
                {openCount}
              </span>
            )}
            {to === "/timeline" && unseenEventIds.length > 0 && (
              <span className="mono-data absolute right-1 top-1 min-w-4 rounded-full bg-cyan px-1 text-[10px] font-semibold leading-4 text-background">
                {unseenEventIds.length}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div
        aria-live="polite"
        className="pull-refresh-cue lg:hidden"
        style={{
          opacity: pullDistance > 4 ? 1 : 0,
          transform: `translate3d(-50%, ${Math.min(50, pullDistance) - 34}px, 0)`,
        }}
      >
        <RefreshCw
          aria-hidden
          className={cn("size-3.5", pullRefreshing && "animate-spin")}
          style={{
            transform: pullRefreshing ? undefined : `rotate(${Math.min(180, pullDistance * 3)}deg)`,
          }}
        />
        {pullRefreshing ? "Feeds synced" : pullDistance >= 54 ? "Release to sync" : "Pull to sync"}
      </div>

      <main
        id="main"
        className="command-main mx-auto max-w-5xl px-4 pb-32 pt-24 lg:pb-12 lg:pl-[5.5rem] lg:pr-6"
        onTouchStart={(e) => {
          if (window.scrollY <= 0) pullStart.current = e.touches[0]?.clientY ?? null;
        }}
        onTouchMove={(e) => {
          if (pullStart.current == null || window.scrollY > 0 || pullRefreshing) return;
          const delta = (e.touches[0]?.clientY ?? pullStart.current) - pullStart.current;
          setPullDistance(Math.max(0, Math.min(76, delta * 0.55)));
        }}
        onTouchEnd={finishPull}
        onTouchCancel={finishPull}
      >
        <div key={pathname} className="command-viewport route-stage">
          {children}
        </div>
      </main>

      {/* Mobile floating pill dock */}
      <nav
        aria-label="Sections"
        className="safe-bottom fixed inset-x-0 bottom-0 z-[var(--z-header)] px-3 pb-3 lg:hidden"
      >
        <ul className="command-dock mx-auto flex max-w-lg items-center justify-between gap-0.5 rounded-[22px] border border-border bg-card/85 p-1.5 shadow-[var(--shadow-card)] backdrop-blur-xl">
          {NAV.map(({ to, label, icon: Icon }) => (
            <li key={to} className="min-w-0 flex-1">
              <Link
                to={to}
                activeOptions={{ exact: to === "/" }}
                activeProps={{
                  "aria-current": "page",
                  className: "dock-active nav-command-active text-amber bg-amber/12",
                }}
                inactiveProps={{ className: "text-muted-foreground" }}
                className="press relative flex min-h-[46px] flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 py-1.5 text-[10px] font-medium"
              >
                <Icon aria-hidden className="size-[18px]" />
                {label}
                {to === "/alerts" && openCount > 0 && (
                  <span className="mono-data absolute right-1.5 top-1 min-w-4 rounded-full bg-coral px-1 text-[9px] font-semibold leading-4 text-background">
                    {openCount}
                  </span>
                )}
                {to === "/timeline" && unseenEventIds.length > 0 && (
                  <span className="mono-data absolute right-1.5 top-1 min-w-4 rounded-full bg-cyan px-1 text-[9px] font-semibold leading-4 text-background">
                    {unseenEventIds.length}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <QuickActionsDock />
      <Toaster position="bottom-center" />
      <NotificationToasts />
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
