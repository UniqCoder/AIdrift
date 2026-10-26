// Purpose-built DRIFTVEIL visuals. Every mark is drawn from recorded runtime data; nothing is illustrative.
// Status color is never the only cue: each state also has its own glyph shape and a text label.
import { useMemo, useState, type ReactNode } from "react";
import type { Supplier, Verdict } from "@/lib/simulation";
import type { Approval, LedgerEffect, QueueItem, RuntimeArtifact, Source, Step } from "@/lib/runtime";
import { TOOL_CATALOG } from "@/lib/runtime";

export const inr = (paise: number | null | undefined) => paise === null || paise === undefined ? "—"
  : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
export const pct = (v: number | null | undefined, digits = 1) => v === null || v === undefined ? "—" : `${(v * 100).toFixed(digits)}%`;
export const VERDICT_LABEL: Record<Verdict, string> = { allow: "Allowed", restrict: "Restricted", hold: "Held" };

/** Verdict shape: circle+check = allow, triangle = restrict, square = hold. */
export function VerdictGlyph({ verdict, size = 14 }: { verdict: Verdict | "queued" | "none"; size?: number }) {
  const s = size;
  if (verdict === "allow") return <svg width={s} height={s} viewBox="0 0 16 16" aria-hidden className="dv-g-allow"><circle cx="8" cy="8" r="7" fill="currentColor" /><path d="M4.6 8.3l2.2 2.2 4.6-4.8" stroke="var(--bg)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (verdict === "restrict") return <svg width={s} height={s} viewBox="0 0 16 16" aria-hidden className="dv-g-restrict"><path d="M8 1.5l7 12.5H1z" fill="currentColor" /><path d="M8 6v3.6" stroke="var(--bg)" strokeWidth="1.8" strokeLinecap="round" /><circle cx="8" cy="11.6" r="1" fill="var(--bg)" /></svg>;
  if (verdict === "hold") return <svg width={s} height={s} viewBox="0 0 16 16" aria-hidden className="dv-g-hold"><rect x="1.5" y="1.5" width="13" height="13" rx="2.5" fill="currentColor" /><path d="M5.5 5.5l5 5m0-5l-5 5" stroke="var(--bg)" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (verdict === "queued") return <svg width={s} height={s} viewBox="0 0 16 16" aria-hidden className="dv-g-queued"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2.4 2" /></svg>;
  return <svg width={s} height={s} viewBox="0 0 16 16" aria-hidden className="dv-g-none"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>;
}

// Tooltip anchored inside a relatively positioned figure; shared by every chart here.
function useTip<T>() {
  const [tip, setTip] = useState<{ x: number; y: number; d: T } | null>(null);
  return { tip, show: (x: number, y: number, d: T) => setTip({ x, y, d }), hide: () => setTip(null) };
}
function Tip({ x, y, w, h, children }: { x: number; y: number; w: number; h: number; children: ReactNode }) {
  const left = `${(x / w) * 100}%`; const top = `${(y / h) * 100}%`;
  return <div className="dv-tip" role="status" style={{ left, top, transform: `translate(${x / w > 0.6 ? "calc(-100% - 14px)" : "14px"}, -50%)` }}>{children}</div>;
}

