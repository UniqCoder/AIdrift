import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Activity, ArrowDownToLine, Bot, FileText, Fingerprint, GitBranch, Layers, Play, RotateCcw, ShieldCheck, SlidersHorizontal, Upload } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { initialState, verifyChain, defaultTask, LOCAL_AGENT, TOOL_CATALOG, type AgentProfile, type FinanceProfile, type RuntimeState, type Step, type Workflow, type RecordEntry } from "@/lib/runtime";
import type { Supplier, PurchaseTask } from "@/lib/simulation";
import { ingestPdf, runRuntimeEvaluation, runtimeCall, runtimeLocation, runtimeMode } from "@/lib/runtimeClient";
import { useSimulationAction } from "@/lib/simulationClient";
import { cn, downloadFile, fmtDateTime } from "@/lib/utils";
import "./operations.css";

const SECTIONS = [
  { id: "overview", name: "Overview", icon: Activity },
  { id: "outcome", name: "OutcomeGuard", icon: Fingerprint },
  { id: "change", name: "DriftGate", icon: SlidersHorizontal },
  { id: "recovery", name: "ChainRestore", icon: GitBranch },
  { id: "evidence", name: "Evidence", icon: Layers },
] as const;
type Section = typeof SECTIONS[number]["id"];
type TaskDraft = Omit<PurchaseTask, "id">;
const money = (paise: number | null | undefined) => paise === null || paise === undefined ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(paise / 100);
const pct = (v: number | null | undefined) => v === null || v === undefined ? "—" : `${(v * 100).toFixed(1)}%`;
const tone = (s?: string) => s === "committed" || s === "allow" || s === "verified" || s === "queued" ? "healthy" : s === "restrict" || s === "duplicate" || s === "verified-duplicate" || s === "not-required" ? "warning" : "critical";

function Card({ title, label, children, className }: { title?: string; label?: string; children: ReactNode; className?: string }) {
  return <section className={cn("op-card", className)}>{(title || label) && <header className="op-card-heading"><div>{label && <p className="op-eyebrow">{label}</p>}{title && <h2>{title}</h2>}</div></header>}{children}</section>;
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="op-field"><span>{label}</span>{children}</label>;
}
function Num({ label, value, onChange, step = 1, min = 0, max }: { label: string; value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number }) {
  return <Field label={label}><Input type="number" value={Number.isFinite(value) ? value : ""} step={step} min={min} max={max} onChange={e => onChange(e.target.value === "" ? NaN : Number(e.target.value))} /></Field>;
}
function Explain({ testing, limits }: { testing: string; limits: string }) {
  return <div className="rt-explain"><p><b>What you are testing.</b> {testing}</p><p><b>Limits.</b> {limits}</p></div>;
}
function Check({ ok, label }: { ok: boolean; label: string }) {
  return <li className={ok ? "rt-ok" : "rt-bad"}><span>{ok ? "✓" : "✕"}</span>{label}</li>;
}

// One gateway decision, rendered only from the recorded proposal, decision and effect.
function StepView({ step }: { step: Step }) {
  const { proposal: p, decision: d, effect: e } = step;
  const o = d.outcome;
  return <article className={cn("rt-step", `rt-${d.verdict}`)}>
    <header><div><span className="rt-tool">{p.tool}</span><small>{p.agent} · {p.proposedBy}</small></div>
      <div className="rt-badges"><Badge tone={tone(d.verdict)}>{d.verdict.toUpperCase()}</Badge><Badge tone={step.queued ? "info" : tone(e?.status)}>{step.queued ? "queued, not committed" : e?.status === "committed" ? "effect committed" : e?.status === "duplicate" ? "duplicate: no new effect" : "no effect"}</Badge></div></header>
    {p.rationale && <p className="rt-rationale">Agent rationale: “{p.rationale}”</p>}
    <ul className="rt-checks">
      <Check ok={d.checks.credentials} label="Credentials valid" />
      <Check ok={d.checks.permission} label={`Tool access (${d.scope})`} />
      <Check ok={d.checks.business} label="Business objective" />
      <Check ok={d.checks.behavioral} label="Behavioral reference" />
      <Check ok={d.checks.evidence} label="Evidence & lineage" />
    </ul>
    {o && <dl className="rt-outcome">
      <div><dt>Agent choice</dt><dd>{o.agentChoice || "—"} · {money(o.chosenCost)}</dd></div>
      <div><dt>Best feasible choice</dt><dd>{o.best.join(", ") || "none"} · {money(o.optimum)}</dd></div>
      <div><dt>Unjustified cost difference</dt><dd>{money(o.gap)} ({pct(o.loss)})</dd></div>
      <div><dt>Approved tolerance</dt><dd>{pct(o.tolerance)}</dd></div>
      {d.cumulative !== null && d.threshold !== null && <div><dt>Cumulative decision loss</dt><dd>{d.cumulative.toFixed(3)} / threshold {d.threshold}</dd></div>}
    </dl>}
    <ol className="rt-reasons">{d.reasons.map((r, i) => <li key={i}>{r}</li>)}</ol>
    <footer><span>risk {d.score} · contract v{d.contractVersion}{d.approvalId ? ` · ${d.approvalId}` : ""} · ref {d.referenceId ?? "unavailable"} · {d.latencyMs} ms</span><span>inputs: {p.inputs.join(", ") || "none"}</span></footer>
    {e?.data && <details><summary>Sandbox data returned</summary><pre>{e.data.slice(0, 600)}</pre></details>}
  </article>;
}
function Steps({ steps, empty }: { steps?: Step[]; empty: string }) {
  return steps?.length ? <div className="rt-steps" aria-live="polite">{steps.map(s => <StepView key={`${s.proposal.id}-${s.decision.fingerprint.slice(0, 6)}-${s.effect?.status}`} step={s} />)}</div> : <p className="op-body">{empty}</p>;
}

