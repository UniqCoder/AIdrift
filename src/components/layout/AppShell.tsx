import { Suspense, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { ChevronDown, Moon, Pause, Play, Search, Sun } from "lucide-react";
import { NAV, ILLUSTRATIVE_NAV } from "./nav";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";
import { setBandThresholds } from "@/lib/risk";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/primitives";
import { Dropdown, Tip, TooltipProvider } from "../ui/radix";
import { CommandPalette } from "./CommandPalette";
import { Sigil } from "../Sigil";

export function BrandMark({ className }: { className?: string }) {
  return <Sigil className={className} />;
}

const PRIMARY = ["/runtime", "/operations", "/reports"];
const SHORT: Record<string, string> = { "/runtime": "Runtime", "/operations": "Console", "/reports": "Reports" };

function Topbar({ onSearch }: { onSearch: () => void }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const settings = useStore(s => s.settings);
  const update = useStore(s => s.updateSettings);
  const illustrative = ILLUSTRATIVE_NAV.some(g => g.items.some(i => loc.pathname.startsWith(i.to)));
  const items = NAV.flatMap(group => group.items);
  const more = items.filter(i => !PRIMARY.includes(i.to));
  const moreActive = more.some(i => loc.pathname.startsWith(i.to));

  return <header className="no-print sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-xl">
    <div className="mx-auto flex h-16 max-w-[1536px] items-center gap-2 px-4 md:gap-4 md:px-8">
      <Link to="/runtime" className="mr-2 flex shrink-0 items-center gap-3" aria-label="DRIFTVEIL agent runtime">
        <BrandMark className="size-7" />
        <span className="text-[13px] font-semibold tracking-[0.26em]">DRIFTVEIL</span>
      </Link>
      <nav aria-label="Primary" className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
        {items.filter(i => PRIMARY.includes(i.to)).map(item => <NavLink key={item.to} to={item.to} className={({ isActive }) => cn("shrink-0 rounded-full px-3.5 py-1.5 text-[15px] font-medium transition-colors", isActive ? "bg-elevated text-fg" : "text-muted hover:text-fg")}>{SHORT[item.to]}</NavLink>)}
        <Dropdown align="start" trigger={<button className={cn("flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1.5 text-[15px] font-medium transition-colors", moreActive ? "bg-elevated text-fg" : "text-muted hover:text-fg")}>More<ChevronDown className="size-3.5" /></button>}
          items={more.map(i => ({ label: i.label, icon: <i.icon className="size-4" />, onSelect: () => navigate(i.to) }))} />
      </nav>
      <div className="ml-auto flex items-center gap-1">
        <Tip content="Enterprise records and agent proposals are synthetic. Detection, policy and recovery logic execute for real.">
          <span className="mr-2 hidden items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted lg:inline-flex"><span className="size-1.5 rounded-full bg-healthy" />Synthetic environment</span>
        </Tip>
        {illustrative && <Button variant="ghost" onClick={() => update({ liveStream: !settings.liveStream })} aria-label="Toggle fixture stream" aria-pressed={settings.liveStream}>{settings.liveStream ? <Pause /> : <Play />}</Button>}
        <Tip content="Search (Ctrl K)"><Button variant="ghost" size="icon" onClick={onSearch} aria-label="Search"><Search /></Button></Tip>
        <Tip content={settings.theme === "dark" ? "Light theme" : "Dark theme"}><Button variant="ghost" size="icon" onClick={() => update({ theme: settings.theme === "dark" ? "light" : "dark" })} aria-label="Toggle theme">{settings.theme === "dark" ? <Sun /> : <Moon />}</Button></Tip>
      </div>
    </div>
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
      {ILLUSTRATIVE_NAV.some(g => g.items.some(i => loc.pathname.startsWith(i.to))) && <div className="mb-5 rounded-lg border border-warning/25 bg-warning-soft px-4 py-3 text-sm leading-relaxed text-muted">Illustrative records: these fleet charts and controls are fixtures. They do not configure or measure security operations. <Link to="/runtime" className="text-accent hover:underline">Return to the agent runtime →</Link></div>}
      <Suspense fallback={<PageFallback />}><Outlet /></Suspense>
    </main>
    <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    <Toaster theme={theme} position="bottom-right" toastOptions={{ style: { background: "var(--elevated)", border: "1px solid var(--border)", color: "var(--fg)", fontSize: 14 } }} />
  </div></TooltipProvider>;
}