/* ------------------------------------------------------------------ OutcomeGuard: decision field */
export function DriftField({ suppliers, quantity, deadline, minQuality, tolerance, chosen, best, verdict }:
  { suppliers: Supplier[]; quantity: number; deadline: number; minQuality: number; tolerance: number; chosen: string; best: string[]; verdict: Verdict }) {
  const W = 680, H = 340, P = { l: 58, r: 26, t: 26, b: 46 };
  const { tip, show, hide } = useTip<Supplier & { unit: number; feasible: boolean; why: string }>();
  const pts = suppliers.map(s => {
    const why = !s.eligible ? "not an eligible supplier" : s.days > deadline ? `${s.days} days misses the ${deadline}-day deadline` : s.quality < minQuality ? `quality ${s.quality} is below ${minQuality}` : "";
    return { ...s, price: s.price * quantity, unit: s.price, feasible: !why, why };
  });
  const prices = pts.map(p => p.price);
  const opt = pts.find(p => best.includes(p.id));
  const x0 = Math.min(...prices) * 0.86, x1 = Math.max(...prices, (opt?.price ?? 0) * (1 + tolerance)) * 1.08;
  const yMax = Math.max(deadline, ...pts.map(p => p.days)) * 1.2;
  const sx = (v: number) => P.l + ((v - x0) / (x1 - x0)) * (W - P.l - P.r);
  const sy = (v: number) => H - P.b - (v / yMax) * (H - P.t - P.b);
  const choice = pts.find(p => p.id === chosen);
  const tolX = opt ? sx(opt.price * (1 + tolerance)) : null;
  const raw = (x1 - x0) / 4; const pow = 10 ** Math.floor(Math.log10(raw));
  const tickStep = [1, 2, 2.5, 5, 10].map(m => m * pow).find(v => v >= raw)!;
  const xt: number[] = []; for (let v = Math.ceil(x0 / tickStep) * tickStep; v <= x1; v += tickStep) xt.push(v);
  const gap = choice && opt ? choice.price - opt.price : 0;
  // Arrow stops short of both markers so neither the head nor the labels collide.
  const arrow = choice && opt && choice.id !== opt.id ? (() => {
    const ax = sx(opt.price), ay = sy(opt.days), bx = sx(choice.price), by = sy(choice.days);
    const len = Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax) / len, uy = (by - ay) / len;
    return { x1: ax + ux * 16, y1: ay + uy * 16, x2: bx - ux * 14, y2: by - uy * 14 };
  })() : null;
  return <figure className="dv-fig" aria-label={`Decision field: ${suppliers.length} suppliers by order cost and delivery days. Agent chose ${choice?.name ?? chosen}; best feasible ${opt?.name ?? "none"}.`}>
    <div className="dv-scroll"><div className="dv-canvas"><svg viewBox={`0 0 ${W} ${H}`} className="dv-svg" onMouseLeave={hide}>
      <defs>
        <pattern id="dv-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="var(--border-strong)" strokeWidth="1.2" /></pattern>
        <marker id="dv-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor" /></marker>
      </defs>
      {/* zone above the deadline: infeasible */}
      <rect x={P.l} y={P.t} width={W - P.l - P.r} height={sy(deadline) - P.t} fill="url(#dv-hatch)" opacity="0.55" />
      <text x={W - P.r - 6} y={P.t + 16} textAnchor="end" className="dv-zone-label">misses deadline</text>
      {opt && tolX !== null && <>
        <rect x={sx(opt.price)} y={sy(deadline)} width={Math.max(0, tolX - sx(opt.price))} height={H - P.b - sy(deadline)} className="dv-zone-ok" />
        <rect x={tolX} y={sy(deadline)} width={Math.max(0, W - P.r - tolX)} height={H - P.b - sy(deadline)} className="dv-zone-bad" />
        <text x={tolX + 8} y={H - P.b - 10} className="dv-zone-label dv-bad-ink">unjustified premium →</text>
        <text x={sx(opt.price) + 6} y={H - P.b - 10} className="dv-zone-label dv-ok-ink">within {pct(tolerance, 0)}</text>
      </>}
      <line x1={P.l} x2={W - P.r} y1={sy(deadline)} y2={sy(deadline)} className="dv-rule" />
      <text x={P.l + 6} y={sy(deadline) - 7} className="dv-axis-label">deadline · {deadline} days</text>
      {xt.map(v => <g key={v}><line x1={sx(v)} x2={sx(v)} y1={H - P.b} y2={H - P.b + 5} className="dv-tick" /><text x={sx(v)} y={H - P.b + 20} textAnchor="middle" className="dv-tick-label">{inr(v)}</text></g>)}
      <line x1={P.l} x2={W - P.r} y1={H - P.b} y2={H - P.b} className="dv-baseline" />
      <text x={(W + P.l) / 2} y={H - 6} textAnchor="middle" className="dv-axis-label">order cost for {quantity} units →</text>
      <text transform={`translate(16 ${(H - P.b + P.t) / 2}) rotate(-90)`} textAnchor="middle" className="dv-axis-label">delivery days →</text>
      {choice && opt && choice.id !== opt.id && <g className={verdict === "allow" ? "dv-ok-ink" : "dv-bad-ink"}>
        {arrow && <line {...arrow} stroke="currentColor" strokeWidth="2" strokeDasharray="5 4" markerEnd="url(#dv-arrow)" />}
        <text x={(sx(opt.price) + sx(choice.price)) / 2} y={Math.min(sy(opt.days), sy(choice.days)) - 14} textAnchor="middle" className="dv-drift-label">drift +{inr(gap)} · {pct(gap / opt.price, 0)}</text>
      </g>}
      {pts.map(p => {
        const cx = sx(p.price), cy = sy(p.days), isChoice = p.id === chosen, isBest = best.includes(p.id);
        return <g key={p.id} tabIndex={0} role="img" aria-label={`${p.name}: ${inr(p.price)} for the order (${inr(p.unit)} per unit), ${p.days} days, quality ${p.quality}${p.why ? `, infeasible: ${p.why}` : ""}${isBest ? ", best feasible" : ""}${isChoice ? ", agent's choice" : ""}`}
          onMouseEnter={() => show(cx, cy, p)} onFocus={() => show(cx, cy, p)} onBlur={hide} className="dv-pt">
          <circle cx={cx} cy={cy} r={22} fill="transparent" />
          {isBest && <circle cx={cx} cy={cy} r={13} className="dv-best-ring" />}
          {p.feasible ? <circle cx={cx} cy={cy} r={isChoice ? 8 : 6.5} className={isChoice ? "dv-choice" : "dv-pt-feasible"} />
            : <g className="dv-pt-out"><circle cx={cx} cy={cy} r={6.5} /><path d={`M${cx - 3.5} ${cy - 3.5}l7 7m0-7l-7 7`} /></g>}
          <text x={cx} y={cy + (cy > H - P.b - 40 ? -18 : 26)} textAnchor="middle" className="dv-pt-label">{p.name.split(" ")[0]}{isChoice ? " · agent" : isBest ? " · best" : ""}</text>
        </g>;
      })}
    </svg>
    {tip && <Tip x={tip.x} y={tip.y} w={W} h={H}><b>{tip.d.name}</b><span>{inr(tip.d.price)} order · {inr(tip.d.unit)} / unit</span><span>{tip.d.days} days · quality {tip.d.quality}</span><span className={tip.d.feasible ? "dv-ok-ink" : "dv-bad-ink"}>{tip.d.feasible ? "Meets every requirement" : `Infeasible: ${tip.d.why}`}</span></Tip>}</div></div>
    <figcaption className="dv-legend"><span><i className="dv-k dv-k-choice" />agent's choice</span><span><i className="dv-k dv-k-best" />best feasible</span><span><i className="dv-k dv-k-out" />infeasible</span><span><i className="dv-k dv-k-ok" />approved tolerance</span><span><i className="dv-k dv-k-bad" />unjustified premium</span></figcaption>
  </figure>;
}

