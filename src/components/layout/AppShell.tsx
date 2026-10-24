import { Suspense, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { Bell, Command, FlaskConical, Moon, Pause, Play, Search, Sun } from "lucide-react";
import { NAV, ILLUSTRATIVE_NAV } from "./nav";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import { setBandThresholds } from "@/lib/risk";
import { Button } from "../ui/button";
import { Kbd, Skeleton } from "../ui/primitives";
import { Tip, TooltipProvider } from "../ui/radix";
import { CommandPalette } from "./CommandPalette";
import { Sigil } from "../Sigil";

export function BrandMark({ className }: { className?: string }) {
  return <Sigil className={className} />;
}

function Topbar({ onSearch }: { onSearch: () => void }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const settings = useStore(s => s.settings);
  const update = useStore(s => s.updateSettings);
  const openIncidents = useStore(s => s.incidents.filter(i => i.computed && (i.status === "open" || i.status === "investigating")).length);
  const illustrative = ILLUSTRATIVE_NAV.some(g => g.items.some(i => loc.pathname.startsWith(i.to)));

  return <header className="no-print sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur-md">
    <div className="mx-auto flex h-16 max-w-[1536px] items-center gap-3 px-4 md:px-8">
      <Link to="/operations" className="mr-auto flex shrink-0 items-center gap-3" aria-label="DRIFTVEIL security operations">
        <BrandMark className="size-8" />
        <div className="leading-tight"><span className="block text-sm font-semibold tracking-[0.2em]">DRIFTVEIL</span><span className="mt-1 hidden text-xs text-muted sm:block">AI Agent Security</span></div>
      </Link>
      <button onClick={onSearch} aria-label="Search" className="flex h-9 items-center gap-2 rounded-lg border border-border px-2.5 text-sm text-muted transition-colors hover:border-border-strong hover:text-fg sm:min-w-52">
        <Search className="size-4" /><span className="hidden sm:inline">Search workspace</span><span className="ml-auto hidden items-center gap-1 pl-6 md:flex"><Kbd><Command className="inline size-3" /> K</Kbd></span>
      </button>
      <Tip content="Enterprise records and proposals are synthetic. Security decisions and mock effect checks execute.">
        <span className="hidden items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted lg:inline-flex"><FlaskConical className="size-3.5 text-accent" />Synthetic environment</span>
      </Tip>
      {illustrative && <Button variant="ghost" onClick={() => update({ liveStream: !settings.liveStream })} aria-label="Toggle fixture stream" aria-pressed={settings.liveStream}>{settings.liveStream ? <Pause /> : <Play />}<span className="hidden sm:inline">Fixture stream</span></Button>}
      <Tip content={`${openIncidents} open computed findings`}><Button variant="ghost" size="icon" onClick={() => navigate("/incidents?status=open")} aria-label="Open incidents" className="relative"><Bell />{openIncidents > 0 && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-critical" />}</Button></Tip>
      <Tip content={settings.theme === "dark" ? "Light theme" : "Dark theme"}><Button variant="ghost" size="icon" onClick={() => update({ theme: settings.theme === "dark" ? "light" : "dark" })} aria-label="Toggle theme">{settings.theme === "dark" ? <Sun /> : <Moon />}</Button></Tip>
      <Link to="/settings" className="hidden size-9 shrink-0 place-items-center rounded-full border border-border bg-elevated text-xs font-semibold sm:grid" aria-label="Analyst settings">{settings.analystName.split(" ").map(w => w[0]).join("")}</Link>
    </div>
    <nav aria-label="Primary" className="mx-auto flex max-w-[1536px] gap-1 overflow-x-auto px-4 md:gap-3 md:px-8">
      {NAV.flatMap(group => group.items).map(item => <NavLink key={item.to} to={item.to} className={({ isActive }) => cn("relative flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors", isActive ? "border-accent text-fg" : "border-transparent text-muted hover:border-border-strong hover:text-fg")}>
        <item.icon className="size-4" strokeWidth={1.75} /><span>{item.label}</span>{item.to === "/incidents" && openIncidents > 0 && <span className="rounded bg-critical-soft px-1.5 text-xs text-critical">{openIncidents}</span>}
      </NavLink>)}
    </nav>
  </header>;
}

function PageFallback() {
  return <div className="space-y-4"><Skeleton className="h-7 w-56" /><Skeleton className="h-4 w-96 max-w-full" /><div className="grid grid-cols-1 gap-4 md:grid-cols-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-80" /></div>;
}

export function AppShell() {
  const theme = useStore(s => s.settings.theme);
  const live = useStore(s => s.settings.liveStream);
  const thresholds = useStore(s => s.settings.thresholds);
  const push = useStore(s => s.pushLiveEvent);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useMemo(() => setBandThresholds(thresholds), [thresholds]);
  useEffect(() => {
    if (!live || !ILLUSTRATIVE_NAV.some(g => g.items.some(i => loc.pathname.startsWith(i.to)))) return;
    const id = setInterval(push, 4200);
    return () => clearInterval(id);
  }, [live, push, loc.pathname]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setPaletteOpen(open => !open); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);

  return <TooltipProvider><div className="min-h-dvh bg-bg text-fg">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-[100] focus:rounded focus:bg-surface focus:p-3 focus:text-fg">Skip to content</a>
    <Topbar onSearch={() => setPaletteOpen(true)} />
    <main id="main-content" className="mx-auto w-full max-w-[1536px] px-4 py-7 md:px-8">
      {ILLUSTRATIVE_NAV.some(g => g.items.some(i => loc.pathname.startsWith(i.to))) && <div className="mb-5 rounded-lg border border-warning/25 bg-warning-soft px-4 py-3 text-sm leading-relaxed text-muted">Illustrative records: these fleet charts and controls are fixtures. They do not configure or measure security operations. <Link to="/operations" className="text-accent hover:underline">Return to security operations →</Link></div>}
      <Suspense fallback={<PageFallback />}><Outlet /></Suspense>
    </main>
    <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    <Toaster theme={theme} position="bottom-right" toastOptions={{ style: { background: "var(--elevated)", border: "1px solid var(--border)", color: "var(--fg)", fontSize: 14 } }} />
  </div></TooltipProvider>;
}
