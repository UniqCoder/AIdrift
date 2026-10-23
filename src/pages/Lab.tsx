import { useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, FlaskConical, GitBranch, Play, ShieldCheck, Target } from "lucide-react";
import { PageHeader, DecisionBadge } from "@/components/domain";
import { Badge, Input, Panel, PanelHeader } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import { downloadFile } from "@/lib/utils";
import {
  ENGINE_VERSION, PROOF_NAMES, actionFixture, assess, changeFixture, contextFixture, learnReference,
  outcomeFixture, recoveryFixture, traceExposure,
  type Context, type Envelope, type OutcomeInput, type ProofRun,
} from "@/lib/simulation";
import { simulationClient, executionLocation, useSimulationAction } from "@/lib/simulationClient";
import { Finding, Effects } from "@/components/ComputedRun";
import { ProofSummary } from "@/components/ProofSummary";

const money = (value: number | null) => value === null ? "Unavailable" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value / 100);
const percent = (value: number | null) => value === null ? "Absolute gap applies" : `${(value * 100).toFixed(2)}%`;
const selectClass = "h-8 w-full rounded-lg border border-border bg-bg px-2 text-xs text-fg";
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex min-w-0 flex-col gap-1.5 text-xs text-muted"><span>{label}</span>{children}</label>;
}
function NumberField({ label, value, onChange, min = 0, max, step = 1 }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number }) {
  return <Field label={label}><Input type="number" min={min} max={max} step={step} value={Number.isFinite(value) ? value : ""} onChange={e => onChange(e.target.value === "" ? NaN : Number(e.target.value))} /></Field>;
}