/* ------------------------------------------------------------------ OutcomeGuard: cumulative drift ribbon */
export interface DriftWindow { window: number; choice: string | null; verdict: string; effect: string; loss: number | null; cumulative: number | null; threshold: number | null }
export function DriftRibbon({ windows, firstRestriction }: { windows: DriftWindow[]; firstRestriction: number | null }) {
  const W = 680, H = 300, P = { l: 52, r: 24, t: 30, b: 44 };
  const { tip, show, hide } = useTip<DriftWindow>();
  const threshold = windows.find(w => w.threshold !== null)?.threshold ?? 0.08;
  const yMax = Math.max(threshold * 1.45, ...windows.map(w => w.cumulative ?? 0)) || 0.1;
  const n = windows.length; const step = (W - P.l - P.r) / Math.max(1, n);
  const sx = (i: number) => P.l + step * (i + 0.5);
  const sy = (v: number) => H - P.b - (v / yMax) * (H - P.t - P.b);
  const lossMax = Math.max(0.1, ...windows.map(w => w.loss ?? 0));
  const line = windows.map((w, i) => `${i ? "L" : "M"}${sx(i)} ${sy(w.cumulative ?? 0)}`).join(" ");
  const area = `${line} L${sx(n - 1)} ${H - P.b} L${sx(0)} ${H - P.b} Z`;
  const cross = firstRestriction ? windows.findIndex(w => w.window === firstRestriction) : -1;
  return <figure className="dv-fig" aria-label={`Cumulative decision drift over ${n} windows. ${firstRestriction ? `Threshold crossed at window ${firstRestriction}.` : "Threshold not crossed."}`}>
    <div className="dv-scroll"><div className="dv-canvas"><svg viewBox={`0 0 ${W} ${H}`} className="dv-svg" onMouseLeave={hide}>
      <defs><linearGradient id="dv-ribbon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--dv-veil)" stopOpacity="0.32" /><stop offset="1" stopColor="var(--dv-veil)" stopOpacity="0" /></linearGradient></defs>
      <rect x={P.l} y={P.t} width={W - P.l - P.r} height={sy(threshold) - P.t} className="dv-zone-bad" />
      <line x1={P.l} x2={W - P.r} y1={sy(threshold)} y2={sy(threshold)} className="dv-rule dv-rule-bad" />
      <text x={W - P.r - 4} y={sy(threshold) - 8} textAnchor="end" className="dv-zone-label dv-bad-ink">restriction threshold · {threshold}</text>
      {[0, yMax].map(v => <g key={v}><line x1={P.l} x2={W - P.r} y1={sy(v)} y2={sy(v)} className="dv-grid" /><text x={P.l - 10} y={sy(v) + 4} textAnchor="end" className="dv-tick-label">{v.toFixed(2)}</text></g>)}
      {/* per-window loss, as short stems hanging from the baseline */}
      {windows.map((w, i) => <line key={`l${i}`} x1={sx(i)} x2={sx(i)} y1={H - P.b} y2={H - P.b - ((w.loss ?? 0) / lossMax) * 26} className="dv-stem" />)}
      <path d={area} fill="url(#dv-ribbon)" />
      <path d={line} className="dv-line" />
      {cross >= 0 && <g><line x1={sx(cross)} x2={sx(cross)} y1={P.t - 6} y2={H - P.b} className="dv-rule dv-rule-bad" strokeDasharray="3 3" />
        <text x={sx(cross)} y={P.t - 12} textAnchor="middle" className="dv-drift-label dv-bad-ink">drift detected · window {firstRestriction}</text></g>}
      {windows.map((w, i) => <g key={w.window} transform={`translate(${sx(i) - 7} ${sy(w.cumulative ?? 0) - 7})`} className="dv-pt" tabIndex={0} role="img"
        aria-label={`Window ${w.window}: loss ${pct(w.loss)}, cumulative ${(w.cumulative ?? 0).toFixed(3)}, ${w.verdict}`}
        onMouseEnter={() => show(sx(i), sy(w.cumulative ?? 0), w)} onFocus={() => show(sx(i), sy(w.cumulative ?? 0), w)} onBlur={hide}>
        <rect x={-8} y={-30} width={30} height={60} fill="transparent" />
        <VerdictGlyph verdict={w.verdict as Verdict} size={14} />
      </g>)}
      {windows.map((w, i) => <text key={`t${i}`} x={sx(i)} y={H - P.b + 20} textAnchor="middle" className="dv-tick-label">{w.window}</text>)}
      <text x={(W + P.l) / 2} y={H - 6} textAnchor="middle" className="dv-axis-label">decision window · stems show each window's own loss</text>
    </svg>
    {tip && <Tip x={sx(windows.indexOf(tip.d))} y={sy(tip.d.cumulative ?? 0)} w={W} h={H}><b>Window {tip.d.window} · {VERDICT_LABEL[tip.d.verdict as Verdict] ?? tip.d.verdict}</b><span>Chose {tip.d.choice ?? "—"} · loss {pct(tip.d.loss)}</span><span>Cumulative {(tip.d.cumulative ?? 0).toFixed(3)} of {threshold}</span><span>Effect: {tip.d.effect}</span></Tip>}</div></div>
    <figcaption className="dv-legend"><span><VerdictGlyph verdict="allow" size={12} />allowed</span><span><VerdictGlyph verdict="restrict" size={12} />restricted</span><span><i className="dv-k dv-k-line" />cumulative loss (CUSUM)</span></figcaption>
  </figure>;
}

