import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Radar, ClipboardList, Map, TriangleAlert, FileText, Search, Settings2, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOps } from "@/lib/ops-store";
import { CommandSearch } from "@/components/command-search";
import { NotificationCenter, NotificationToasts } from "@/components/notification-center";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AIRPORT } from "@/lib/airfield-data";

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
  const { alerts, unseenEventIds, simulation, setSimulation, theme, setTheme, density, setDensity, clock } = useOps();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const openCount = alerts.filter((a) => a.state === "new").length;
  const p1Open = alerts.some((a) => a.state === "new" && a.severity === "p1");
  const stripState = simulation || p1Open ? "alert" : openCount > 2 ? "busy" : "calm";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={cn("min-h-dvh bg-background", density === "compact" && "text-[0.94rem]")}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <header className="safe-top fixed inset-x-0 top-0 z-30 border-b border-border bg-background/95 backdrop-blur lg:pl-56">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="relative grid size-9 shrink-0 place-items-center rounded-full border border-amber/40">
              <span
                aria-hidden
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "conic-gradient(from 0deg, color-mix(in oklab, var(--color-amber) 55%, transparent), transparent 45%)",
                  animation: "radar-sweep 4s linear infinite",
                }}
              />
              <Radar aria-hidden className="relative size-4 text-amber" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight">DFW Airfield Command</p>
              <p className="mono-data truncate text-[11px] leading-tight text-muted-foreground">
                {AIRPORT.shiftDate} · {clock} {AIRPORT.timezone}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <NotificationCenter />
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Open command search"
              aria-keyshortcuts="Meta+K"
              className="press grid size-11 place-items-center rounded-lg hover:bg-secondary"
            >
              <Search aria-hidden className="size-5" />
            </button>
            <Sheet>
              <SheetTrigger
                aria-label="Open tweaks panel"
                className="press grid size-11 place-items-center rounded-lg hover:bg-secondary"
              >
                <Settings2 aria-hidden className="size-5" />
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle>Tweaks</SheetTitle>
                  <SheetDescription>Demo visuals only — settings apply immediately.</SheetDescription>
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
        <div className="runway-strip" data-state={stripState} aria-hidden />
        {simulation && (
          <p
            role="status"
            className="mono-data bg-coral/15 px-4 py-1 text-center text-[11px] text-coral"
          >
            Simulation active — demo data
          </p>
        )}
      </header>

      {/* Desktop rail */}
      <nav
        aria-label="Sections"
        className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col gap-1 border-r border-border bg-sidebar p-3 lg:flex"
      >
        <p className="mono-data px-3 pb-4 pt-3 text-xs tracking-widest text-muted-foreground">DFW OPS</p>
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="press flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
            activeOptions={{ exact: to === "/" }}
            activeProps={{ className: "bg-sidebar-accent text-amber" }}
          >
            <Icon aria-hidden className="size-5" />
            {label}
            {to === "/alerts" && openCount > 0 && (
              <span className="mono-data ml-auto rounded-full bg-coral/20 px-2 py-0.5 text-xs text-coral">
                {openCount}
              </span>
            )}
            {to === "/timeline" && unseenEventIds.length > 0 && (
              <span className="mono-data ml-auto rounded-full bg-cyan/20 px-2 py-0.5 text-xs text-cyan">
                {unseenEventIds.length}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <main id="main" className="mx-auto max-w-5xl px-4 pb-28 pt-24 lg:pb-12 lg:pl-60 lg:pr-6">
        {children}
      </main>

      {/* Mobile bottom bar */}
      <nav
        aria-label="Sections"
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur lg:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-6">
          {NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact: to === "/" }}
                activeProps={{ "aria-current": "page", className: "text-amber" }}
                inactiveProps={{ className: "text-muted-foreground" }}
                className="press relative flex min-h-14 flex-col items-center justify-center gap-1 px-0.5 py-2 text-[10px] font-medium"
              >
                <Icon aria-hidden className="size-5" />
                {label}
                {to === "/alerts" && openCount > 0 && (
                  <span className="mono-data absolute right-2 top-1.5 rounded-full bg-coral px-1.5 text-[10px] text-background">
                    {openCount}
                  </span>
                )}
                {to === "/timeline" && unseenEventIds.length > 0 && (
                  <span className="mono-data absolute right-2 top-1.5 rounded-full bg-cyan px-1.5 text-[10px] text-background">
                    {unseenEventIds.length}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <NotificationToasts />
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