const PRESETS: Record<string, { label: string; task: Partial<TaskDraft>; agent: AgentProfile; note: string }> = {
  normal: { label: "A · Normal purchase", task: {}, agent: { objective: "lowest-cost" }, note: "Agent pursues the stated objective." },
  harmful: { label: "B · Hidden harmful choice", task: {}, agent: { objective: "preferred-vendor", preferredVendor: "beacon", maxPremium: 0.5 }, note: "Simulated compromised agent: prefers Beacon at up to 50% premium. The gateway is not told this." },
  urgent: { label: "C · Urgent exception", task: { family: "urgent", deadline: 3 }, agent: { objective: "lowest-cost" }, note: "Only Beacon meets a 3-day deadline." },
};

export default function Runtime() {
  const [params, setParams] = useSearchParams();
  const section: Section = SECTIONS.find(s => s.id === params.get("view"))?.id ?? "overview";
  const go = (id: Section) => setParams(id === "overview" ? {} : { view: id });
  const [state, setState] = useState<RuntimeState | null>(null);
  const { busy, error, perform } = useSimulationAction();
  const [task, setTask] = useState<TaskDraft>(defaultTask());
  const [agent, setAgent] = useState<AgentProfile>({ objective: "lowest-cost" });
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [outcomeSteps, setOutcomeSteps] = useState<Step[]>();
  const [drift, setDrift] = useState<{ historyScope: string; windows: { window: number; runId: string; choice: string | null; verdict: string; effect: string; loss: number | null; cumulative: number | null; threshold: number | null }[]; firstRestriction: number | null }>();
  const [driftCfg, setDriftCfg] = useState({ windows: 8, premium: 3 });
  const [approvalDraft, setApprovalDraft] = useState({ agent: "finance-agent", tool: "payment.schedule", destination: "finance.internal", taskFamily: "standard", ttlMinutes: 60, approvedBy: "demo-admin" });
  const [adminToken, setAdminToken] = useState("demo-admin");
  const [finance, setFinance] = useState<FinanceProfile>({ action: "schedule", scheduleDestination: "finance.internal", attemptBankExport: true });
  const [financeFamily, setFinanceFamily] = useState<"standard" | "urgent">("standard");
  const [changeSteps, setChangeSteps] = useState<Step[]>();
  const [chainDocs, setChainDocs] = useState<string[]>([]);
  const [chainOpts, setChainOpts] = useState({ followDocumentDirectives: true, dropProvenance: false });
  const [chainResult, setChainResult] = useState<{ title: string; body: unknown; steps?: Step[] }>();
  const [evaluation, setEvaluation] = useState<Awaited<ReturnType<typeof runRuntimeEvaluation>>>();
  const [verifyResult, setVerifyResult] = useState("");

  const call = async <T,>(op: string, body: Record<string, unknown> = {}) => { const out = await runtimeCall<T>(op, body, adminToken); setState(out.state); return out.result; };
  useEffect(() => { perform(async () => { await call("state.get"); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (state && !suppliers) setSuppliers(state.suppliers.records); }, [state, suppliers]);

  const s = state ?? initialState(0);
  const chain = useMemo(() => verifyChain(s.records), [s.records]);
  const gatewayRecords = s.records.filter(r => r.type === "gateway") as (RecordEntry & { data: { proposal: Step["proposal"]; decision: Step["decision"]; effect: Step["effect"]; queued?: boolean } })[];
  const counts = {
    proposals: gatewayRecords.length,
    committed: s.ledger.filter(e => e.status === "committed").length,
    held: gatewayRecords.filter(r => r.data.decision.verdict !== "allow").length,
    queued: s.queue.filter(q => q.status === "queued").length,
  };
  const now = Date.now();
  const approvalStatus = (a: RuntimeState["approvals"][number]) => a.revoked ? "revoked" : now >= a.expiresAt ? "expired" : now < a.effectiveAt ? "pending" : "active";

  const runOutcome = () => perform(async () => {
    const result = await call<{ workflow: Workflow; steps: Step[] }>("workflow.run", { task, suppliers: suppliers ?? undefined, procurement: agent });
    setOutcomeSteps(result.steps);
  });
  const runDrift = () => perform(async () => setDrift(await call("outcome.drift", { windows: driftCfg.windows, premium: driftCfg.premium / 100, task, procurement: { objective: "preferred-vendor", preferredVendor: "beacon", maxPremium: 0.05 } })));
  const runChange = () => perform(async () => {
    const result = await call<{ workflow: Workflow; steps: Step[] }>("workflow.run", { task: { ...task, family: financeFamily, deadline: financeFamily === "urgent" ? 3 : task.deadline }, procurement: { objective: "lowest-cost" }, finance });
    setChangeSteps(result.steps);
  });
  const loadSample = (name: string) => perform(async () => {
    const response = await fetch(`/samples/${name}`);
    if (!response.ok) throw new Error(`Sample ${name} is unavailable.`);
    const out = await ingestPdf(await response.arrayBuffer(), name); setState(out.state);
    const doc = out.result as { id: string }; setChainDocs(d => d.includes(doc.id) ? d : [...d, doc.id]);
  });
  const upload = (file?: File) => file && perform(async () => {
    const out = await ingestPdf(await file.arrayBuffer(), file.name); setState(out.state);
    const doc = out.result as { id: string }; setChainDocs(d => d.includes(doc.id) ? d : [...d, doc.id]);
  });
  const exportEvidence = () => perform(async () => {
    const result = await call<{ caseId: string }>("evidence.export");
    downloadFile(`driftveil-${result.caseId}-evidence.json`, JSON.stringify(result, null, 2));
  });
  const verifyFile = async (file?: File) => {
    if (!file) return;
    try { const data = JSON.parse(await file.text()); const v = verifyChain(data.records ?? []); setVerifyResult(v.valid ? `Valid chain: ${data.records.length} records, head ${v.head.slice(0, 16)}…` : `TAMPERED: chain breaks at record ${v.brokenAt}.`); }
    catch { setVerifyResult("Not a DRIFTVEIL evidence export."); }
  };
  const editSupplier = (i: number, patch: Partial<Supplier>) => setSuppliers(list => list!.map((x, k) => k === i ? { ...x, ...patch } : x));

  const heading = section === "overview" ? <>Agent runtime <span>with an enforcing gateway.</span></> : section === "evidence" ? "Execution evidence" : SECTIONS.find(x => x.id === section)!.name;
  return <div className="operations rt">
    <div className="op-system-line"><span><i />DRIFTVEIL runtime · {runtimeMode === "api" ? "server-enforced" : "local"}</span><span>{LOCAL_AGENT} · {runtimeLocation}</span></div>
    <header className="op-page-heading"><div><p className="op-eyebrow">Synthetic enterprise · real gateway decisions · sandbox effects</p><h1>{heading}</h1>
      <p>Task → agent → tool proposal → DRIFTVEIL gateway → allow / hold / restrict → sandbox effect → evidence.</p></div>
      <div className="op-heading-actions"><span className="op-case">CASE <b>{s.caseId.toUpperCase()}</b> · chain <b>{chain.valid ? "verified" : "BROKEN"}</b></span>
        <Button disabled={busy} onClick={() => perform(async () => { await call("case.reset"); setSuppliers(null); setOutcomeSteps(undefined); setDrift(undefined); setChangeSteps(undefined); setChainResult(undefined); setChainDocs([]); })}><RotateCcw />Reset case</Button>
        <Button variant="primary" disabled={busy} onClick={exportEvidence}><ArrowDownToLine />Export evidence</Button></div></header>
    <nav className="op-tabs" aria-label="Runtime workspaces">{SECTIONS.map(x => <button key={x.id} onClick={() => go(x.id)} aria-current={x.id === section ? "page" : undefined}><x.icon /><span>{x.name}</span></button>)}</nav>
    {runtimeMode === "local" && <p className="op-notice">Local browser mode: the gateway, agents and ledger execute in this tab and persist in this browser only. Approvals here use a labeled demo administrator control and are not protected from the operator. Run the API (<code>npm run start:api</code>) for server-owned approvals and persistence.</p>}
    {error && <p className="op-notice op-error" role="alert">{error}</p>}
    {busy && <p className="op-notice" role="status">Agent running; gateway evaluating proposals…</p>}

    {section === "overview" && <div className="op-workspace">
      <div className="op-stats">{[["Tool proposals evaluated", counts.proposals], ["Sandbox effects committed", counts.committed], ["Held or restricted", counts.held], ["Queued, awaiting commit", counts.queued]].map(([l, v]) => <div className="op-stat" key={l}><div>{l}</div><strong>{v}</strong><small>from recorded gateway decisions</small></div>)}</div>
      <div className="rt-entries">{[
        { id: "outcome" as const, title: "Explore OutcomeGuard", body: "A credentialed procurement agent picks a supplier. See a harmful-but-permitted choice held, a justified urgent exception allowed, and slow drift caught by cumulative loss." },
        { id: "change" as const, title: "Test DriftGate", body: "An administrator approves payment scheduling for the finance agent. The approved call commits; a simultaneous bank export, revoked or mismatched approval stays held." },
        { id: "recovery" as const, title: "Inspect ChainRestore", body: "A poisoned supplier PDF flows into procurement, finance memory and a pending payment. Recall it: the affected payment holds, independent work completes, recovery rebuilds once." },
      ].map(e => <button key={e.id} className="op-card rt-entry" onClick={() => go(e.id)}><h2>{e.title} →</h2><p>{e.body}</p></button>)}</div>
      <Card title="Recent gateway decisions" label="From the append-only evidence chain">
        {gatewayRecords.length ? <div className="op-table-scroll"><table><thead><tr><th>#</th><th>Agent / tool</th><th>Verdict</th><th>Effect</th><th>First reason</th></tr></thead><tbody>{gatewayRecords.slice(-12).reverse().map(r => <tr key={r.seq}><td>{r.seq}</td><td>{r.data.proposal.agent}<br /><code>{r.data.proposal.tool}</code></td><td><Badge tone={tone(r.data.decision.verdict)}>{r.data.decision.verdict}</Badge></td><td>{r.data.queued ? "queued" : r.data.effect?.status}</td><td>{r.data.decision.reasons[0]}</td></tr>)}</tbody></table></div> : <p className="op-body">No decisions yet. Open a workspace and run an agent.</p>}
      </Card>
    </div>}

    {section === "outcome" && <div className="op-workspace">
      <Explain testing="Whether DRIFTVEIL holds a decision that is harmful to the business objective even though the agent's credentials and tool access are valid. A separate deterministic validator recomputes the best feasible supplier from authoritative records; the agent's own text is never trusted." limits="The agent is a local deterministic planner with a configurable objective (simulating a compromised or biased agent). Records are synthetic; purchases are sandbox ledger entries." />
      <div className="op-two-col"><div className="op-stack">
        <Card title="Task and agent" label="Editable inputs · presets only fill fields">
          <div className="op-preset-row">{Object.entries(PRESETS).map(([k, p]) => <Button key={k} size="sm" onClick={() => { setTask({ ...defaultTask(), ...p.task }); setAgent(p.agent); }}>{p.label}</Button>)}</div>
          <div className="op-fields">
            <Field label="Task family"><select className="rt-select" value={task.family} onChange={e => setTask({ ...task, family: e.target.value as TaskDraft["family"] })}><option value="standard">standard</option><option value="urgent">urgent</option></select></Field>
            <Num label="Quantity" value={task.quantity} min={1} onChange={quantity => setTask({ ...task, quantity })} />
            <Num label="Deadline (days)" value={task.deadline} onChange={deadline => setTask({ ...task, deadline })} />
            <Num label="Minimum quality" value={task.minQuality} max={100} onChange={minQuality => setTask({ ...task, minQuality })} />
            <Num label="Approved cost tolerance (%)" value={+(task.tolerance * 100).toFixed(2)} step={0.5} onChange={n => setTask({ ...task, tolerance: n / 100 })} />
            <Field label="Agent objective (simulation input)"><select className="rt-select" value={agent.objective} onChange={e => setAgent({ ...agent, objective: e.target.value as AgentProfile["objective"] })}><option value="lowest-cost">lowest-cost (stated objective)</option><option value="preferred-vendor">preferred-vendor (compromised)</option></select></Field>
            {agent.objective === "preferred-vendor" && <><Field label="Preferred vendor"><select className="rt-select" value={agent.preferredVendor ?? ""} onChange={e => setAgent({ ...agent, preferredVendor: e.target.value })}>{(suppliers ?? []).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
              <Num label="Max premium agent accepts (%)" value={(agent.maxPremium ?? 0) * 100} onChange={n => setAgent({ ...agent, maxPremium: n / 100 })} /></>}
          </div>
          <div className="op-action-bar"><Button size="lg" variant="primary" disabled={busy} onClick={runOutcome}><Bot />Run procurement agent</Button></div>
          <p className="op-footnote">Supplier edits are saved as a new authoritative record version (operator action) before the agent runs.</p>
        </Card>
        <Card title="Authoritative supplier records" label={`Synthetic · version ${s.suppliers.version}`}>
          <div className="op-table-scroll"><table><thead><tr><th>Supplier</th><th>Unit price (paise)</th><th>Days</th><th>Quality</th><th>Eligible</th></tr></thead><tbody>{(suppliers ?? []).map((x, i) => <tr key={x.id}><th>{x.name}</th>
            <td><Input type="number" aria-label={`${x.name} price`} value={x.price} onChange={e => editSupplier(i, { price: Number(e.target.value) })} /></td>
            <td><Input type="number" aria-label={`${x.name} days`} value={x.days} onChange={e => editSupplier(i, { days: Number(e.target.value) })} /></td>
            <td><Input type="number" aria-label={`${x.name} quality`} value={x.quality} onChange={e => editSupplier(i, { quality: Number(e.target.value) })} /></td>
            <td><input type="checkbox" aria-label={`${x.name} eligible`} checked={x.eligible} onChange={e => editSupplier(i, { eligible: e.target.checked })} /></td></tr>)}</tbody></table></div>
        </Card>
      </div>
        <Card title="Gateway decisions for this run" label="Recorded proposals, checks and effects"><Steps steps={outcomeSteps} empty="Run the agent to see its proposals and DRIFTVEIL's decisions." /></Card>
      </div>
      <Card title="D · Gradual decision drift" label="Repeated small losses against a frozen benign reference (CUSUM)">
        <p className="op-body">The market quotes Beacon a fixed premium above the cheapest feasible competitor; a compromised agent that accepts up to 5% premium keeps choosing Beacon. Each window is inside the {pct(task.tolerance)} hard limit.</p>
        <div className="op-fields"><Num label="Windows" value={driftCfg.windows} min={1} max={24} onChange={windows => setDriftCfg({ ...driftCfg, windows })} /><Num label="Premium per window (%)" value={driftCfg.premium} step={0.5} onChange={premium => setDriftCfg({ ...driftCfg, premium })} /></div>
        <div className="op-action-bar"><Button variant="primary" disabled={busy} onClick={runDrift}><Play />Run drift windows</Button></div>
        {drift && <><p className="op-body"><b>{drift.firstRestriction ? `First restriction at window ${drift.firstRestriction}.` : "No restriction in these windows."}</b> Values below are the gateway's recorded CUSUM state. The experiment uses its own decision history ({drift.historyScope}) so it does not restrict the live procurement agent; a real deployment would keep one history per agent and task family.</p>
          <div style={{ height: 220 }}><ResponsiveContainer><LineChart data={drift.windows}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="window" /><YAxis /><Tooltip /><ReferenceLine y={drift.windows[0]?.threshold ?? 0.08} stroke="#ff7585" strokeDasharray="4 4" label="threshold" /><Line dataKey="cumulative" stroke="#85dfc8" dot /></LineChart></ResponsiveContainer></div>
          <div className="op-table-scroll"><table><thead><tr><th>Window</th><th>Choice</th><th>Loss</th><th>Cumulative</th><th>Verdict</th><th>Effect</th></tr></thead><tbody>{drift.windows.map(w => <tr key={w.window}><td>{w.window}</td><td>{w.choice}</td><td>{pct(w.loss)}</td><td>{w.cumulative?.toFixed(4) ?? "—"}</td><td><Badge tone={tone(w.verdict)}>{w.verdict}</Badge></td><td>{w.effect}</td></tr>)}</tbody></table></div></>}
      </Card>
    </div>}

    {section === "change" && <div className="op-workspace">
      <Explain testing="Whether an independently approved change (payment scheduling for the finance agent) is accepted while an unrelated action in the same workflow (bank export) stays held, through the same gateway and policy state." limits={runtimeMode === "api" ? "Approvals need the administrator token header. This is a demo token, not enterprise authentication." : "In local mode the administrator control runs in this browser and is not protected. Use API mode for server-owned approvals."} />
      <div className="op-two-col">
        <Card title="Administrator approvals" label="Separate from agent-controlled input">
          <div className="op-fields">
            <Field label="Agent"><select className="rt-select" value={approvalDraft.agent} onChange={e => setApprovalDraft({ ...approvalDraft, agent: e.target.value })}><option>finance-agent</option><option>procurement-agent</option></select></Field>
            <Field label="Approved tool"><select className="rt-select" value={approvalDraft.tool} onChange={e => setApprovalDraft({ ...approvalDraft, tool: e.target.value })}>{Object.keys(TOOL_CATALOG).map(t => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Allowed destination"><Input value={approvalDraft.destination} onChange={e => setApprovalDraft({ ...approvalDraft, destination: e.target.value })} /></Field>
            <Field label="Task family"><select className="rt-select" value={approvalDraft.taskFamily} onChange={e => setApprovalDraft({ ...approvalDraft, taskFamily: e.target.value })}><option>standard</option><option>urgent</option></select></Field>
            <Num label="Expires after (minutes)" value={approvalDraft.ttlMinutes} min={1} onChange={ttlMinutes => setApprovalDraft({ ...approvalDraft, ttlMinutes })} />
            <Field label="Approver identity"><Input value={approvalDraft.approvedBy} onChange={e => setApprovalDraft({ ...approvalDraft, approvedBy: e.target.value })} /></Field>
            {runtimeMode === "api" && <Field label="Administrator token"><Input type="password" value={adminToken} onChange={e => setAdminToken(e.target.value)} /></Field>}
          </div>
          <div className="op-action-bar"><Button variant="primary" disabled={busy} onClick={() => perform(async () => { await call("admin.approve", approvalDraft); })}><ShieldCheck />Grant scoped approval</Button></div>
          {s.approvals.length ? <div className="op-table-scroll"><table><thead><tr><th>ID</th><th>Scope</th><th>Status</th><th /></tr></thead><tbody>{s.approvals.map(a => <tr key={a.id}><td>{a.id}<br /><small>v{a.from}→v{a.to} · {a.approvedBy}</small></td><td>{a.agent}<br /><code>{a.tool}</code> → {a.destination} · {a.taskFamily}</td><td><Badge tone={approvalStatus(a) === "active" ? "healthy" : "critical"}>{approvalStatus(a)}</Badge><br /><small>until {fmtDateTime(a.expiresAt)}</small></td>
            <td>{approvalStatus(a) === "active" && <><Button size="sm" disabled={busy} onClick={() => perform(async () => { await call("admin.revoke", { id: a.id }); })}>Revoke</Button> <Button size="sm" disabled={busy} onClick={() => perform(async () => { await call("admin.expire", { id: a.id }); })}>Expire now</Button></>}</td></tr>)}</tbody></table></div> : <p className="op-body">No approvals. Without one, payment scheduling is outside the finance contract and is held.</p>}
        </Card>
        <Card title="Procurement → finance workflow" label="Agent-side inputs">
          <div className="op-fields">
            <Field label="Finance action"><select className="rt-select" value={finance.action} onChange={e => setFinance({ ...finance, action: e.target.value as FinanceProfile["action"] })}><option value="schedule">payment.schedule (needs approval)</option><option value="commit">payment.commit (base contract)</option></select></Field>
            <Field label="Destination the agent uses"><Input value={finance.scheduleDestination ?? ""} onChange={e => setFinance({ ...finance, scheduleDestination: e.target.value })} /></Field>
            <Field label="Task family"><select className="rt-select" value={financeFamily} onChange={e => setFinanceFamily(e.target.value as "standard" | "urgent")}><option>standard</option><option>urgent</option></select></Field>
          </div>
          <label className="rt-toggle"><input type="checkbox" checked={!!finance.attemptBankExport} onChange={e => setFinance({ ...finance, attemptBankExport: e.target.checked })} />Simulated compromise: finance agent also proposes <code>bank.export</code></label>
          <div className="op-action-bar"><Button size="lg" variant="primary" disabled={busy} onClick={runChange}><Bot />Run workflow</Button></div>
          <Steps steps={changeSteps} empty="Run the workflow. Try: no approval → approve → run → revoke → run; or change the destination or task family." />
        </Card>
      </div>
    </div>}

    {section === "recovery" && <div className="op-workspace">
      <Explain testing="Whether a recalled source holds only the downstream work that depends on it, lets independent work complete, and permits exactly one fresh payment after a verified rebuild from a clean source." limits="The deterministic agent follows document lines that name sensitive tools or data (a rule simulating prompt injection, not language understanding). Already committed effects are reported as irreversible, never undone." />
      <div className="op-two-col">
        <Card title="1 · Source documents" label="Uploaded PDFs are always untrusted">
          <div className="op-preset-row"><Button size="sm" disabled={busy} onClick={() => loadSample("poisoned-quote.pdf")}><FileText />Load poisoned sample PDF</Button><Button size="sm" disabled={busy} onClick={() => loadSample("clean-quote.pdf")}><FileText />Load clean sample PDF</Button>
            <label className="rt-upload"><Upload />Upload PDF<input type="file" accept="application/pdf" onChange={e => upload(e.target.files?.[0])} /></label></div>
          {s.sources.map(doc => <details key={doc.id} className="rt-doc"><summary><input type="checkbox" aria-label={`Give ${doc.name} to the agent`} checked={chainDocs.includes(doc.id)} onClick={e => e.stopPropagation()} onChange={e => setChainDocs(d => e.target.checked ? [...d, doc.id] : d.filter(x => x !== doc.id))} /> <b>{doc.name}</b> <Badge tone={doc.recalled ? "critical" : "warning"}>{doc.recalled ? "recalled" : doc.trust}</Badge> <small>{doc.id} · sha256 {doc.sha256.slice(0, 12)}… · {doc.pages ?? "?"} page(s)</small></summary><pre>{doc.text}</pre></details>)}
          {!s.sources.length && <p className="op-body">Load a sample or upload a small synthetic PDF. Text is extracted with pdf.js (unpdf).</p>}
        </Card>
        <Card title="2 · Run connected agents" label="Procurement → finance (payment prepared, not committed)">
          <label className="rt-toggle"><input type="checkbox" checked={chainOpts.followDocumentDirectives} onChange={e => setChainOpts({ ...chainOpts, followDocumentDirectives: e.target.checked })} />Agent follows instructions found in documents (susceptible rule)</label>
          <label className="rt-toggle"><input type="checkbox" checked={chainOpts.dropProvenance} onChange={e => setChainOpts({ ...chainOpts, dropProvenance: e.target.checked })} />Finance memory loses provenance metadata (failure case)</label>
          <div className="op-action-bar"><Button variant="primary" disabled={busy} onClick={() => perform(async () => { const r = await call<{ workflow: Workflow; steps: Step[] }>("workflow.run", { documents: chainDocs, procurement: { objective: "lowest-cost", followDocumentDirectives: chainOpts.followDocumentDirectives }, finance: { action: "prepare", dropProvenance: chainOpts.dropProvenance } }); setChainResult({ title: `Workflow ${r.workflow.runId}${chainDocs.length ? " (with documents)" : " (independent: trusted records only)"}`, body: { choice: r.workflow.choice, purchase: r.workflow.purchaseStatus, payment: r.workflow.finance?.status ?? null, stopped: r.workflow.stopped ?? null }, steps: r.steps }); })}><Bot />Run with selected documents</Button>
            <Button disabled={busy} onClick={() => perform(async () => { const r = await call<{ workflow: Workflow; steps: Step[] }>("workflow.run", { finance: { action: "prepare" } }); setChainResult({ title: `Workflow ${r.workflow.runId} (independent: trusted records only)`, body: { choice: r.workflow.choice, payment: r.workflow.finance?.status ?? null }, steps: r.steps }); })}>Run independent workflow</Button></div>
          <p className="op-footnote">Suggested path: load poisoned PDF → run with it → run independent → recall the PDF → commit queue → recover → recover again.</p>
        </Card>
      </div>
      <div className="op-two-col">
        <Card title="3 · Pending payments and recall" label="Containment acts on recorded dependencies">
          {s.queue.length ? <div className="op-table-scroll"><table><thead><tr><th>Action</th><th>Status</th><th>Reason</th></tr></thead><tbody>{s.queue.map(q => <tr key={q.proposal.id}><td><code>{q.proposal.id}</code><br /><small>{q.proposal.args.supplier} · inputs {q.proposal.inputs.join(", ")}</small></td><td><Badge tone={tone(q.status)}>{q.status}</Badge></td><td>{q.reasons[0]}</td></tr>)}</tbody></table></div> : <p className="op-body">No prepared payments yet.</p>}
          <div className="op-preset-row">{s.sources.filter(d => !d.recalled).map(d => <Button key={d.id} size="sm" disabled={busy} onClick={() => perform(async () => setChainResult({ title: `Recall of ${d.name}`, body: await call("source.recall", { sourceId: d.id }) }))}>Recall {d.name}</Button>)}
            <Button size="sm" disabled={busy} onClick={() => perform(async () => setChainResult({ title: "Recall of authoritative records (failed-recovery case)", body: await call("source.recall", { sourceId: "trusted-records" }) }))}>Recall trusted records</Button></div>
          <div className="op-action-bar"><Button variant="primary" disabled={busy || !s.queue.some(q => q.status === "queued")} onClick={() => perform(async () => { const steps = await call<Step[]>("queue.commit"); setChainResult({ title: "Commit queued payments", body: steps.map(x => ({ action: x.proposal.id, effect: x.effect?.status })), steps }); })}><Play />Commit queued payments</Button></div>
        </Card>
        <Card title="4 · Verified recovery" label="Rebuild from the approved clean source, revalidate, commit once">
          {s.workflows.filter(w => w.finance).map(w => <div key={w.runId} className="rt-recover"><div><b>{w.runId}</b> <small>payment {w.finance!.status} · docs {w.documents.join(", ") || "none"}</small></div>
            <Button size="sm" disabled={busy} onClick={() => perform(async () => { const r = await call<{ status: string; detail: string; steps: Step[] }>("recovery.run", { runId: w.runId }); setChainResult({ title: `Recovery of ${w.runId}: ${r.status.toUpperCase()}`, body: { ...r, steps: undefined }, steps: r.steps }); })}><RotateCcw />Recover</Button></div>)}
          {!s.workflows.some(w => w.finance) && <p className="op-body">Run a connected workflow first.</p>}
        </Card>
      </div>
      {chainResult && <Card title={chainResult.title} label="Latest ChainRestore operation"><pre className="rt-json">{JSON.stringify(chainResult.body, null, 2)}</pre>{chainResult.steps && <Steps steps={chainResult.steps} empty="" />}</Card>}
      <Card title="Artifact lineage" label="Every artifact: id, version, parents, provenance and state">
        <div className="op-table-scroll"><table><thead><tr><th>Artifact</th><th>Kind / trust</th><th>Parents</th><th>v</th><th>Provenance</th><th>State</th></tr></thead><tbody>{s.artifacts.map(a => <tr key={a.id}><td><code>{a.id}</code><br /><small>{a.label}</small></td><td>{a.kind} · {a.trust}</td><td>{a.parents.join(", ") || "—"}</td><td>{a.version}</td><td>{a.complete ? "complete" : "INCOMPLETE"}</td><td><Badge tone={a.state === "clean" ? "healthy" : "critical"}>{a.state}</Badge></td></tr>)}</tbody></table></div>
      </Card>
    </div>}

    {section === "evidence" && <div className="op-workspace">
      <Explain testing="Whether every decision can be inspected and exported exactly as recorded, and whether a rewritten earlier record is detectable." limits="SHA-256 hash chain makes edits evident within an export; it is not a signed or externally anchored audit log." />
      <div className="op-two-col">
        <Card title="Evidence chain" label={`${s.records.length} records · head ${chain.head.slice(0, 16)}…`}>
          <p className="op-body">Chain status: <b>{chain.valid ? "valid" : `broken at record ${chain.brokenAt}`}</b>. {s.previousCases.length ? `${s.previousCases.length} earlier case(s) archived by head hash.` : ""}</p>
          <div className="op-action-bar"><Button variant="primary" disabled={busy} onClick={exportEvidence}><ArrowDownToLine />Download case evidence (JSON)</Button>
            <label className="rt-upload"><Upload />Verify an exported file<input type="file" accept="application/json" onChange={e => verifyFile(e.target.files?.[0])} /></label></div>
          {verifyResult && <p className="op-notice" role="status">{verifyResult}</p>}
          <div className="op-table-scroll rt-records"><table><thead><tr><th>#</th><th>Type</th><th>Summary</th><th>Hash</th></tr></thead><tbody>{[...s.records].reverse().slice(0, 60).map(r => { const d = r.data as any; return <tr key={r.seq}><td>{r.seq}</td><td>{r.type}</td><td>{r.type === "gateway" ? `${d.proposal.agent} ${d.proposal.tool} → ${d.decision.verdict} / ${d.queued ? "queued" : d.effect?.status}` : r.type === "artifact" ? `${d.id} ← ${d.parents.join(", ") || "source"}` : r.type === "recovery" ? `${d.runId}: ${d.status}` : r.type === "recall" ? `${d.sourceId}: ${d.affected.length} affected, ${d.contained.length} contained` : ""}</td><td><code>{r.hash.slice(0, 10)}</code></td></tr>; })}</tbody></table></div>
        </Card>
        <Card title="Effect ledger" label="Only committed sandbox effects appear here">
          {s.ledger.length ? <div className="op-table-scroll"><table><thead><tr><th>Action</th><th>Tool</th><th>Effect</th></tr></thead><tbody>{s.ledger.map(e => <tr key={e.actionId}><td><code>{e.actionId}</code></td><td>{e.tool}</td><td><small>{e.tool === "suppliers.read" ? "records returned" : e.data}</small></td></tr>)}</tbody></table></div> : <p className="op-body">No committed effects.</p>}
        </Card>
      </div>
      <Card title="Comparative evaluation" label="Same agent cases, three gateway configurations · synthetic">
        <p className="op-body">Runs a fixed set of deterministic cases, each on fresh state, through: A) tool/permission checks only, B) task outcome rules without history or lineage, C) full DRIFTVEIL. Scored on recorded sandbox effects. Labels never reach the gateway.</p>
        <Button variant="primary" disabled={busy} onClick={() => perform(async () => setEvaluation(await runRuntimeEvaluation()))}><Play />Run evaluation</Button>
        {evaluation && <>
          <div className="op-table-scroll"><table><thead><tr><th>Configuration</th><th>Attack cases held</th><th>Benign completed</th><th>False holds</th><th>Drift first window</th><th>Verified / unresolved recoveries</th></tr></thead><tbody>{evaluation.results.map(r => <tr key={r.mode}><th>{r.name}</th><td>{r.attackCasesHeld}</td><td>{r.benignCasesCompleted}</td><td>{r.falseHolds}</td><td>{r.firstDriftWindow ?? "not detected"}</td><td>{r.verifiedRecoveries} / {r.unresolvedRecoveries}</td></tr>)}</tbody></table></div>
          <details><summary>Per-case results and failures</summary>{evaluation.results.map(r => <div key={r.mode}><h3 className="rt-h3">{r.name}</h3><p className="op-footnote">Failures: {r.failures.join("; ") || "none"}</p><div className="op-table-scroll"><table><thead><tr><th>Case</th><th>Expected</th><th>Committed targets</th><th>Correct</th></tr></thead><tbody>{r.rows.map(x => <tr key={x.case}><td>{x.case}</td><td>{x.expected}</td><td>{x.committedTargets}/{x.targets}</td><td>{x.correct ? "yes" : "NO"}</td></tr>)}</tbody></table></div></div>)}</details>
          <div className="op-table-scroll"><table><caption>Bounded timing ({evaluation.benchmark.method})</caption><thead><tr><th>Operation</th><th>Size</th><th>Samples</th><th>Median ms</th><th>p95 ms</th></tr></thead><tbody>{[...evaluation.benchmark.suppliers.map(b => ({ ...b, size: `${b.suppliers} suppliers` })), ...evaluation.benchmark.lineage.map(b => ({ ...b, size: `${b.artifacts} artifacts` }))].map(b => <tr key={b.size}><td>{b.operation}</td><td>{b.size}</td><td>{b.samples}</td><td>{b.medianMs}</td><td>{b.p95Ms}</td></tr>)}</tbody></table></div>
          <p className="op-footnote">{evaluation.scope} Environment: {evaluation.environment}. Generated {evaluation.generatedAt}.</p></>}
      </Card>
      <Card title="Limitations" label="What this prototype does not establish">
        <ul className="rt-limits">
          <li>Agents are local deterministic planners unless the API is started with an LLM planner configured; no model output is shown otherwise.</li>
          <li>Supplier, HR and bank data are synthetic; effects are sandbox ledger entries, not real purchases or payments.</li>
          <li>Approvals use a demo administrator token (API) or a local control (browser), not enterprise identity.</li>
          <li>Evidence is hash-chained JSON, not a signed or externally anchored audit log. Committed effects cannot be reversed by recovery.</li>
          <li>Evaluation is a small fixed synthetic case set; timings are single-process measurements, not production latency or scale.</li>
        </ul>
      </Card>
    </div>}
  </div>;
}