/* ------------------------------------------------------------------ DriftGate: approval envelope */
const DIMS = ["agent", "tool", "resource", "destination", "taskFamily"] as const;
const soft = (v: string) => v.replace(/([.\-])/g, "$1​"); // line breaks only after . and -
const DIM_LABEL = { agent: "Agent", tool: "Tool", resource: "Resource", destination: "Destination", taskFamily: "Task family" };
export function ScopeEnvelope({ approval, active, steps, taskFamily }: { approval: Approval | null; active: boolean; steps: Step[]; taskFamily: string }) {
  const rows = steps.map(s => ({
    step: s,
    v: { agent: s.proposal.agent, tool: s.proposal.tool, resource: TOOL_CATALOG[s.proposal.tool]?.resource ?? "unknown", destination: s.proposal.args.destination ?? TOOL_CATALOG[s.proposal.tool]?.destination ?? "—", taskFamily },
  }));
  return <figure className="dv-env" aria-label="Approval envelope compared with each finance proposal">
    <div className="dv-env-grid" style={{ gridTemplateColumns: `minmax(130px, 1.1fr) repeat(${DIMS.length}, minmax(96px, 1fr)) minmax(110px, .9fr)` }}>
      <div className="dv-env-head" />{DIMS.map(d => <div key={d} className="dv-env-head">{DIM_LABEL[d]}</div>)}<div className="dv-env-head">Decision</div>
      <div className="dv-env-rowhead"><b>Approved envelope</b><small>{approval ? `${approval.id} · ${active ? "active" : approval.revoked ? "revoked" : "expired"}` : "no approval"}</small></div>
      {DIMS.map(d => <div key={d} className={`dv-env-cell dv-env-approved ${!approval || !active ? "is-void" : ""}`}>{approval ? soft(approval[d]) : "—"}</div>)}
      <div className="dv-env-cell dv-env-approved">{approval ? `${approval.approvedBy}` : "—"}</div>
      {rows.map(({ step, v }) => <EnvRow key={step.proposal.id} step={step} v={v} approval={active ? approval : null} />)}
    </div>
    <figcaption className="dv-legend"><span><i className="dv-k dv-k-in" />inside the approved scope</span><span><i className="dv-k dv-k-outside" />outside it</span><span>An approval changes only the exact tool, resource, destination and task family it names.</span></figcaption>
  </figure>;
}
function EnvRow({ step, v, approval }: { step: Step; v: Record<typeof DIMS[number], string>; approval: Approval | null }) {
  const d = step.decision;
  return <>
    <div className="dv-env-rowhead"><b>{step.proposal.tool}</b><small>proposed by {step.proposal.agent}</small></div>
    {DIMS.map(k => { const inside = !!approval && approval[k] === v[k]; return <div key={k} className={`dv-env-cell ${inside ? "is-in" : "is-out"}`}><span aria-hidden>{inside ? "✓" : "✕"}</span>{soft(v[k])}</div>; })}
    <div className="dv-env-cell dv-env-verdict"><VerdictGlyph verdict={d.verdict} />{VERDICT_LABEL[d.verdict]}<small>{step.effect?.status === "committed" ? "effect committed" : "no effect"}</small></div>
  </>;
}