export default function SimulationLab() {
  const [params, setParams] = useSearchParams();
  const { busy, error, perform } = useSimulationAction();
  const tab = params.get("tab") ?? "outcome";
  const [input, setInput] = useState<OutcomeInput>(outcomeFixture);
  const [history, setHistory] = useState<(number | null)[]>([]);
  const [envelope, setEnvelope] = useState<Envelope>(changeFixture);
  const [destination, setDestination] = useState("finance.internal");
  const [branch, setBranch] = useState("poisoned");
  const [missing, setMissing] = useState(false);
  const [repair, setRepair] = useState(false);
  const [lastRun, setLastRun] = useState<ProofRun | null>(null);
  const runs = useStore(s => s.proofRuns);
  const record = useStore(s => s.recordProofRun);
  const evaluation = useStore(s => s.evaluation);
  const setEvaluation = useStore(s => s.setEvaluation);
  const autoHold = useStore(s => s.settings.autoContain);
  const reviewAt = useStore(s => s.settings.thresholds.stepUp);
  const options = { autoHold, reviewAt };
  const ctx = { ...contextFixture(), ...options, outcome: input, previousLosses: history };
  const preview = assess(actionFixture({ args: input.selected, task: input.task.id, taskFamily: input.task.family }), ctx);
  const outcome = preview.outcome!;
  const ref = learnReference();
  const changeContext: Context = { ...contextFixture(), ...options, agent: "finance-agent", outcome: { ...outcomeFixture(), selected: "atlas" }, envelope, policyVersion: envelope.approved && envelope.effective ? 2 : 1 };
  const schedulePreview = assess(actionFixture({ agent: "finance-agent", tool: "payment.schedule", resource: "payment-queue", destination, args: "atlas" }, changeContext.policyVersion), changeContext);
  const exportPreview = assess(actionFixture({ agent: "finance-agent", tool: "bank.export", resource: "bank-records", destination: "external.example", args: "all" }, changeContext.policyVersion), changeContext);
  const graph = recoveryFixture(branch);
  if (missing) graph.find(a => a.id === "finance-memory")!.complete = false;
  const exposure = traceExposure(graph);
  const selectedRun = runs.find(r => r.id === params.get("run"));
  const editInput = (next: OutcomeInput) => { setInput(next); setHistory([]); setLastRun(null); };
  const save = (run: ProofRun) => { record(run); setLastRun(run); };
  const exportEvidence = () => downloadFile("driftveil-computed-evidence.json", JSON.stringify({ engine: ENGINE_VERSION, synthetic: true, evidenceType: "computed", runs, evaluation }, null, 2));
  const setTab = (value: string) => { setLastRun(null); setParams({ tab: value }); };

  return <div className="space-y-5" aria-busy={busy}>
    {busy && <p role="status" className="sticky top-16 z-30 rounded-lg border border-accent/30 bg-accent-soft p-4 text-sm">Running the calculation. Please wait for the result.</p>}
    {error && <p role="alert" className="sticky top-16 z-30 rounded-lg border border-critical/30 bg-critical-soft p-4 text-sm text-critical">{error}</p>}
    <fieldset disabled={busy} className="min-w-0 space-y-5">
    <PageHeader title="DRIFTVEIL Simulation Lab" description="Synthetic enterprise. Real calculations and mock effect prevention. Edit the inputs, inspect the decision, then execute a fresh sandbox." meta={<><Badge tone="accent">Three core proofs</Badge><Badge>{executionLocation}</Badge></>}
      actions={<Button onClick={exportEvidence} disabled={!runs.length && !evaluation}><Download /> Export evidence</Button>} />
    <Panel className="border-accent/30 bg-accent-soft p-4">
      <p className="text-sm font-medium">Valid credentials. Wrong business outcome. Caught before the mock effect.</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">The environment and agent proposals are synthetic; security verdicts come from shared policy, outcome arithmetic, learned benign statistics and dependency checks. No real agent, bank or company system is connected.</p>
    </Panel>
    <div className="flex flex-wrap gap-2" aria-label="Core simulations">
      {([ ["outcome", Target], ["change", ShieldCheck], ["recovery", GitBranch], ["evaluation", FlaskConical] ] as const).map(([key, Icon]) => <Button key={key} variant={tab === key ? "primary" : "secondary"} onClick={() => setTab(key)} aria-pressed={tab === key}><Icon />{key === "evaluation" ? "Measured evaluation" : PROOF_NAMES[key]}</Button>)}
    </div>
    {tab === "outcome" && <>
      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <Panel><PanelHeader title="1. OutcomeGuard" description="Objective: lowest total cost among qualified suppliers." actions={<Badge tone="accent">Core USP</Badge>} />
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <NumberField label="Quantity" value={input.task.quantity} min={1} onChange={quantity => editInput({ ...input, task: { ...input.task, quantity } })} />
              <NumberField label="Delivery deadline (days)" value={input.task.deadline} onChange={deadline => editInput({ ...input, task: { ...input.task, deadline } })} />
              <NumberField label="Minimum quality /100" value={input.task.minQuality} max={100} onChange={minQuality => editInput({ ...input, task: { ...input.task, minQuality } })} />
              <NumberField label="Allowed relative loss (%)" value={input.task.tolerance * 100} max={100} step={0.1} onChange={v => editInput({ ...input, task: { ...input.task, tolerance: v / 100 } })} />
              <NumberField label="Absolute tolerance (paise)" value={input.task.absoluteTolerance} onChange={absoluteTolerance => editInput({ ...input, task: { ...input.task, absoluteTolerance } })} />
              <Field label="Task family"><select className={selectClass} value={input.task.family} onChange={e => editInput({ ...input, task: { ...input.task, family: e.target.value as "standard" | "urgent" } })}><option value="standard">Standard procurement</option><option value="urgent">Urgent procurement (cold start)</option></select></Field>
            </div>
            <div className="overflow-x-auto"><table className="w-full min-w-[510px] text-left text-xs"><thead><tr className="text-muted">{["Supplier", "Unit price (paise)", "Days", "Quality", "Eligible"].map(h => <th key={h} className="pb-2 pr-2 font-medium">{h}</th>)}</tr></thead><tbody>
              {input.suppliers.map((s, i) => { const update = (patch: Partial<typeof s>) => editInput({ ...input, suppliers: input.suppliers.map((v, j) => i === j ? { ...v, ...patch, version: v.version + 1 } : v) }); return <tr key={s.id} className="border-t border-border"><td className="py-3 pr-2"><span className="block">{s.name}</span><span className="text-[10px] text-muted">Source v{s.version}</span></td>
                <td className="py-3 pr-2"><Input aria-label={`${s.name} price in paise`} className="min-w-24" type="number" min={0} value={Number.isFinite(s.price) ? s.price : ""} onChange={e => update({ price: e.target.value === "" ? NaN : Number(e.target.value) })} /></td>
                <td className="py-3 pr-2"><Input aria-label={`${s.name} delivery days`} type="number" min={0} value={Number.isFinite(s.days) ? s.days : ""} onChange={e => update({ days: e.target.value === "" ? NaN : Number(e.target.value) })} /></td>
                <td className="py-3 pr-2"><Input aria-label={`${s.name} quality`} type="number" min={0} max={100} value={Number.isFinite(s.quality) ? s.quality : ""} onChange={e => update({ quality: e.target.value === "" ? NaN : Number(e.target.value) })} /></td>
                <td className="py-3"><input aria-label={`${s.name} eligible`} type="checkbox" checked={s.eligible} onChange={e => update({ eligible: e.target.checked })} className="size-4 accent-[var(--accent)]" /></td></tr>; })}
            </tbody></table></div>
            <Field label="Agent's proposed supplier"><select className={selectClass} value={input.selected} onChange={e => editInput({ ...input, selected: e.target.value })}>{input.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => perform(async () => { const run = await simulationClient.outcome(input, history, options); save(run); const o = run.assessments.at(-1)?.outcome; if (o?.valid) setHistory([...history, o.loss]); })}><Play /> Execute next decision window</Button>
              <Button onClick={() => { const next = outcomeFixture(); next.suppliers[1].price = 10300; editInput(next); }}>Load slow drift (3% loss)</Button>
              <Button onClick={() => { const next = outcomeFixture(); next.task.deadline = 2; next.task.family = "urgent"; editInput(next); }}>Load valid urgent purchase</Button>
              <Button variant="ghost" onClick={() => editInput(outcomeFixture())}>Reset fixture</Button>
            </div>
            <p className="text-[11px] leading-relaxed text-subtle">Edits fork a new sandbox and reset its decision-window history. Saved evidence stays unchanged. Payload wording is not interpreted by an LLM.</p>
          </div>
        </Panel>
        <div className="space-y-4">
          <Panel><PanelHeader title="Live policy preview" description="Recomputed from current inputs; execute to record evidence." /><div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-3 text-xs">{[["Best feasible total", money(outcome?.optimum ?? null)], ["Proposed total", money(outcome?.chosenCost ?? null)], ["Decision loss", percent(outcome?.loss ?? null)], ["Absolute gap", money(outcome?.gap ?? null)]].map(([label, value]) => <div key={label} className="rounded-lg bg-bg p-3"><div className="text-muted">{label}</div><div className="mt-1 text-base font-semibold">{value}</div></div>)}</div>
            <p className="text-xs text-muted">Qualified alternatives: {outcome?.feasible.join(", ") || "none"}. Best: {outcome?.best.join(", ") || "unresolved"}.</p>
            <Finding value={preview} />
          </div></Panel>
          <Panel><PanelHeader title="Computed cumulative drift" description={`${history.length} executed windows + next proposal preview`} /><div className="p-4">
            <div className="h-44"><ResponsiveContainer width="100%" height="100%"><LineChart data={preview.drift}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="window" tick={{ fill: "var(--muted)", fontSize: 11 }} /><YAxis domain={[0, Math.max(0.12, ...preview.drift.map(p => p.cumulative))]} tick={{ fill: "var(--muted)", fontSize: 11 }} width={35} /><Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)" }} /><ReferenceLine y={ref.threshold} stroke="var(--critical)" strokeDasharray="4 4" /><Line dataKey="cumulative" name="CUSUM" type="linear" stroke="var(--accent)" strokeWidth={2} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">Reference {preview.referenceId ?? "unavailable for urgent family"}. {ref.samples} benign training purchases / {ref.transitionSamples} learned tool transitions. Mean loss {percent(ref.mean)}; allowance {percent(ref.allowance)}; threshold {ref.threshold}. Alert = cumulative excess loss, even with the same approved tool path. No automatic baseline reset.</p>
          </div></Panel>
        </div>
      </div>
    </>}
    {tab === "change" && <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
      <Panel><PanelHeader title="2. DriftGate" description="A versioned, exact permission delta; no blanket legitimacy flag." /><div className="space-y-4 p-4">
        <p className="text-xs text-muted">Contract v1 → v2. Existing procurement permissions stay bounded. One workflow proposes both scheduling and bank export.</p>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={envelope.approved} onChange={e => { setEnvelope({ ...envelope, approved: e.target.checked }); setLastRun(null); }} /> Change approved</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={envelope.effective} onChange={e => { setEnvelope({ ...envelope, effective: e.target.checked }); setLastRun(null); }} /> Change effective now</label>
        {([ ["tool", "Approved tool", ["payment.schedule", "bank.export"]], ["resource", "Approved resource", ["payment-queue", "bank-records"]], ["taskFamily", "Approved task family", ["standard", "urgent"]] ] as const).map(([key, label, values]) => <Field key={key} label={label}><select className={selectClass} value={envelope.scope[key]} onChange={e => { setEnvelope({ ...envelope, scope: { ...envelope.scope, [key]: e.target.value } }); setLastRun(null); }}>{values.map(v => <option key={v}>{v}</option>)}</select></Field>)}
        <Field label="Approved destination"><Input value={envelope.scope.destination} onChange={e => { setEnvelope({ ...envelope, scope: { ...envelope.scope, destination: e.target.value } }); setLastRun(null); }} /></Field>
        <Field label="Actual scheduling destination"><Input value={destination} onChange={e => { setDestination(e.target.value); setLastRun(null); }} /></Field>
        <Button variant="primary" onClick={() => perform(async () => save(await simulationClient.change(envelope, destination, options)))}><Play /> Execute both proposed actions</Button>
        <p className="text-[11px] text-subtle">Approvals are operator-controlled synthetic fixtures. Production approval authentication is future work.</p>
      </div></Panel>
      <div className="space-y-4"><Panel><PanelHeader title="Payment scheduling" description="Known tool + exact approved scope" /><div className="p-4"><Finding value={schedulePreview} /></div></Panel><Panel><PanelHeader title="Simultaneous bank-details export" description="Valid credential; no permission to export this data" /><div className="p-4"><Finding value={exportPreview} /></div></Panel></div>
    </div>}
    {tab === "recovery" && <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
      <Panel><PanelHeader title="3. ChainRestore" description="Recall, current-state fencing and fresh-path recomputation." /><div className="space-y-4 p-4">
        <Field label="Summary dependency in a new fixture"><select className={selectClass} value={branch} onChange={e => { setBranch(e.target.value); setLastRun(null); }}><option value="poisoned">Contaminated supplier PDF</option><option value="trusted">Independent trusted supplier records</option></select></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={missing} onChange={e => { setMissing(e.target.checked); setLastRun(null); }} /> Finance memory has incomplete provenance</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={repair} onChange={e => { setRepair(e.target.checked); setLastRun(null); }} /> Recompute affected workflow from trusted records</label>
        <Button variant="primary" onClick={() => perform(async () => save(await simulationClient.recovery(branch, missing, repair, options)))}><Play /> Execute recovery sandbox</Button>
        <p className="text-xs leading-relaxed text-muted">The executor tests a pre-recall assessment and retry against current source state, holds stale actions, and attempts an independent order. Optional repair creates new artifacts, validates the output and retries with the same idempotency key.</p>
        <p className="text-xs leading-relaxed text-muted">Changing the dependency creates a fresh fixture; it never deletes a recorded parent or cleanses a saved run. Missing lineage remains unresolved. Recall cannot undo effects already committed outside this sandbox.</p>
      </div></Panel>
      <Panel><PanelHeader title="Recorded dependency paths" actions={<Badge tone="warning">{exposure.affected.length} affected / {exposure.unresolved.length} unresolved</Badge>} /><div className="space-y-2 p-4">{(lastRun?.kind === "recovery" ? lastRun.artifacts! : graph).map(node => {
        const actual = traceExposure(lastRun?.kind === "recovery" ? lastRun.artifacts! : graph);
        const status = actual.unresolved.includes(node.id) ? "unresolved" : actual.affected.includes(node.id) ? "recalled" : "clean path";
        return <div key={node.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-bg p-3 text-xs"><div><span className="font-mono">{node.id}</span><p className="mt-1 text-[11px] text-muted">{node.parents.length ? `${node.parents.join(", ")} → ${node.id}` : "Source record"} · v{node.version}</p></div><Badge tone={status === "clean path" ? "healthy" : "warning"}>{status}</Badge></div>;
      })}</div></Panel>
    </div>}
    {tab === "evaluation" && <Panel><PanelHeader title="Measured synthetic evaluation" description="Ground truth labels stay outside the detector." actions={<Button variant="primary" onClick={() => perform(async () => setEvaluation(await simulationClient.evaluation()))}><Play /> Run held-out evaluation</Button>} /><div className="space-y-4 p-4">
      <p className="text-xs leading-relaxed text-muted">Fixed seed 422026. Separate 12-trace benign training reference, four calibration assertions, 20 benign / 12 attack evaluation cases, slow-drift and benign streams. These measurements cover controlled fixtures, not production accuracy.</p>
      {evaluation ? <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Attack cases held", `${evaluation.detected}/${evaluation.attacks}`], ["False holds", `${evaluation.falseHolds}/${evaluation.benign}`], ["Benign effects completed", `${evaluation.benignCompleted}/${evaluation.benign}`], ["Prohibited effects", `${evaluation.prohibitedEffects}/${evaluation.attacks}`]].map(([label, value]) => <div key={label} className="rounded-lg bg-bg p-4"><div className="text-xs text-muted">{label}</div><div className="mt-1 text-2xl font-semibold">{value}</div></div>)}</div>
        <p className="text-xs text-muted">Same-tool 3% loss stream: first restriction at window {evaluation.stream.alertWindow ?? "not detected"}/{evaluation.stream.windows}. Benign stream first restriction: {evaluation.stream.benignAlertWindow ?? "none"}. Credential-only comparator: {evaluation.credentialOnlyDetected}/{evaluation.attacks}; tool-only permission comparator: {evaluation.permissionOnlyDetected}/{evaluation.attacks} attack cases held. Comparator scope is intentionally limited.</p>
        <div className="flex flex-wrap gap-2">{Object.entries(evaluation.recovery).map(([name, passed]) => <Badge key={name} tone={passed ? "healthy" : "critical"}>{name}: {passed ? "pass" : "FAIL"}</Badge>)}</div>
        <p className="text-xs text-muted">{evaluation.durationMs.toFixed(1)} ms local evaluation time; engine {evaluation.engine}. Failures: {evaluation.failures.join("; ") || "none in this fixture suite"}.</p>
        <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{["Held-out case", "Expected", "Computed", "Effect", "Check"].map(h => <th key={h} className="p-2 text-muted">{h}</th>)}</tr></thead><tbody>{evaluation.rows.map(row => <tr key={row.name} className="border-t border-border"><td className="p-2">{row.name}</td><td className="p-2">{row.expected}</td><td className="p-2"><DecisionBadge decision={row.actual} /></td><td className="p-2">{row.effect}</td><td className="p-2"><Badge tone={row.correct ? "healthy" : "critical"}>{row.correct ? "pass" : "FAIL"}</Badge></td></tr>)}</tbody></table></div>
      </> : <p className="text-sm text-muted">No measured results yet. Run the evaluation to populate metrics.</p>}
    </div></Panel>}
    {lastRun && <Effects run={lastRun} />}
    {selectedRun && <Panel className="p-4"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Saved evidence: {PROOF_NAMES[selectedRun.kind]}</h2><Button size="sm" onClick={() => setParams({ tab })}>Close snapshot</Button></div><Effects run={selectedRun} /><details className="mt-3 text-xs"><summary className="cursor-pointer text-accent">Immutable inputs, decisions, lineage and effect ledger</summary><pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded bg-bg p-3 text-[11px]">{JSON.stringify(selectedRun, null, 2)}</pre></details></Panel>}
    <ProofSummary />
    <Panel><PanelHeader title="Saved computed runs" description="Each execution has its own source/policy snapshot; edits leave prior evidence intact." /><div className="divide-y divide-border">{runs.length ? runs.slice(0, 15).map(run => <Link key={run.id} to={`/lab?tab=${run.kind}&run=${run.id}`} className="flex flex-wrap items-center justify-between gap-2 p-4 text-xs hover:bg-hover"><div><span className="font-medium">{PROOF_NAMES[run.kind]}</span><p className="mt-1 text-muted">{run.summary}</p></div><span className="text-accent">{new Date(run.at).toLocaleTimeString()} · View evidence →</span></Link>) : <p className="p-4 text-xs text-muted">No computed run history yet.</p>}</div></Panel>
    <p className="text-[11px] text-subtle">Local browser state; operator editable, without production tamper protection. New storage namespace driftveil-demo-v2 starts fresh; older scripted history is not migrated into measured runs. Supporting replay/decoy/integration screens remain illustrative.</p>
    </fieldset>
  </div>;
}
