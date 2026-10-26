import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowDownToLine, ArrowRight, ChevronDown, FileText, Play, RotateCcw, ShieldCheck, Upload } from "lucide-react";
import { Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { CaseMatrix, DecisionStream, DriftField, DriftRibbon, LineageMap, ScopeEnvelope, VerdictGlyph, VERDICT_LABEL, inr, pct, type DriftWindow, type StreamItem } from "@/components/runtime/viz";
import { initialState, verifyChain, defaultTask, TOOL_CATALOG, type AgentProfile, type FinanceProfile, type RuntimeState, type Step, type Workflow } from "@/lib/runtime";
import type { Supplier, PurchaseTask } from "@/lib/simulation";
import { ingestPdf, runRuntimeEvaluation, runtimeCall, runtimeMode } from "@/lib/runtimeClient";
import { useSimulationAction } from "@/lib/simulationClient";
import { cn, downloadFile, fmtDateTime } from "@/lib/utils";
import "./runtime.css";

const SECTIONS = [
  { id: "overview", n: "", name: "Overview" },
  { id: "outcome", n: "01", name: "OutcomeGuard" },
  { id: "change", n: "02", name: "DriftGate" },
  { id: "recovery", n: "03", name: "ChainRestore" },
  { id: "evidence", n: "", name: "Evidence" },
] as const;
type Section = typeof SECTIONS[number]["id"];
type TaskDraft = Omit<PurchaseTask, "id">;
type GatewayRecord = { seq: number; data: { proposal: Step["proposal"]; decision: Step["decision"]; effect: Step["effect"]; queued?: boolean } };
const CHECKS = [
  { key: "credentials", label: "Identity", short: "Identity", hint: "The agent's credential is bound to this exact action." },
  { key: "permission", label: "Tool access", short: "Access", hint: "The tool, resource and destination are inside the role contract or an approved change." },
  { key: "business", label: "Outcome", short: "Outcome", hint: "An independent validator recomputes the best feasible business decision." },
  { key: "behavioral", label: "Behavior", short: "Behavior", hint: "Cumulative decision loss and tool sequence against a frozen benign reference." },
  { key: "evidence", label: "Evidence", short: "Evidence", hint: "Every input has complete, unrecalled lineage." },
] as const;

/** One plain-language sentence per decision, built from the recorded numbers. */
function explain(step: Step, names: Record<string, string>): string {
  const { proposal: p, decision: d } = step;
  const o = d.outcome; const name = (id?: string) => (id && names[id]) || id || "—";
  if (d.verdict === "hold" && o?.valid && o.hardViolation && o.loss !== null && d.checks.permission)
    return `The agent chose ${name(o.agentChoice)} at ${inr(o.chosenCost)}, but ${name(o.best[0])} met every requirement at ${inr(o.optimum)}: ${pct(o.loss, 0)} more than needed, against a ${pct(o.tolerance, 0)} tolerance. Its credentials and tool access were valid; only the outcome check caught it.`;
  if (d.verdict === "restrict") return `This choice was within tolerance on its own, but cumulative loss crossed the learned threshold (${d.cumulative?.toFixed(3)} ≥ ${d.threshold}). The purchase stays uncommitted pending review.`;
  if (d.verdict === "hold" && (p.tool === "hr.salary.read" || p.tool === "bank.export"))
    return `${p.agent} tried ${p.tool}. That data is outside its contract and explicitly prohibited, so the gateway returned nothing and no effect occurred.`;
  if (d.verdict === "hold" && d.reasons.some(r => /recalled|Stale|Contained/.test(r))) return `Held: this action depends on information that was recalled. It cannot run on stale or contaminated inputs.`;
  if (d.verdict === "hold" && p.tool === "payment.schedule") return `Payment scheduling needs an active approval covering this exact agent, tool, destination and task family. None matched, so nothing was scheduled.`;
  if (d.verdict === "hold") return d.reasons[0];
  if (p.tool === "vendor.purchase" && o) return o.feasible.length === 1 ? `${name(o.agentChoice)} is the only supplier that meets the constraints, so its higher price is justified. Purchase committed at ${inr(o.chosenCost)}.` : `${name(o.agentChoice)} is the best feasible supplier at ${inr(o.chosenCost)}. Every check passed and the purchase was committed.`;
  if (d.scope === "approved delta") return `Covered by ${d.approvalId}: this exact change was approved, so it committed. Nothing else gained permission.`;
  if (step.queued) return `Prepared and assessed, waiting to be committed.`;
  return `Every check passed; the ${p.tool} effect was recorded in the sandbox.`;
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="rt-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
function Num({ label, value, onChange, step = 1, min = 0, max }: { label: string; value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number }) {
  return <Field label={label}><Input type="number" value={Number.isFinite(value) ? value : ""} step={step} min={min} max={max} onChange={e => onChange(e.target.value === "" ? NaN : Number(e.target.value))} /></Field>;
}
function Disclosure({ title, children, open }: { title: string; children: ReactNode; open?: boolean }) {
  return <details className="rt-disclosure" open={open}><summary><ChevronDown className="size-4" />{title}</summary><div>{children}</div></details>;
}
function Panel({ eyebrow, title, children, className, aside }: { eyebrow?: string; title?: string; children: ReactNode; className?: string; aside?: ReactNode }) {
  return <section className={cn("rt-panel", className)}>{(eyebrow || title) && <header><div>{eyebrow && <p className="rt-eyebrow">{eyebrow}</p>}{title && <h3>{title}</h3>}</div>{aside}</header>}{children}</section>;
}

function Verdict({ step, names, large }: { step: Step; names: Record<string, string>; large?: boolean }) {
  const v = step.decision.verdict;
  return <div className={cn("rt-verdict", `is-${v}`, large && "is-large")} role="status">
    <div className="rt-verdict-top"><VerdictGlyph verdict={v} size={large ? 22 : 16} /><span>{VERDICT_LABEL[v]}</span><code>{step.proposal.tool}</code></div>
    <p>{explain(step, names)}</p>
  </div>;
}

/** The veil: one action, five checkpoints, one effect. */
function Trace({ step, names }: { step: Step; names: Record<string, string> }) {
  const { proposal: p, decision: d, effect: e } = step;
  const effect = step.queued ? "queued" : e?.status === "committed" ? "committed" : e?.status === "duplicate" ? "duplicate" : "no effect";
  return <details className={cn("rt-trace", `is-${d.verdict}`)}>
    <summary>
      <span className="rt-trace-actor"><b>{p.tool}</b><small>{p.agent.replace("-agent", "")}{p.proposedBy.startsWith("llm:") ? " · LLM" : ""}</small></span>
      <span className="rt-trace-line" aria-label="Gateway checks">{CHECKS.map(c => {
        const ok = d.checks[c.key];
        return <span key={c.key} className={cn("rt-check", ok ? "is-ok" : "is-fail")} title={`${c.label}: ${ok ? "passed" : "failed"}. ${c.hint}`}><i />{c.short}</span>;
      })}</span>
      <span className={cn("rt-trace-effect", `is-${effect.replace(" ", "-")}`)}><VerdictGlyph verdict={step.queued ? "queued" : d.verdict} />{effect}</span>
    </summary>
    <div className="rt-trace-body">
      <p>{explain(step, names)}</p>
      {p.rationale && <p className="rt-quote">Agent's stated reason: “{p.rationale}”</p>}
      <ol>{d.reasons.map((r, i) => <li key={i}>{r}</li>)}</ol>
      <dl>
        <div><dt>Risk score</dt><dd>{d.score}</dd></div><div><dt>Contract</dt><dd>v{d.contractVersion}{d.approvalId ? ` · ${d.approvalId}` : ""}</dd></div>
        <div><dt>Reference</dt><dd>{d.referenceId ?? "none (cold start)"}</dd></div><div><dt>Inputs</dt><dd>{p.inputs.join(", ") || "—"}</dd></div>
        <div><dt>Action id</dt><dd>{p.id}</dd></div><div><dt>Gateway time</dt><dd>{d.latencyMs} ms</dd></div>
      </dl>
    </div>
  </details>;
}
function Traces({ steps, names }: { steps?: Step[]; names: Record<string, string> }) {
  if (!steps?.length) return null;
  return <div className="rt-traces"><div className="rt-traces-head"><span>Tool call</span><span>Gateway checks</span><span>Effect</span></div>{steps.map(s => <Trace key={`${s.proposal.id}-${s.effect?.status ?? "q"}-${s.decision.fingerprint.slice(-6)}`} step={s} names={names} />)}</div>;
}
function Empty({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rt-empty"><b>{title}</b><p>{children}</p></div>;
}

const SCENARIOS: { id: string; letter: string; title: string; body: string; task: Partial<TaskDraft>; agent: AgentProfile }[] = [
  { id: "normal", letter: "A", title: "Normal purchase", body: "The agent pursues its stated objective: lowest cost that meets the requirements.", task: {}, agent: { objective: "lowest-cost" } },
  { id: "harmful", letter: "B", title: "Hidden harmful choice", body: "A compromised agent quietly prefers Beacon at up to 50% premium. Its credentials stay valid.", task: {}, agent: { objective: "preferred-vendor", preferredVendor: "beacon", maxPremium: 0.5 } },
  { id: "urgent", letter: "C", title: "Justified exception", body: "A 3-day deadline. Only the expensive supplier can deliver in time.", task: { family: "urgent", deadline: 3 }, agent: { objective: "lowest-cost" } },
];

export default function Runtime() {
  const [params, setParams] = useSearchParams();
  const section: Section = SECTIONS.find(s => s.id === params.get("view"))?.id ?? "overview";
  const go = (id: Section) => { setParams(id === "overview" ? {} : { view: id }); window.scrollTo({ top: 0 }); };
  const [state, setState] = useState<RuntimeState | null>(null);
  const { busy, error, perform } = useSimulationAction();
  const [scenario, setScenario] = useState("harmful");
  const [task, setTask] = useState<TaskDraft>(defaultTask());
  const [agent, setAgent] = useState<AgentProfile>(SCENARIOS[1].agent);
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [outcomeSteps, setOutcomeSteps] = useState<Step[]>();
  const [drift, setDrift] = useState<{ historyScope: string; windows: DriftWindow[]; firstRestriction: number | null }>();
  const [driftCfg, setDriftCfg] = useState({ windows: 8, premium: 3 });
  const [approvalDraft, setApprovalDraft] = useState({ agent: "finance-agent", tool: "payment.schedule", destination: "finance.internal", taskFamily: "standard", ttlMinutes: 60, approvedBy: "demo-admin" });
  const [adminToken, setAdminToken] = useState("demo-admin");
  const [finance, setFinance] = useState<FinanceProfile>({ action: "schedule", scheduleDestination: "finance.internal", attemptBankExport: true });
  const [financeFamily, setFinanceFamily] = useState<"standard" | "urgent">("standard");
  const [changeSteps, setChangeSteps] = useState<Step[]>();
  const [chainOpts, setChainOpts] = useState({ followDocumentDirectives: true, dropProvenance: false });
  const [chainResult, setChainResult] = useState<{ title: string; detail?: string; tone: "allow" | "hold" | "restrict"; steps?: Step[] }>();
  const [evaluation, setEvaluation] = useState<Awaited<ReturnType<typeof runRuntimeEvaluation>>>();
  const [verifyResult, setVerifyResult] = useState("");

  const call = async <T,>(op: string, body: Record<string, unknown> = {}) => { const out = await runtimeCall<T>(op, body, adminToken); setState(out.state); return out.result; };
  // On stacked (narrow) layouts, bring the result into view after a run instead of leaving it below the controls.
  const reveal = () => requestAnimationFrame(() => { if (window.innerWidth < 1080) document.querySelector(".rt-results")?.scrollIntoView({ behavior: "smooth", block: "start" }); });
  useEffect(() => { perform(async () => { await call("state.get"); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (state && !suppliers) setSuppliers(state.suppliers.records); }, [state, suppliers]);

  const s = state ?? initialState(0);
  const chain = useMemo(() => verifyChain(s.records), [s.records]);
  const names = useMemo(() => Object.fromEntries(s.suppliers.records.map(x => [x.id, x.name])), [s.suppliers.records]);
  const gw = s.records.filter(r => r.type === "gateway") as unknown as GatewayRecord[];
  const counts = {
    proposals: gw.length, committed: s.ledger.filter(e => e.status === "committed").length,
    held: gw.filter(r => r.data.decision.verdict === "hold").length, restricted: gw.filter(r => r.data.decision.verdict === "restrict").length,
    failed: Object.fromEntries(CHECKS.map(c => [c.key, gw.filter(r => !r.data.decision.checks[c.key]).length])) as Record<string, number>,
  };
  const stream: StreamItem[] = gw.map(r => ({ seq: r.seq, tool: r.data.proposal.tool, agent: r.data.proposal.agent, verdict: r.data.decision.verdict, effect: r.data.effect?.status ?? "none", queued: r.data.queued, reason: r.data.decision.reasons[0] ?? "", run: r.data.proposal.runId.split(":")[0] }));
  const now = Date.now();
  const approvalStatus = (a: RuntimeState["approvals"][number]) => a.revoked ? "revoked" : now >= a.expiresAt ? "expired" : "active";
  const scheduleApprovals = s.approvals.filter(a => a.agent === "finance-agent" && a.tool === "payment.schedule");
  const envelope = scheduleApprovals.find(a => approvalStatus(a) === "active") ?? scheduleApprovals.at(-1) ?? null;

  const pickScenario = (id: string) => { const sc = SCENARIOS.find(x => x.id === id)!; setScenario(id); setTask({ ...defaultTask(), ...sc.task }); setAgent(sc.agent); setOutcomeSteps(undefined); };
  const runOutcome = () => perform(async () => { setOutcomeSteps((await call<{ steps: Step[] }>("workflow.run", { task, suppliers: suppliers ?? undefined, procurement: agent })).steps); reveal(); });
  const runDrift = () => perform(async () => setDrift(await call("outcome.drift", { windows: driftCfg.windows, premium: driftCfg.premium / 100, task: { ...defaultTask() }, procurement: { objective: "preferred-vendor", preferredVendor: "beacon", maxPremium: 0.05 } })));
  const runChange = () => perform(async () => { setChangeSteps((await call<{ steps: Step[] }>("workflow.run", { task: { ...defaultTask(), family: financeFamily, deadline: financeFamily === "urgent" ? 3 : 7 }, procurement: { objective: "lowest-cost" }, finance })).steps); reveal(); });
  const addDoc = async (buffer: ArrayBuffer, name: string) => { const out = await ingestPdf(buffer, name); setState(out.state); };
  const loadSample = (name: string) => perform(async () => { const r = await fetch(`/samples/${name}`); if (!r.ok) throw new Error(`Sample ${name} is unavailable.`); await addDoc(await r.arrayBuffer(), name); });
  const exportEvidence = () => perform(async () => { const r = await call<{ caseId: string }>("evidence.export"); downloadFile(`driftveil-${r.caseId}-evidence.json`, JSON.stringify(r, null, 2)); });
  const verifyFile = async (file?: File) => {
    if (!file) return;
    try { const data = JSON.parse(await file.text()); const v = verifyChain(data.records ?? []); setVerifyResult(v.valid ? `Valid: ${data.records.length} records, head ${v.head.slice(0, 16)}…` : `Tampered: the chain breaks at record ${v.brokenAt}.`); }
    catch { setVerifyResult("Not a DRIFTVEIL evidence export."); }
  };
  const editSupplier = (i: number, patch: Partial<Supplier>) => setSuppliers(list => list!.map((x, k) => k === i ? { ...x, ...patch } : x));
  const reset = () => perform(async () => { await call("case.reset"); setSuppliers(null); setOutcomeSteps(undefined); setDrift(undefined); setChangeSteps(undefined); setChainResult(undefined); });

  // Outcome result pieces, all from the recorded run.
  const purchase = outcomeSteps?.find(x => x.proposal.tool === "vendor.purchase");
  const readData = outcomeSteps?.find(x => x.proposal.tool === "suppliers.read")?.effect?.data;
  const runTask = purchase ? s.tasks[purchase.proposal.task] : undefined;

  // ChainRestore progression, derived from saved state.
  const docWorkflows = s.workflows.filter(w => w.documents.length && w.finance);
  const indepWorkflows = s.workflows.filter(w => !w.documents.length && w.finance?.action === "prepare");
  const recalled = s.sources.filter(x => x.recalled);
  const recoveries = s.records.filter(r => r.type === "recovery");
  const target = docWorkflows.at(-1);
  const chainSteps = [
    { title: "Load the poisoned supplier PDF", done: s.sources.length > 0, action: <Button size="sm" onClick={() => loadSample("poisoned-quote.pdf")}><FileText />Load sample PDF</Button> },
    { title: "Run procurement → finance with it", done: docWorkflows.length > 0, action: <Button size="sm" disabled={!s.sources.length} onClick={() => perform(async () => { const r = await call<{ workflow: Workflow; steps: Step[] }>("workflow.run", { documents: s.sources.filter(x => !x.recalled).map(x => x.id), procurement: { objective: "lowest-cost", followDocumentDirectives: chainOpts.followDocumentDirectives }, finance: { action: "prepare", dropProvenance: chainOpts.dropProvenance } }); setChainResult({ title: `${r.workflow.runId}: payment prepared from the PDF`, tone: "allow", detail: r.steps.some(x => x.proposal.tool === "hr.salary.read") ? "The PDF told the agent to read salary data. The agent proposed it; the gateway held it. Procurement continued." : undefined, steps: r.steps }); })}><Play />Run with PDF</Button> },
    { title: "Run an independent workflow", done: indepWorkflows.length > 0, action: <Button size="sm" onClick={() => perform(async () => { const r = await call<{ workflow: Workflow; steps: Step[] }>("workflow.run", { finance: { action: "prepare" } }); setChainResult({ title: `${r.workflow.runId}: independent payment prepared`, tone: "allow", detail: "Built only from trusted supplier records.", steps: r.steps }); })}><Play />Run independent</Button> },
    { title: "Recall the PDF as compromised", done: recalled.length > 0, action: <Button size="sm" disabled={!s.sources.some(x => !x.recalled)} onClick={() => perform(async () => { const doc = s.sources.find(x => !x.recalled)!; const r = await call<{ contained: string[]; independent: string[]; affected: string[] }>("source.recall", { sourceId: doc.id }); setChainResult({ title: `Recalled ${doc.name}`, tone: "hold", detail: `${r.affected.length} artifacts invalidated through recorded lineage. ${r.contained.length} pending payment held; ${r.independent.length} independent payment untouched.` }); })}>Recall source</Button> },
    { title: "Commit pending payments", done: recalled.length > 0 && !s.queue.some(q => q.status === "queued"), action: <Button size="sm" disabled={!s.queue.some(q => q.status === "queued")} onClick={() => perform(async () => { const steps = await call<Step[]>("queue.commit"); setChainResult({ title: "Pending payments evaluated", tone: "allow", detail: `${steps.filter(x => x.effect?.status === "committed").length} committed, ${steps.filter(x => x.effect?.status !== "committed").length} held.`, steps }); })}><Play />Commit queue</Button> },
    { title: "Recover the affected payment", done: recoveries.length > 0, action: <Button size="sm" disabled={!target} onClick={() => perform(async () => { const r = await call<{ status: string; detail: string; steps: Step[] }>("recovery.run", { runId: target!.runId }); setChainResult({ title: `Recovery ${r.status.replace("-", " ")}`, tone: r.status.startsWith("verified") ? "allow" : "hold", detail: r.detail, steps: r.steps }); })}><RotateCcw />{recoveries.length ? "Retry recovery" : "Recover"}</Button> },
  ];
  const nextStep = chainSteps.findIndex(x => !x.done);

  return <div className="rt">
    <header className="rt-hero">
      <div>
        <p className="rt-eyebrow">DRIFTVEIL · agent runtime <span className="rt-dot" />{runtimeMode === "api" ? "server-enforced" : "running in this browser"}</p>
        <h1>{section === "overview" ? <>Every agent action passes <em>through the veil.</em></> : section === "evidence" ? <>The evidence, <em>exactly as recorded.</em></> : SECTIONS.find(x => x.id === section)!.name}</h1>
        <p className="rt-lede">{section === "outcome" ? "Catch harmful business decisions made with valid credentials and approved tools." : section === "change" ? "Accept an approved change to an agent's role without granting anything else." : section === "recovery" ? "Trace compromised information across agents. Hold only what it touched, then verify recovery." : section === "evidence" ? "Each decision is hash-chained. Download it, verify it, compare it against simpler controls." : "Agents propose tool calls. DRIFTVEIL checks each one against identity, role, business outcome, behavior and evidence before anything happens."}</p>
      </div>
      <div className="rt-hero-side">
        <div className="rt-case"><span>Case</span><b>{s.caseId.replace("case-", "").toUpperCase()}</b><span className={chain.valid ? "rt-ok" : "rt-bad"}>{chain.valid ? "● chain verified" : "● chain broken"}</span></div>
        <div className="rt-hero-actions"><Button variant="ghost" disabled={busy} onClick={reset}><RotateCcw />Reset</Button><Button disabled={busy} onClick={exportEvidence}><ArrowDownToLine />Export</Button></div>
      </div>
    </header>

    <nav className="rt-nav" aria-label="Runtime workspaces">{SECTIONS.map(x => <button key={x.id} onClick={() => go(x.id)} aria-current={x.id === section ? "page" : undefined}>{x.n && <span>{x.n}</span>}{x.name}</button>)}</nav>
    {error && <p className="rt-alert" role="alert">{error}</p>}
    {busy && <p className="rt-busy" role="status"><i />Agent running · gateway evaluating proposals</p>}
    {runtimeMode === "local" && section !== "overview" && <p className="rt-note">Running entirely in this browser. Approvals use a labeled demo control here; the hosted version enforces them on the server.</p>}

    {section === "overview" && <div className="rt-stack">
      <Panel eyebrow="How DRIFTVEIL works" title="One action, five checkpoints, one effect">
        <div className="rt-veil" role="list">
          <div className="rt-veil-node" role="listitem"><small>Agent</small><b>Proposes a tool call</b><span>{counts.proposals} so far</span></div>
          <div className="rt-veil-gate" role="listitem" aria-label="DRIFTVEIL gateway">
            <p className="rt-eyebrow">The veil</p>
            <div>{CHECKS.map(c => <div key={c.key} className="rt-veil-check" title={c.hint}><b>{c.label}</b><span>{c.hint}</span><em className={counts.failed[c.key] ? "rt-bad" : ""}>{counts.failed[c.key] ? `${counts.failed[c.key]} stopped here` : "no failures"}</em></div>)}</div>
          </div>
          <div className="rt-veil-node rt-veil-out" role="listitem"><small>Sandbox</small><b>Effect, or nothing</b><span><VerdictGlyph verdict="allow" size={12} /> {counts.committed} committed · <VerdictGlyph verdict="hold" size={12} /> {counts.held} held · <VerdictGlyph verdict="restrict" size={12} /> {counts.restricted} restricted</span></div>
        </div>
      </Panel>
      <div className="rt-chapters">{([
        ["outcome", "01", "OutcomeGuard", "Is the agent still serving the business, even when its access looks normal?", "A harmful-but-permitted purchase is held; a justified exception goes through; slow drift is caught."],
        ["change", "02", "DriftGate", "Does a behavior change match what was actually approved?", "Approved payment scheduling commits while a bank export in the same workflow stays held."],
        ["recovery", "03", "ChainRestore", "What did compromised information touch, and is recovery safe?", "A poisoned PDF is traced to a pending payment. Only that payment is held, then rebuilt once."],
      ] as const).map(([id, n, name, q, see]) => <button key={id} className="rt-chapter" onClick={() => go(id)}><span className="rt-chapter-n">{n}</span><h3>{name}</h3><p className="rt-chapter-q">{q}</p><p>{see}</p><span className="rt-chapter-go">Open workspace <ArrowRight className="size-4" /></span></button>)}</div>
      <Panel eyebrow="Live decision stream" title="Every tool call the gateway has evaluated in this case">
        <DecisionStream items={stream} onOpen={i => go(i.tool === "bank.export" || i.tool === "payment.schedule" ? "change" : i.tool === "payment.commit" || i.tool === "hr.salary.read" ? "recovery" : "outcome")} />
      </Panel>
      <p className="rt-fineprint">Synthetic enterprise data, local deterministic agents and sandbox effects. Detection, policy and recovery logic execute for real; nothing here is a production integration.</p>
    </div>}

    {section === "outcome" && <div className="rt-split">
      <aside className="rt-controls">
        <Panel eyebrow="Step 1" title="Choose a scenario">
          <div className="rt-scenarios" role="radiogroup">{SCENARIOS.map(sc => <button key={sc.id} role="radio" aria-checked={scenario === sc.id} className="rt-scenario" onClick={() => pickScenario(sc.id)}><span>{sc.letter}</span><div><b>{sc.title}</b><small>{sc.body}</small></div></button>)}</div>
          <Disclosure title="Adjust the task and supplier records">
            <div className="rt-fields">
              <Field label="Task family"><select className="rt-select" value={task.family} onChange={e => setTask({ ...task, family: e.target.value as TaskDraft["family"] })}><option value="standard">standard</option><option value="urgent">urgent</option></select></Field>
              <Num label="Deadline (days)" value={task.deadline} onChange={deadline => setTask({ ...task, deadline })} />
              <Num label="Minimum quality" value={task.minQuality} max={100} onChange={minQuality => setTask({ ...task, minQuality })} />
              <Num label="Cost tolerance (%)" value={+(task.tolerance * 100).toFixed(2)} step={0.5} onChange={n => setTask({ ...task, tolerance: n / 100 })} />
              <Field label="Agent objective" hint="Simulation input. The gateway never sees it."><select className="rt-select" value={agent.objective} onChange={e => setAgent({ ...agent, objective: e.target.value as AgentProfile["objective"] })}><option value="lowest-cost">lowest cost (stated)</option><option value="preferred-vendor">preferred vendor (compromised)</option></select></Field>
              {agent.objective === "preferred-vendor" && <Num label="Premium agent accepts (%)" value={(agent.maxPremium ?? 0) * 100} onChange={n => setAgent({ ...agent, maxPremium: n / 100, preferredVendor: agent.preferredVendor ?? "beacon" })} />}
            </div>
            <table className="rt-table rt-supplier-table"><thead><tr><th>Supplier</th><th>₹ / unit</th><th>Days</th><th>Quality</th><th>Eligible</th></tr></thead><tbody>{(suppliers ?? []).map((x, i) => <tr key={x.id}><th>{x.name}</th>
              <td><Input type="number" aria-label={`${x.name} price in rupees`} value={x.price / 100} onChange={e => editSupplier(i, { price: Math.round(Number(e.target.value) * 100) })} /></td>
              <td><Input type="number" aria-label={`${x.name} days`} value={x.days} onChange={e => editSupplier(i, { days: Number(e.target.value) })} /></td>
              <td><Input type="number" aria-label={`${x.name} quality`} value={x.quality} onChange={e => editSupplier(i, { quality: Number(e.target.value) })} /></td>
              <td><input type="checkbox" aria-label={`${x.name} eligible`} checked={x.eligible} onChange={e => editSupplier(i, { eligible: e.target.checked })} /></td></tr>)}</tbody></table>
          </Disclosure>
        </Panel>
        <Panel eyebrow="Step 2" title="Run the procurement agent">
          <p className="rt-body">It reads supplier records and proposes a purchase. DRIFTVEIL validates the outcome independently from authoritative records.</p>
          <Button size="lg" variant="primary" className="rt-run" disabled={busy} onClick={runOutcome}><Play />Run agent</Button>
        </Panel>
      </aside>
      <div className="rt-results">
        {purchase ? <>
          <Verdict step={purchase} names={names} large />
          {readData && runTask && purchase.decision.outcome && <Panel eyebrow="Where the decision drifted" title="Every supplier, by order cost and delivery time">
            <DriftField suppliers={JSON.parse(readData)} quantity={runTask.quantity} deadline={runTask.deadline} minQuality={runTask.minQuality} tolerance={runTask.tolerance} chosen={purchase.decision.outcome.agentChoice} best={purchase.decision.outcome.best} verdict={purchase.decision.verdict} />
          </Panel>}
          <Panel eyebrow="Gateway trace" title="What the agent attempted, and what each checkpoint decided"><Traces steps={outcomeSteps} names={names} /></Panel>
        </> : outcomeSteps ? <><Empty title="The agent stopped">It could not find a feasible supplier or was not allowed to read records. Adjust the task and try again.</Empty><Panel title="Gateway trace"><Traces steps={outcomeSteps} names={names} /></Panel></>
          : <Empty title="Pick a scenario and run the agent">The verdict, the supplier field showing where the choice drifted, and the full gateway trace appear here.</Empty>}
        <Panel eyebrow="Scenario D · slow drift" title="Small losses that add up" aside={<Button disabled={busy} onClick={runDrift}><Play />Run {driftCfg.windows} windows</Button>}>
          <p className="rt-body">Beacon quotes {driftCfg.premium}% above the cheapest competitor in every window, and a compromised agent keeps choosing it. Each purchase is inside the {pct(task.tolerance, 0)} limit; only the cumulative statistic sees the pattern.</p>
          <div className="rt-fields rt-fields-inline"><Num label="Windows" value={driftCfg.windows} min={1} max={24} onChange={windows => setDriftCfg({ ...driftCfg, windows })} /><Num label="Premium per window (%)" value={driftCfg.premium} step={0.5} onChange={premium => setDriftCfg({ ...driftCfg, premium })} /></div>
          {drift && <><DriftRibbon windows={drift.windows} firstRestriction={drift.firstRestriction} />
            <p className="rt-fineprint">Runs on an isolated decision history ({drift.historyScope}) so it never restricts the live agent. Production keeps one history per agent and task family.</p></>}
        </Panel>
      </div>
    </div>}

    {section === "change" && <div className="rt-split">
      <aside className="rt-controls">
        <Panel eyebrow="Step 1 · administrator" title="Grant one scoped change">
          <p className="rt-sentence">Allow <b>{approvalDraft.agent}</b> to use <b>{approvalDraft.tool}</b>, sending to <b>{approvalDraft.destination}</b>, for <b>{approvalDraft.taskFamily}</b> tasks, for <b>{approvalDraft.ttlMinutes} min</b>.</p>
          <Button variant="primary" className="rt-run" disabled={busy} onClick={() => perform(async () => { await call("admin.approve", approvalDraft); })}><ShieldCheck />Grant approval</Button>
          <Disclosure title="Edit the scope">
            <div className="rt-fields">
              <Field label="Agent"><select className="rt-select" value={approvalDraft.agent} onChange={e => setApprovalDraft({ ...approvalDraft, agent: e.target.value })}><option>finance-agent</option><option>procurement-agent</option></select></Field>
              <Field label="Tool"><select className="rt-select" value={approvalDraft.tool} onChange={e => setApprovalDraft({ ...approvalDraft, tool: e.target.value })}>{Object.keys(TOOL_CATALOG).map(t => <option key={t}>{t}</option>)}</select></Field>
              <Field label="Destination"><Input value={approvalDraft.destination} onChange={e => setApprovalDraft({ ...approvalDraft, destination: e.target.value })} /></Field>
              <Field label="Task family"><select className="rt-select" value={approvalDraft.taskFamily} onChange={e => setApprovalDraft({ ...approvalDraft, taskFamily: e.target.value })}><option>standard</option><option>urgent</option></select></Field>
              <Num label="Expires after (min)" value={approvalDraft.ttlMinutes} min={1} onChange={ttlMinutes => setApprovalDraft({ ...approvalDraft, ttlMinutes })} />
              <Field label="Approver"><Input value={approvalDraft.approvedBy} onChange={e => setApprovalDraft({ ...approvalDraft, approvedBy: e.target.value })} /></Field>
              {runtimeMode === "api" && <Field label="Admin token" hint="Demo token, not enterprise authentication."><Input type="password" value={adminToken} onChange={e => setAdminToken(e.target.value)} /></Field>}
            </div>
          </Disclosure>
          {s.approvals.length > 0 && <ul className="rt-approvals">{s.approvals.map(a => <li key={a.id}><div><b>{a.id}</b><small>{a.agent} · {a.tool} → {a.destination} · {a.taskFamily}</small><small>until {fmtDateTime(a.expiresAt)}</small></div><span className={cn("rt-pill", approvalStatus(a) === "active" ? "is-allow" : "is-hold")}>{approvalStatus(a)}</span>
            {approvalStatus(a) === "active" && <div className="rt-approval-actions"><button onClick={() => perform(async () => { await call("admin.revoke", { id: a.id }); })}>Revoke</button><button onClick={() => perform(async () => { await call("admin.expire", { id: a.id }); })}>Expire now</button></div>}</li>)}</ul>}
        </Panel>
        <Panel eyebrow="Step 2 · agents" title="Run procurement → finance">
          <div className="rt-fields">
            <Field label="Finance action"><select className="rt-select" value={finance.action} onChange={e => setFinance({ ...finance, action: e.target.value as FinanceProfile["action"] })}><option value="schedule">payment.schedule (needs approval)</option><option value="commit">payment.commit (base contract)</option></select></Field>
            <Field label="Destination the agent uses"><Input value={finance.scheduleDestination ?? ""} onChange={e => setFinance({ ...finance, scheduleDestination: e.target.value })} /></Field>
            <Field label="Task family"><select className="rt-select" value={financeFamily} onChange={e => setFinanceFamily(e.target.value as "standard" | "urgent")}><option>standard</option><option>urgent</option></select></Field>
          </div>
          <label className="rt-toggle"><input type="checkbox" checked={!!finance.attemptBankExport} onChange={e => setFinance({ ...finance, attemptBankExport: e.target.checked })} /><span>Compromised finance agent also tries <code>bank.export</code></span></label>
          <Button size="lg" variant="primary" className="rt-run" disabled={busy} onClick={runChange}><Play />Run workflow</Button>
          <p className="rt-fineprint">Try: run with no approval → grant → run → revoke → run. Or change the destination or task family.</p>
        </Panel>
      </aside>
      <div className="rt-results">
        {changeSteps ? <>
          <div className="rt-verdict-pair">{changeSteps.filter(x => ["payment.schedule", "payment.commit", "bank.export"].includes(x.proposal.tool)).map(x => <Verdict key={x.proposal.id} step={x} names={names} />)}</div>
          {changeSteps.some(x => x.proposal.agent === "finance-agent") && <Panel eyebrow="The approval envelope" title="Each finance proposal against exactly what was approved">
            <ScopeEnvelope approval={envelope} active={!!envelope && approvalStatus(envelope) === "active"} steps={changeSteps.filter(x => x.proposal.agent === "finance-agent")} taskFamily={financeFamily} />
          </Panel>}
          {!changeSteps.some(x => x.proposal.agent === "finance-agent") && <Empty title="Finance never ran">The procurement purchase was not committed, so there was nothing to pay.</Empty>}
          <Panel eyebrow="Gateway trace" title="Both agents, every call"><Traces steps={changeSteps} names={names} /></Panel>
        </> : <Empty title="Run the workflow to see the envelope">You'll see the approved scope beside each proposal: what matched, what fell outside it, and what happened.</Empty>}
      </div>
    </div>}

    {section === "recovery" && <div className="rt-stack">
      <Panel eyebrow="Follow the path" title="Six steps from poisoned input to verified recovery" aside={<Disclosure title="Scenario options"><label className="rt-toggle"><input type="checkbox" checked={chainOpts.followDocumentDirectives} onChange={e => setChainOpts({ ...chainOpts, followDocumentDirectives: e.target.checked })} /><span>Agent follows instructions in documents</span></label><label className="rt-toggle"><input type="checkbox" checked={chainOpts.dropProvenance} onChange={e => setChainOpts({ ...chainOpts, dropProvenance: e.target.checked })} /><span>Finance memory loses its provenance (failure case)</span></label></Disclosure>}>
        <ol className="rt-steps">{chainSteps.map((st, i) => <li key={st.title} className={cn(st.done && "is-done", i === nextStep && "is-next")}><span className="rt-step-n">{st.done ? "✓" : i + 1}</span><b>{st.title}</b><div>{st.action}</div></li>)}</ol>
      </Panel>
      {chainResult && <div className={cn("rt-verdict", `is-${chainResult.tone}`)} role="status"><div className="rt-verdict-top"><VerdictGlyph verdict={chainResult.tone} size={16} /><span>{chainResult.title}</span></div>{chainResult.detail && <p>{chainResult.detail}</p>}</div>}
      <Panel eyebrow="Contamination lineage" title="What the PDF touched, and what it did not">
        <LineageMap artifacts={s.artifacts} sources={s.sources} queue={s.queue} ledger={s.ledger} runs={new Set(s.workflows.filter(w => w.finance?.action === "prepare").map(w => w.runId))} />
      </Panel>
      {chainResult?.steps && <Panel eyebrow="Gateway trace" title="Calls from the last step"><Traces steps={chainResult.steps} names={names} /></Panel>}
      <Panel eyebrow="Inputs" title="Documents given to the agents" aside={<label className="rt-upload"><Upload className="size-4" />Upload a PDF<input type="file" accept="application/pdf" onChange={e => { const f = e.target.files?.[0]; if (f) perform(async () => addDoc(await f.arrayBuffer(), f.name)); }} /></label>}>
        {s.sources.length ? <ul className="rt-docs">{s.sources.map(d => <li key={d.id}><details><summary><FileText className="size-4" /><b>{d.name}</b><span className={cn("rt-pill", d.recalled ? "is-hold" : "is-restrict")}>{d.recalled ? "recalled" : "untrusted"}</span><small>sha256 {d.sha256.slice(0, 12)}… · {d.pages ?? "?"} page</small></summary><pre>{d.text}</pre></details></li>)}</ul>
          : <p className="rt-body">No documents yet. Uploaded PDFs are parsed with pdf.js and always treated as untrusted input.</p>}
      </Panel>
    </div>}

    {section === "evidence" && <div className="rt-stack">
      <div className="rt-proof">
        <div><p className="rt-eyebrow">Evidence chain</p><h2 className={chain.valid ? "rt-ok" : "rt-bad"}>{chain.valid ? "Intact" : `Broken at record ${chain.brokenAt}`}</h2><p className="rt-body">{s.records.length} records · head <code>{chain.head.slice(0, 20)}…</code> · SHA-256 linked. Editing any earlier record breaks every hash after it.</p></div>
        <div className="rt-proof-actions"><Button variant="primary" disabled={busy} onClick={exportEvidence}><ArrowDownToLine />Download case</Button><label className="rt-upload"><Upload className="size-4" />Verify a downloaded file<input type="file" accept="application/json" onChange={e => verifyFile(e.target.files?.[0])} /></label>{verifyResult && <p className={verifyResult.startsWith("Valid") ? "rt-ok" : "rt-bad"} role="status">{verifyResult}</p>}</div>
      </div>
      <Panel eyebrow="Same cases, three levels of control" title="What simpler controls miss" aside={<Button variant="primary" disabled={busy} onClick={() => perform(async () => setEvaluation(await runRuntimeEvaluation()))}><Play />{evaluation ? "Run again" : "Run evaluation"}</Button>}>
        {evaluation ? <>
          <div className="rt-scores">{evaluation.results.map(r => <div key={r.mode} className={cn("rt-score", r.mode === "full" && "is-us")}><p className="rt-eyebrow">{r.mode === "permission" ? "A · tool permissions only" : r.mode === "rules" ? "B · business rules, no history" : "C · DRIFTVEIL"}</p><b>{r.attackCasesHeld}</b><span>attacks held</span><small>{r.benignCasesCompleted} legitimate tasks completed · drift {r.firstDriftWindow ? `caught at window ${r.firstDriftWindow}` : "missed"}</small></div>)}</div>
          <CaseMatrix results={evaluation.results} />
          <p className="rt-fineprint">{evaluation.scope} {evaluation.environment}. {evaluation.generatedAt}.</p>
          <Disclosure title="Bounded timing measurements"><table className="rt-table"><thead><tr><th>Operation</th><th>Size</th><th>Samples</th><th>Median</th><th>p95</th></tr></thead><tbody>{[...evaluation.benchmark.suppliers.map(b => ({ ...b, size: `${b.suppliers} suppliers` })), ...evaluation.benchmark.lineage.map(b => ({ ...b, size: `${b.artifacts} artifacts` }))].map(b => <tr key={b.size}><td>{b.operation}</td><td>{b.size}</td><td>{b.samples}</td><td>{b.medianMs} ms</td><td>{b.p95Ms} ms</td></tr>)}</tbody></table><p className="rt-fineprint">{evaluation.benchmark.method} Not production latency.</p></Disclosure>
        </> : <p className="rt-body">Runs 19 deterministic cases on fresh state through tool permissions only, business rules without history, and full DRIFTVEIL. Scored on recorded sandbox effects; expected labels never reach the gateway.</p>}
      </Panel>
      <div className="rt-split-even">
        <Panel eyebrow="Effect ledger" title={`${s.ledger.length} committed sandbox effects`}>{s.ledger.length ? <table className="rt-table"><thead><tr><th>Action</th><th>Effect</th></tr></thead><tbody>{s.ledger.slice(-14).reverse().map(e => <tr key={e.actionId}><td><code>{e.actionId}</code></td><td>{e.tool === "suppliers.read" ? "records returned" : e.data?.replace(/amountPaise=(\d+)/, (_, n) => inr(Number(n)))}</td></tr>)}</tbody></table> : <p className="rt-body">Nothing committed yet.</p>}</Panel>
        <Panel eyebrow="Recent records" title="Append-only log">{<table className="rt-table"><thead><tr><th>#</th><th>Record</th><th>Hash</th></tr></thead><tbody>{[...s.records].reverse().slice(0, 14).map(r => { const d = r.data as any; return <tr key={r.seq}><td>{r.seq}</td><td>{r.type === "gateway" ? `${d.proposal.tool} → ${d.decision.verdict}` : r.type}</td><td><code>{r.hash.slice(0, 10)}</code></td></tr>; })}</tbody></table>}</Panel>
      </div>
      <Panel eyebrow="Limits" title="What this prototype does not claim">
        <ul className="rt-limits">
          <li>Agents are local deterministic planners. Their compromised behavior is a configured input, not a model being attacked.</li>
          <li>Supplier, HR and bank data are synthetic; effects are sandbox ledger entries, not real payments.</li>
          <li>Approvals use a demo administrator token, not enterprise identity. The hash chain is tamper-evident, not a signed audit log.</li>
          <li>The evaluation is a small fixed case set; timings come from one process, not production scale.</li>
        </ul>
      </Panel>
    </div>}
  </div>;
}