/* ------------------------------------------------------------------ ChainRestore: lineage map */
type NodeState = "clean" | "contaminated" | "invalidated" | "rebuilt" | "untrusted";
interface LNode { id: string; label: string; sub: string; col: number; row: number; state: NodeState; parents: string[]; kind: string; effect?: string }
const COLS = ["Sources", "Procurement summary", "Finance memory", "Pending payment", "Effect"];
export function LineageMap({ artifacts, sources, queue, ledger, runs }: { artifacts: RuntimeArtifact[]; sources: Source[]; queue: QueueItem[]; ledger: LedgerEffect[]; runs: Set<string> }) {
  const [focus, setFocus] = useState<string | null>(null);
  const nodes = useMemo(() => {
    const out: LNode[] = [];
    const summaries = artifacts.filter(a => a.kind === "summary" && runs.has(a.runId ?? "") && artifacts.some(m => m.kind === "memory" && m.parents.includes(a.id)));
    const st = (a: RuntimeArtifact): NodeState => a.state === "contaminated" ? "contaminated" : a.state === "invalidated" ? "invalidated" : a.version > 1 ? "rebuilt" : a.trust === "untrusted" ? "untrusted" : "clean";
    summaries.forEach((s, row) => {
      const memory = artifacts.find(m => m.kind === "memory" && m.parents.includes(s.id));
      const payment = memory && artifacts.find(p => p.kind === "payment" && p.parents.includes(memory.id));
      const run = s.runId ?? s.id.split(":")[0];
      out.push({ id: s.id, label: s.version > 1 ? "Rebuilt summary" : "Summary", sub: `${run}${s.version > 1 ? " · v2" : ""}`, col: 1, row, state: st(s), parents: s.parents, kind: "summary" });
      if (memory) out.push({ id: memory.id, label: memory.complete ? "Memory" : "Memory · no provenance", sub: run, col: 2, row, state: memory.complete ? st(memory) : "invalidated", parents: memory.parents, kind: "memory" });
      if (payment) {
        out.push({ id: payment.id, label: "Payment", sub: payment.label.replace(/^.*to /, "to "), col: 3, row, state: st(payment), parents: payment.parents, kind: "payment" });
        const q = queue.find(i => i.proposal.inputs.includes(payment.id));
        const e = ledger.find(l => l.inputs.includes(payment.id) && l.tool.startsWith("payment."));
        const effect = e?.status === "committed" ? "committed" : q?.status ?? (e ? e.status : "not run");
        out.push({ id: `${payment.id}#effect`, label: effect === "committed" ? "Paid" : effect === "held" ? "Held" : effect === "queued" ? "Queued" : "—", sub: effect, col: 4, row, state: effect === "committed" ? (payment.version > 1 ? "rebuilt" : "clean") : effect === "held" ? "contaminated" : "clean", parents: [payment.id], kind: "effect", effect });
      }
    });
    const used = new Set(out.flatMap(n => n.parents));
    const srcs = artifacts.filter(a => a.kind === "source" && used.has(a.id));
    srcs.forEach(a => {
      const kids = out.filter(n => n.parents.includes(a.id)).map(n => n.row);
      const doc = sources.find(s => s.id === a.id);
      out.push({ id: a.id, label: doc ? doc.name : "Trusted records", sub: doc ? (doc.recalled ? "recalled" : "untrusted PDF") : `authoritative · v${a.version}`, col: 0, row: kids.reduce((x, y) => x + y, 0) / Math.max(1, kids.length), state: st(a), parents: [], kind: "source" });
    });
    // De-overlap sources in their column.
    const col0 = out.filter(n => n.col === 0).sort((a, b) => a.row - b.row);
    col0.forEach((n, i) => { if (i && n.row - col0[i - 1].row < 0.9) n.row = col0[i - 1].row + 0.9; });
    return out;
  }, [artifacts, sources, queue, ledger, runs]);
  const rows = Math.max(1, ...nodes.map(n => n.row + 1));
  const W = 980, RH = 76, H = rows * RH + 56, NW = 150, NH = 46;
  const x = (c: number) => 18 + c * ((W - NW - 36) / 4);
  const y = (r: number) => 46 + r * RH;
  const byId = new Map(nodes.map(n => [n.id, n]));
  const related = useMemo(() => {
    if (!focus) return null;
    const set = new Set([focus]);
    const up = (id: string) => byId.get(id)?.parents.forEach(p => { if (!set.has(p)) { set.add(p); up(p); } });
    const down = (id: string) => nodes.filter(n => n.parents.includes(id)).forEach(n => { if (!set.has(n.id)) { set.add(n.id); down(n.id); } });
    up(focus); down(focus); return set;
  }, [focus, nodes]); // eslint-disable-line react-hooks/exhaustive-deps
  const focused = focus ? byId.get(focus) : null;
  if (!nodes.length) return <p className="dv-empty">The lineage map appears after a connected procurement → finance workflow runs.</p>;
  return <figure className="dv-fig dv-lineage" aria-label="Artifact lineage from sources to payment effects">
    <div className="dv-scroll"><svg viewBox={`0 0 ${W} ${H}`} className="dv-svg" style={{ minWidth: 760 }}>
      {COLS.map((c, i) => <text key={c} x={x(i) + NW / 2} y={20} textAnchor="middle" className="dv-col-label">{c}</text>)}
      {nodes.flatMap(n => n.parents.filter(p => byId.has(p)).map(p => {
        const a = byId.get(p)!; const hot = a.state === "contaminated" || a.state === "invalidated";
        const x1 = x(a.col) + NW, y1 = y(a.row) + NH / 2, x2 = x(n.col), y2 = y(n.row) + NH / 2, mx = (x1 + x2) / 2;
        const dim = related && !(related.has(p) && related.has(n.id));
        return <path key={`${p}>${n.id}`} d={`M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`} className={`dv-edge ${hot ? "is-hot" : n.state === "rebuilt" ? "is-rebuilt" : ""} ${dim ? "is-dim" : ""}`} />;
      }))}
      {nodes.map(n => <g key={n.id} transform={`translate(${x(n.col)} ${y(n.row)})`} className={`dv-node is-${n.state} ${related && !related.has(n.id) ? "is-dim" : ""} ${focus === n.id ? "is-focus" : ""}`}
        tabIndex={0} role="button" aria-pressed={focus === n.id} aria-label={`${n.label}, ${n.sub}, ${n.state}`}
        onMouseEnter={() => setFocus(n.id)} onMouseLeave={() => setFocus(null)} onFocus={() => setFocus(n.id)} onBlur={() => setFocus(null)}>
        <rect width={NW} height={NH} rx={10} />
        <g transform="translate(12 15)"><StateGlyph state={n.state} /></g>
        <text x={34} y={20} className="dv-node-title">{n.label.length > 17 ? `${n.label.slice(0, 16)}…` : n.label}</text>
        <text x={34} y={35} className="dv-node-sub">{n.sub.length > 20 ? `${n.sub.slice(0, 19)}…` : n.sub}</text>
      </g>)}
    </svg></div>
    <p className="dv-inspect" aria-live="polite">{focused ? <><b>{focused.label}</b> · {focused.sub} · <span className={`dv-state-${focused.state}`}>{STATE_TEXT[focused.state]}</span>. Highlighting everything it depends on and everything that depends on it.</> : "Hover or focus a node to trace what it depends on and what it feeds."}</p>
    <figcaption className="dv-legend">{(Object.keys(STATE_TEXT) as NodeState[]).map(s => <span key={s}><StateGlyph state={s} />{STATE_TEXT[s]}</span>)}</figcaption>
  </figure>;
}
const STATE_TEXT: Record<NodeState, string> = { clean: "clean", untrusted: "untrusted input", contaminated: "recalled / held", invalidated: "invalidated", rebuilt: "rebuilt & verified" };
function StateGlyph({ state }: { state: NodeState }) {
  if (state === "contaminated") return <svg width="14" height="14" viewBox="0 0 16 16" className="dv-state-contaminated" aria-hidden><rect x="1.5" y="1.5" width="13" height="13" rx="2.5" fill="currentColor" /><path d="M8 4.5v4.5" stroke="var(--bg)" strokeWidth="1.8" strokeLinecap="round" /><circle cx="8" cy="11.5" r="1" fill="var(--bg)" /></svg>;
  if (state === "invalidated") return <svg width="14" height="14" viewBox="0 0 16 16" className="dv-state-invalidated" aria-hidden><rect x="2" y="2" width="12" height="12" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="3 2" /><path d="M5 11l6-6" stroke="currentColor" strokeWidth="1.6" /></svg>;
  if (state === "rebuilt") return <svg width="14" height="14" viewBox="0 0 16 16" className="dv-state-rebuilt" aria-hidden><circle cx="8" cy="8" r="7" fill="currentColor" /><path d="M4.6 8.3l2.2 2.2 4.6-4.8" stroke="var(--bg)" strokeWidth="1.8" fill="none" strokeLinecap="round" /></svg>;
  if (state === "untrusted") return <svg width="14" height="14" viewBox="0 0 16 16" className="dv-state-untrusted" aria-hidden><path d="M8 1.5l6.5 3v4c0 3.4-2.8 5.6-6.5 6.5C4.3 14.1 1.5 11.9 1.5 8.5v-4z" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>;
  return <svg width="14" height="14" viewBox="0 0 16 16" className="dv-state-clean" aria-hidden><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>;
}

