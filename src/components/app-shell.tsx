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
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <header className="safe-top fixed inset-x-0 top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl lg:pl-[4.5rem]">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-amber/12 ring-1 ring-amber/25">
              <span
                aria-hidden
                className="absolute inset-0 rounded-xl opacity-60"
                style={{
                  background:
                    "conic-gradient(from 0deg, color-mix(in oklab, var(--color-amber) 45%, transparent), transparent 45%)",
                  animation: "radar-sweep 4s linear infinite",
                }}
              />
              <Radar aria-hidden className="relative size-4 text-amber" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold leading-tight tracking-tight">
                DFW Airfield Command
              </p>
              <p className="truncate text-[12px] leading-tight text-muted-foreground">
                {AIRPORT.code ?? "DFW"} · <span className="mono-data">{clock}</span> {AIRPORT.timezone}
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
          <p role="status" className="bg-coral/12 px-4 py-1 text-center text-[12px] font-medium text-coral">
            Simulation active — demo data
          </p>
        )}
      </header>

      {/* Desktop icon rail */}
      <nav
        aria-label="Sections"
        className="fixed inset-y-0 left-0 z-40 hidden w-[4.5rem] flex-col items-center gap-1.5 border-r border-border bg-sidebar py-4 lg:flex"
      >
        <span aria-hidden className="mb-4 grid size-9 place-items-center rounded-xl bg-amber/12 text-amber">
          <Radar className="size-4" />
        </span>
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            title={label}
            aria-label={label}
            className="press group relative grid size-11 place-items-center rounded-xl text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            activeOptions={{ exact: to === "/" }}
            activeProps={{ className: "bg-amber/12 text-amber" }}
          >
            <Icon aria-hidden className="size-5" />
            <span className="pointer-events-none absolute left-[3.5rem] z-50 hidden whitespace-nowrap rounded-lg bg-elevated px-2 py-1 text-xs font-medium text-foreground shadow-md group-hover:block">
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

      <main id="main" className="mx-auto max-w-5xl px-4 pb-32 pt-24 lg:pb-12 lg:pl-[5.5rem] lg:pr-6">
        {children}
      </main>

      {/* Mobile floating pill dock */}
      <nav
        aria-label="Sections"
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 px-3 pb-3 lg:hidden"
      >
        <ul className="mx-auto flex max-w-lg items-center justify-between gap-0.5 rounded-[22px] border border-border bg-card/85 p-1.5 shadow-[var(--shadow-card)] backdrop-blur-xl">
          {NAV.map(({ to, label, icon: Icon }) => (
            <li key={to} className="min-w-0 flex-1">
              <Link
                to={to}
                activeOptions={{ exact: to === "/" }}
                activeProps={{ "aria-current": "page", className: "text-amber bg-amber/12" }}
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

      <NotificationToasts />
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