/* ------------------------------------------------------------------ Overview: decision stream */
export interface StreamItem { seq: number; tool: string; agent: string; verdict: Verdict; effect: string; reason: string; run: string; queued?: boolean }
export function DecisionStream({ items, onOpen }: { items: StreamItem[]; onOpen?: (item: StreamItem) => void }) {
  const [hover, setHover] = useState<StreamItem | null>(null);
  if (!items.length) return <p className="dv-empty">No decisions yet. Run any scenario and each tool call the gateway evaluates appears here, in order.</p>;
  const runs = [...new Set(items.map(i => i.run))];
  return <figure className="dv-stream" aria-label={`${items.length} gateway decisions in order`}>
    <div className="dv-stream-track">{runs.map(run => <div key={run} className="dv-stream-run"><span className="dv-stream-run-label">{run}</span><div>{items.filter(i => i.run === run).map(i =>
      <button key={i.seq} className={`dv-stream-mark is-${i.verdict}`} aria-label={`${i.agent} ${i.tool}: ${VERDICT_LABEL[i.verdict]}, ${i.queued ? "queued" : i.effect}`}
        onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => onOpen?.(i)}>
        <VerdictGlyph verdict={i.verdict} size={16} /></button>)}</div></div>)}</div>
    <figcaption className="dv-stream-detail" aria-live="polite">{hover ? <><VerdictGlyph verdict={hover.verdict} /><b>{hover.tool}</b><span>{hover.agent}</span><span>{VERDICT_LABEL[hover.verdict]} · {hover.queued ? "queued" : hover.effect}</span><em>{hover.reason}</em></>
      : <span className="dv-muted">Each mark is one tool call. Hover to read the decision; click to open its workspace.</span>}</figcaption>
  </figure>;
}

/* ------------------------------------------------------------------ Evidence: case matrix */
export function CaseMatrix({ results }: { results: { mode: string; name: string; rows: { case: string; category: string; expected: string; correct: boolean; committedTargets: number; targets: number }[] }[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const cases = results[0]?.rows ?? [];
  return <figure className="dv-matrix" aria-label="Per-case outcome for each configuration">
    <div className="dv-matrix-grid" style={{ gridTemplateColumns: `minmax(200px, 2fr) repeat(${results.length}, minmax(70px, 1fr))` }}>
      <div className="dv-matrix-head">Case</div>{results.map(r => <div key={r.mode} className="dv-matrix-head">{r.mode === "permission" ? "A · permissions" : r.mode === "rules" ? "B · rules" : "C · DRIFTVEIL"}</div>)}
      {cases.map((c, i) => <div key={c.case} className={`dv-matrix-row ${hover === c.case ? "is-hover" : ""}`} onMouseEnter={() => setHover(c.case)} onMouseLeave={() => setHover(null)} style={{ display: "contents" }}>
        <div className="dv-matrix-case"><span className={`dv-tag is-${c.expected}`}>{c.expected === "attack" ? "attack" : "benign"}</span>{c.case}</div>
        {results.map(r => { const row = r.rows[i]; return <div key={r.mode} className={`dv-matrix-cell ${row.correct ? "is-ok" : "is-miss"}`} title={`${r.name}: ${row.correct ? "correct" : "wrong"} (${row.committedTargets}/${row.targets} target effects committed)`}>{row.correct ? <VerdictGlyph verdict="allow" size={13} /> : <VerdictGlyph verdict="hold" size={13} />}<span>{row.correct ? "correct" : "missed"}</span></div>; })}
      </div>)}
    </div>
  </figure>;
}
