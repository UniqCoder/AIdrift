import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Check, Download, Play, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/domain";
import { Effects, Finding } from "@/components/ComputedRun";
import { Badge, Input, Panel } from "@/components/ui/primitives";
import { Button, buttonVariants } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import { demoProgress } from "@/lib/demo";
import {
  ENGINE_VERSION, PROOF_NAMES, PROOF_DESCRIPTIONS, learnReference, outcomeFixture,
  traceExposure, validateOutcome, type OutcomeInput, type ProofRun,
} from "@/lib/simulation";
import { simulationClient, executionLocation, useSimulationAction } from "@/lib/simulationClient";
import { cn, downloadFile, fmtDateTime } from "@/lib/utils";

const STEPS = ["Task & permissions", "Run & test", "Investigate", "Approve change", "Recover work", "Evidence & report"];
const money = (value: number | null) => value === null ? "Unavailable" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value / 100);
const selectClass = "h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg";
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex min-w-0 flex-col gap-2 text-xs text-muted"><span>{label}</span>{children}</label>;
}
function NumberField({ label, value, onChange, min = 0, max, step = 1 }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number }) {
  return <Field label={label}><Input className="h-10" type="number" min={min} max={max} step={step} value={Number.isFinite(value) ? value : ""} onChange={e => onChange(e.target.value === "" ? NaN : Number(e.target.value))} /></Field>;
}

export default function Demo() {
  const [params, setParams] = useSearchParams();
  const { busy, error, perform } = useSimulationAction();
  const requested = Number(params.get("step") ?? 0);
  const step = Number.isInteger(requested) && requested >= 0 && requested < STEPS.length ? requested : 0;
  const demo = useStore(s => s.demo);
  const update = useStore(s => s.updateDemo);
  const allRuns = useStore(s => s.proofRuns);
  const record = useStore(s => s.recordProofRun);
  const settings = useStore(s => s.settings);
  const updateSettings = useStore(s => s.updateSettings);
  const evaluation = useStore(s => s.evaluation);
  const setEvaluation = useStore(s => s.setEvaluation);
  const incidents = useStore(s => s.incidents);
  const [selectedReview, setSelectedReview] = useState<string | null>(null);
  const [referenceMessage, setReferenceMessage] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  useEffect(() => setReferenceMessage(""), [demo.envelope, demo.destination, demo.input]);
  useEffect(() => {
    if (previousStep.current !== step) heading.current?.focus();
    previousStep.current = step;
  }, [step]);
  const runs = allRuns.filter(r => r.workflowId === demo.id);
  const latest = (kind: ProofRun["kind"]) => runs.find(r => r.kind === kind);
  const outcomeRun = latest("outcome");
  const changeRun = latest("change");
  const recoveryRun = latest("recovery");
  const findings = runs.filter(r => r.assessments.some(a => a.decision !== "allow"));
  const review = findings.find(r => r.id === selectedReview) ?? findings.find(r => r.kind === "outcome") ?? findings[0];
  const progress = demoProgress(runs, demo.reviewedRunId);
  const options = { autoHold: settings.autoContain, reviewAt: settings.thresholds.stepUp };
  const input = demo.input;
  const outcome = validateOutcome(input);
  const ref = learnReference();
  const edit = (next: OutcomeInput) => update({ input: next, history: [], changeReference: null });
  const save = (run: ProofRun) => record({ ...run, workflowId: demo.id });
  const next = (target: number, label: string) => <Link className={cn(buttonVariants({ variant: "primary", size: "lg" }), "h-auto min-h-10 whitespace-normal text-center")} to={`/demo?step=${target}`}>{label}<ArrowRight aria-hidden="true" /></Link>;
  const sameInput = (run: ProofRun) => JSON.stringify((run.input as { input?: OutcomeInput }).input) === JSON.stringify(input);
  const matchesDraft = (run: ProofRun) => {
    const saved = run.input as { envelope?: unknown; destination?: string; branch?: string; missingLineage?: boolean; options?: { autoHold?: boolean; reviewAt?: number; credentialMatch?: boolean; toolVersion?: number; reference?: unknown; changeReference?: unknown } };
    if (!sameInput(run) || saved.options?.autoHold !== options.autoHold || saved.options?.reviewAt !== options.reviewAt) return false;
    if (run.kind === "outcome") return saved.options.credentialMatch === demo.credentialMatch && saved.options.toolVersion === demo.toolVersion && (saved.options.reference === null) === demo.coldStart;
    if (run.kind === "change") return JSON.stringify(saved.envelope) === JSON.stringify(demo.envelope) && saved.destination === demo.destination && JSON.stringify(saved.options.changeReference ?? null) === JSON.stringify(demo.changeReference);
    return saved.branch === demo.branch && saved.missingLineage === demo.missingLineage;
  };
  const result = (run: ProofRun | undefined) => run ? <section className="space-y-3" aria-label="Saved execution result" aria-live="polite">
    <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">Saved execution · {fmtDateTime(run.at)}</h3><Badge tone="healthy">Computed</Badge></div>
    {!matchesDraft(run) && <p className="rounded-lg border border-warning/30 bg-warning-soft p-3 text-xs text-warning">Inputs or controls changed since this execution. Run it again to check the current draft. This saved result keeps the original task, authority and source values.</p>}
    <Effects run={run} />
    <details className="rounded-lg border border-border p-3 text-xs"><summary className="cursor-pointer text-accent">Why each decision was made</summary><div className="mt-3 space-y-3">{run.assessments.map((a, i) => <div key={i}><p className="mb-2 font-medium">{run.effects[i].tool} · reference {a.referenceId ?? "unavailable"}</p><Finding value={a} /></div>)}</div></details>
    <details className="text-xs"><summary className="cursor-pointer text-muted">Exact inputs, source versions and receipts</summary><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-bg p-3">{JSON.stringify(run, null, 2)}</pre></details>
  </section> : <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">No execution yet. Use the action above to calculate and save a result.</p>;
  const exportEvidence = () => downloadFile(`driftveil-workflow-${demo.id.slice(0, 8)}.json`, JSON.stringify({
    synthetic: true, evidenceType: "computed", engine: ENGINE_VERSION, workflowId: demo.id,
    currentDraft: demo, completedChecks: progress, runs,
    incidents: incidents.filter(i => runs.some(r => `DV-${r.id.slice(0, 8)}` === i.id)), evaluation,
    limits: "Synthetic proposals and records; calculated decisions. Run-local ledgers. No real company, payment system or authenticated approval service is connected.",
  }, null, 2));

  return <div className="mx-auto max-w-6xl space-y-6" aria-busy={busy}>
    {busy && <p role="status" className="sticky top-16 z-30 rounded-lg border border-accent/30 bg-accent-soft p-4 text-sm">Running the calculation. Please wait for the result.</p>}
    {error && <p role="alert" className="sticky top-16 z-30 rounded-lg border border-critical/30 bg-critical-soft p-4 text-sm text-critical">{error}</p>}
    <fieldset disabled={busy} className="min-w-0 space-y-6">
    <PageHeader title="Protect an agent workflow" description="Follow one purchase from its business task to a verified recovery. You act as the agent owner and security reviewer." meta={<><Badge tone="accent">Interactive synthetic enterprise</Badge><Badge>{executionLocation}</Badge></>} actions={<Link className={buttonVariants({ size: "sm" })} to="/lab">Open advanced lab</Link>} />
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <p className="text-sm leading-relaxed">A procurement agent chooses a supplier. A finance agent schedules payment. DRIFTVEIL checks their permissions, business decisions and inherited records before allowing a mock action.</p>
      <p className="mt-2 text-xs leading-relaxed text-muted">Supplier records, agents and approvals are simulated. Decisions, holds, dependency checks and recovery are calculated when you run them. No external systems are connected.</p>
    </div>
    <div className="grid gap-4 md:grid-cols-3">{(["outcome", "change", "recovery"] as const).map(kind => <div key={kind} className="border-l-2 border-accent pl-4"><h2 className="text-sm font-semibold">{PROOF_NAMES[kind]}</h2><p className="mt-2 text-xs leading-relaxed text-muted">{PROOF_DESCRIPTIONS[kind]}</p></div>)}</div>
    <nav aria-label="Workflow steps"><ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">{STEPS.map((label, i) => <li key={label}><Link to={`/demo?step=${i}`} aria-current={step === i ? "step" : undefined} className={cn("flex h-full min-h-16 items-center gap-2 rounded-lg border p-3 text-xs transition-colors hover:border-accent", step === i ? "border-accent bg-accent-soft text-fg" : "border-border bg-surface text-muted")}><span className={cn("grid size-6 shrink-0 place-items-center rounded-full border text-xs", progress[i] ? "border-healthy/40 text-healthy" : "border-border")}>{progress[i] ? <Check className="size-3.5" aria-label="Completed" /> : i + 1}</span><span>{label}</span></Link></li>)}</ol></nav>
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-4">
      <h2 ref={heading} tabIndex={-1} className="scroll-mt-20 text-xl font-semibold">{step + 1}. {STEPS[step]}</h2>
      <p className="text-xs text-muted">Case {demo.id.slice(0, 8)} · {input.task.quantity} units · due in {input.task.deadline} days</p>
    </div>

    {step === 0 && <>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Panel className="space-y-5 p-5"><div><h3 className="font-semibold">Give the agent a clear business task</h3><p className="mt-2 text-sm text-muted">Buy qualified components at the lowest total cost that meets your deadline. These constraints are enforced on every purchase and payment.</p></div>
          <div className="grid grid-cols-2 gap-4">
            <NumberField label="Units to purchase" value={input.task.quantity} min={1} onChange={quantity => edit({ ...input, task: { ...input.task, quantity } })} />
            <NumberField label="Delivery deadline (days)" value={input.task.deadline} onChange={deadline => edit({ ...input, task: { ...input.task, deadline } })} />
            <NumberField label="Minimum supplier quality (0–100)" value={input.task.minQuality} max={100} onChange={minQuality => edit({ ...input, task: { ...input.task, minQuality } })} />
            <NumberField label="Maximum relative cost gap (%)" value={input.task.tolerance * 100} max={100} step={0.1} onChange={n => edit({ ...input, task: { ...input.task, tolerance: n / 100 } })} />
          </div>
          {!outcome.valid && <p role="alert" className="text-sm text-warning">{outcome.reasons.join(" ")} Correct these values before expecting a permitted effect.</p>}
          <p className="text-xs text-muted">A 10% tolerance permits a small gap; repeated deterioration can still trigger a behavioral restriction. Prices use paise so money arithmetic stays exact.</p>
        </Panel>
        <Panel className="space-y-4 p-5"><h3 className="font-semibold">Who can do what?</h3><dl className="space-y-4 text-sm">
          <div><dt className="font-medium">Procurement · contract v1</dt><dd className="mt-1 text-muted">Read suppliers and buy qualified components within this task. A valid token alone cannot authorize a bad purchase.</dd></div>
          <div><dt className="font-medium">Finance · contract v1 → v2</dt><dd className="mt-1 text-muted">Commit a validated payment. Scheduling needs a separate, scoped approval in step 4. Exporting bank records is prohibited.</dd></div>
          <div><dt className="font-medium">Learned procurement reference</dt><dd className="mt-1 text-muted">{ref.samples} approved synthetic purchases and {ref.transitionSamples} observed tool transitions. Mean cost loss {(ref.mean * 100).toFixed(3)}%. New roles or tasks show missing behavioral history explicitly.</dd></div>
        </dl><details className="text-xs"><summary className="cursor-pointer text-accent">Inspect the learned reference</summary><pre className="mt-3 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(ref, null, 2)}</pre></details></Panel>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted">Next, run a normal purchase before trying failures.</p>{next(1, "Run the purchase")}</div>
    </>}

    {step === 1 && <>
      <div><h3 className="font-semibold">Choose a supplier, then check the actual effect</h3><p className="mt-2 text-sm text-muted">Start with the economical choice. Then select Beacon to test a costly choice with the same valid credentials. Edit any offer and run again.</p></div>
      <Panel className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-xs"><caption className="sr-only">Editable trusted synthetic supplier offers</caption><thead className="border-b border-border bg-bg"><tr>{["Supplier", "Unit price (paise)", "Days", "Quality", "Eligible"].map(h => <th scope="col" className="p-3 font-medium" key={h}>{h}</th>)}</tr></thead><tbody>{input.suppliers.map((s, i) => {
        const change = (patch: Partial<typeof s>) => edit({ ...input, suppliers: input.suppliers.map((v, j) => i === j ? { ...v, ...patch, version: v.version + 1 } : v) });
        return <tr key={s.id} className="border-b border-border last:border-0"><th scope="row" className="p-3 font-medium">{s.name}<span className="mt-1 block font-normal text-muted">{money(s.price)} / unit · source v{s.version}</span></th>{([ ["price", "unit price in paise"], ["days", "delivery days"], ["quality", "quality"] ] as const).map(([key, label]) => <td key={key} className="p-3"><Input className="min-w-20" type="number" min={0} max={key === "quality" ? 100 : undefined} aria-label={`${s.name} ${label}`} value={Number.isFinite(s[key]) ? s[key] : ""} onChange={e => change({ [key]: e.target.value === "" ? NaN : Number(e.target.value) })} /></td>)}<td className="p-3"><input className="size-4" aria-label={`${s.name} eligible`} type="checkbox" checked={s.eligible} onChange={e => change({ eligible: e.target.checked })} /></td></tr>;
      })}</tbody></table></div></Panel>
      <div className="grid gap-5 lg:grid-cols-2"><Panel className="space-y-4 p-5">
        <Field label="Agent's proposed supplier"><select className={selectClass} value={input.selected} onChange={e => edit({ ...input, selected: e.target.value })}>{input.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <div className="flex flex-wrap gap-2"><Button onClick={() => { const nextInput = outcomeFixture(); nextInput.selected = "atlas"; edit(nextInput); update({ credentialMatch: true, toolVersion: 1, coldStart: false }); }}>Normal purchase</Button><Button onClick={() => { const nextInput = outcomeFixture(); nextInput.task.deadline = 2; nextInput.task.family = "urgent"; edit(nextInput); update({ credentialMatch: true, toolVersion: 1, coldStart: false }); }}>Valid urgent purchase</Button><Button onClick={() => { const nextInput = outcomeFixture(); nextInput.suppliers[1].price = 10300; edit(nextInput); update({ credentialMatch: true, toolVersion: 1, coldStart: false }); }}>Repeated 3% loss</Button></div>
        <details className="rounded-lg border border-border p-3 text-sm"><summary className="cursor-pointer font-medium">Test credentials, tools & cold start</summary><div className="mt-4 space-y-3 text-xs text-muted">
          <label className="flex items-start gap-2"><input type="checkbox" checked={!demo.credentialMatch} onChange={e => update({ credentialMatch: !e.target.checked, history: [] })} />Valid token used without a matching execution receipt</label>
          <label className="flex items-start gap-2"><input type="checkbox" checked={demo.toolVersion === 2} onChange={e => update({ toolVersion: e.target.checked ? 2 : 1, history: [] })} />Purchase tool changed to an unapproved manifest version</label>
          <label className="flex items-start gap-2"><input type="checkbox" checked={demo.coldStart} onChange={e => update({ coldStart: e.target.checked, history: [] })} />New agent history: no learned behavioral reference</label>
          <p>Cold start removes behavioral confidence. Business constraints, credential binding and permission checks still apply.</p>
        </div></details>
        <Button className="min-h-10" variant="primary" onClick={() => perform(async () => { const run = await simulationClient.outcome(input, demo.history, { ...options, credentialMatch: demo.credentialMatch, toolVersion: demo.toolVersion, ...(demo.coldStart ? { reference: null } : {}) }); save(run); const evaluated = run.assessments.at(-1)?.outcome; if (evaluated?.valid) update({ history: [...demo.history, evaluated.loss] }); })}><Play aria-hidden="true" />Evaluate & execute purchase</Button>
      </Panel><Panel className="space-y-4 p-5"><h3 className="font-semibold">Current business check · preview</h3><dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-muted">Best qualified total</dt><dd className="mt-1 text-lg font-semibold">{money(outcome.optimum)}</dd></div><div><dt className="text-muted">Proposed total</dt><dd className="mt-1 text-lg font-semibold">{money(outcome.chosenCost)}</dd></div><div><dt className="text-muted">Cost gap</dt><dd className="mt-1">{outcome.loss === null ? "Absolute limit applies" : `${(outcome.loss * 100).toFixed(2)}%`}</dd></div><div><dt className="text-muted">Decision windows</dt><dd className="mt-1">{demo.history.length} executed</dd></div></dl><p className="text-sm text-muted">{outcome.reasons.join(" ")}</p><p className="text-xs text-muted">This previews the business constraint only. Execution also checks permissions, credentials, tools and cumulative behavior. Edits start a new decision stream and retain saved evidence.</p></Panel></div>
      {result(outcomeRun)}
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-2xl text-sm text-muted">{outcomeRun?.effects.at(-1)?.status === "held" ? "The action is held before its effect. Next, inspect the reasons and affected scope." : "After a normal purchase, choose Beacon or test a credential mismatch to create a finding. Then investigate it."}</p>{next(2, "Investigate the finding")}</div>
    </>}

    {step === 2 && <>
      <div><h3 className="font-semibold">Understand the finding before changing anything</h3><p className="mt-2 text-sm text-muted">A hold affects the evaluated action. It does not prove malicious intent or stop every agent. Inspect the evidence and record your review.</p></div>
      {review ? <>
        <Field label="Finding to investigate"><select className={selectClass} value={review.id} onChange={e => setSelectedReview(e.target.value)}>{findings.map(r => <option key={r.id} value={r.id}>{fmtDateTime(r.at)} · {r.summary}</option>)}</select></Field>
        {result(review)}
        <Panel className="space-y-3 p-5"><h3 className="font-semibold">Your next action</h3><p className="text-sm text-muted">Correct an inappropriate purchase or a broken execution binding at its source. If the task legitimately needs a new permission, approve only that permission in the next step. Recalled records require verified recovery.</p><div className="flex flex-wrap gap-3"><Button onClick={() => update({ reviewedRunId: review.id })} disabled={demo.reviewedRunId === review.id}><Check aria-hidden="true" />{demo.reviewedRunId === review.id ? "Review recorded" : "Record evidence review"}</Button><Link className={buttonVariants()} to={`/incidents/DV-${review.id.slice(0, 8)}`}>Open incident & add notes</Link><Link className={buttonVariants()} to="/demo?step=1">Correct task or credentials</Link></div><p className="text-xs text-muted">Recording a review or closing an incident cannot release a held payment. A fresh execution must pass current policy.</p></Panel>
      </> : <Panel className="space-y-4 p-5"><p className="text-sm text-muted">No held action in this case yet. Run a costly purchase or a credential mismatch to produce computed evidence.</p>{next(1, "Test a held action")}</Panel>}
      <div className="flex justify-end">{next(3, "Review a legitimate change")}</div>
    </>}

    {step === 3 && <>
      <div><h3 className="font-semibold">Let finance schedule a payment without widening everything</h3><p className="mt-2 text-sm text-muted">Use the same supplier task from step 2. With approval pending, scheduling is held. Approve the exact change and run it again. The simultaneous bank-record export must remain held.</p></div>
      {outcome.hardViolation && <div role="alert" className="space-y-3 rounded-lg border border-warning/30 bg-warning-soft p-4 text-sm text-warning"><p>This purchase still fails its business constraints. Correct it before expecting scheduling or recovery to complete.</p>{outcome.best.length > 0 ? <Button onClick={() => edit({ ...input, selected: outcome.best[0] })}>Use the best qualified supplier</Button> : next(1, "Correct the purchase")}</div>}
      <div className="grid gap-5 lg:grid-cols-2"><Panel className="space-y-4 p-5"><h3 className="font-semibold">Synthetic approval · finance contract v1 → v2</h3>
        <Field label="Approved scheduling destination"><Input value={demo.envelope.scope.destination} onChange={e => { update({ envelope: { ...demo.envelope, scope: { ...demo.envelope.scope, destination: e.target.value } }, changeReference: null }); setReferenceMessage(""); }} /></Field>
        <Field label="Approved task family"><select className={selectClass} value={demo.envelope.scope.taskFamily} onChange={e => update({ envelope: { ...demo.envelope, scope: { ...demo.envelope.scope, taskFamily: e.target.value } }, changeReference: null })}><option value="standard">Standard procurement</option><option value="urgent">Urgent procurement</option></select></Field>
        <Field label="Actual scheduling destination"><Input value={demo.destination} onChange={e => update({ destination: e.target.value })} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={demo.envelope.approved} onChange={e => update({ envelope: { ...demo.envelope, approved: e.target.checked }, changeReference: null })} />Approve payment scheduling for this scope</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={demo.envelope.effective} onChange={e => update({ envelope: { ...demo.envelope, effective: e.target.checked }, changeReference: null })} />Approval effective now</label>
        <p className="text-xs text-muted">Only payment.schedule on payment-queue for finance-agent is added. Existing prohibitions and the procurement reference stay in place. Approval is an operator control in this simulation.</p>
        <Button variant="primary" className="min-h-10" onClick={() => perform(async () => save(await simulationClient.change(demo.envelope, demo.destination, { ...options, changeReference: demo.changeReference }, input)))}><Play aria-hidden="true" />Check scheduling & bank export</Button>
      </Panel><Panel className="space-y-4 p-5"><h3 className="font-semibold">Learn the changed behavior cautiously</h3><p className="text-sm text-muted">Permission approval is separate from behavioral learning. Collect three permitted scheduling traces, then check a fourth trace before promoting a reference for that exact scope.</p><Button onClick={() => perform(async () => {
        const candidate = await simulationClient.reference(demo.envelope, demo.destination, options, input);
        candidate.runs.forEach(save);
        update({ changeReference: candidate.reference }); setReferenceMessage(candidate.reasons.join(" "));
      })}>Collect & validate scheduling reference</Button><p role="status" className="text-sm text-muted">{referenceMessage || (demo.changeReference ? `Promoted: ${demo.changeReference.id}. Three learning samples and one validation sample; synthetic deterministic runs.` : "No promoted finance reference. Hard policy remains active with behavioral confidence unavailable.")}</p><p className="text-xs text-muted">Only permitted scheduling actions enter this candidate. The held export is excluded. These deterministic samples demonstrate the governance steps; they are not independent real-agent sessions.</p></Panel></div>
      {result(changeRun)}
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted">Next, see how a contaminated source affects pending work across both agents.</p>{next(4, "Trace & recover affected work")}</div>
    </>}

    {step === 4 && <>
      <div><h3 className="font-semibold">Recall the source, preserve evidence, rebuild a safe path</h3><p className="mt-2 text-sm text-muted">A supplier PDF fed a procurement summary, finance memory and a pending payment. Recall must reach those descendants. An independent order uses separate trusted records.</p></div>
      <Panel className="space-y-4 p-5"><Field label="Source used by the procurement summary in a fresh fixture"><select className={selectClass} value={demo.branch} onChange={e => update({ branch: e.target.value })}><option value="poisoned">Contaminated supplier PDF</option><option value="trusted">Trusted supplier records (negative control)</option></select></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={demo.missingLineage} onChange={e => update({ missingLineage: e.target.checked })} />Finance memory has incomplete provenance</label>
        <div className="flex flex-wrap gap-3"><Button className="min-h-10" onClick={() => perform(async () => save(await simulationClient.recovery(demo.branch, demo.missingLineage, false, options, input)))}>Recall & check pending effects</Button><Button variant="primary" className="min-h-10" onClick={() => perform(async () => save(await simulationClient.recovery(demo.branch, demo.missingLineage, true, options, input)))}><Play aria-hidden="true" />Rebuild & verify recovery</Button></div>
        <p className="text-xs text-muted">Each check uses a fresh sandbox. Source edits never erase earlier contamination. Rebuilding must pass the same current business, authority and lineage checks; missing provenance prevents verified release.</p>
      </Panel>
      {recoveryRun?.artifacts && <Panel className="space-y-4 p-5"><h3 className="font-semibold">Recorded source → derived work</h3><ol className="space-y-2">{recoveryRun.artifacts.map(a => { const exposure = traceExposure(recoveryRun.artifacts!); const state = exposure.unresolved.includes(a.id) ? "Unresolved" : exposure.affected.includes(a.id) ? "Recalled" : "Clean path"; return <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-xs"><div className="min-w-0 break-words"><p className="font-medium">{a.id}</p><p className="mt-1 text-muted">{a.parents.length ? a.parents.join(" + ") : "Source record"} → {a.id} · v{a.version}</p></div><Badge tone={state === "Clean path" ? "healthy" : "warning"}>{state}</Badge></li>; })}</ol></Panel>}
      {result(recoveryRun)}
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-2xl text-sm text-muted">Recovery succeeds only when the new payment commits once and its retry adds no effect. The original evidence remains held. External payments already sent cannot be undone here.</p>{next(5, "Review & export the evidence")}</div>
    </>}

    {step === 5 && <>
      <div><h3 className="font-semibold">What did this case actually demonstrate?</h3><p className="mt-2 text-sm text-muted">Completion comes from your saved effects and review, not from visiting a page. Missing checks stay visible.</p></div>
      <Panel className="divide-y divide-border">{["Task and role permissions are visible", "A legitimate purchase completed", "A held action was investigated", "Scoped scheduling completed while export stayed held", "Affected work was held; independent and repaired work completed"].map((label, i) => <div key={label} className="flex items-center justify-between gap-3 p-4 text-sm"><span>{label}</span><Badge tone={progress[i] ? "healthy" : "warning"}>{progress[i] ? "Recorded" : "Not yet demonstrated"}</Badge></div>)}</Panel>
      <Panel className="space-y-4 p-5"><h3 className="font-semibold">Run the separate controlled evaluation</h3><p className="text-sm text-muted">The fixture suite includes benign actions, violations, gradual drift, a stable stream and recovery assertions. These suite results are separate from the case you just ran.</p><Button onClick={() => perform(async () => setEvaluation(await simulationClient.evaluation()))}>Run evaluation checks</Button>{evaluation && <div role="status" className="space-y-2 text-sm"><p>{evaluation.detected}/{evaluation.attacks} violation cases held · {evaluation.falseHolds}/{evaluation.benign} false holds · {evaluation.benignCompleted}/{evaluation.benign} benign actions completed.</p><p className="text-muted">First slow-drift restriction: window {evaluation.stream.alertWindow ?? "not detected"}; stable-stream restriction: {evaluation.stream.benignAlertWindow ?? "none"}. Failures: {evaluation.failures.join("; ") || "none in this suite"}.</p><Link to="/lab?tab=evaluation" className="text-accent hover:underline">Inspect every case, denominator and comparator</Link></div>}</Panel>
      <div className="flex flex-wrap gap-3"><Button variant="primary" className="min-h-10" onClick={exportEvidence} disabled={!runs.length}><Download aria-hidden="true" />Export this workflow evidence</Button><Link className={buttonVariants()} to="/reports">Open reports</Link><Button onClick={() => { useStore.getState().newDemo(); setSelectedReview(null); setReferenceMessage(""); setParams({ step: "0" }); }}><RotateCcw aria-hidden="true" />Start another case</Button></div>
      <p className="text-xs text-muted">Starting another case preserves all saved runs and incidents. Exported evidence includes original inputs, versions, explanations, lineage, effects and the current draft separately. Browser storage and mock receipts are operator editable.</p>
      <details className="rounded-xl border border-border p-5 text-sm"><summary className="cursor-pointer font-medium">Coverage & remaining boundaries</summary><div className="mt-4 space-y-3 text-muted"><p>This journey executes business-outcome checks, role/task policy, learned statistics, credential reconciliation, tool manifest checks, cold-start handling, scoped restriction, change approval, reference validation, descendant recall, reconstruction, stale-state checks and duplicate prevention.</p><p>Advanced Lab exposes more scope and numeric controls. Fleet analytics, counterfactual replay, decoys and integrations in the illustrative workspace are presentation fixtures. Real agents, authenticated approvals, protected enforcement and durable audit storage are future work.</p><p>Full adaptation/recovery baseline comparisons, enterprise-scale measurements and real-agent security accuracy have not been established. The report must not imply they have.</p></div></details>
    </>}

    <details className="border-t border-border pt-4 text-xs"><summary className="cursor-pointer text-muted">Behavioral response settings</summary><div className="mt-4 space-y-3"><label className="flex items-center gap-2"><input type="checkbox" checked={settings.autoContain} onChange={e => updateSettings({ autoContain: e.target.checked })} />Automatically restrict behavioral anomalies</label><p className="text-muted">Behavioral review threshold: {settings.thresholds.stepUp}/100. Mandatory role, credential, business and provenance holds always apply. Risk scores are heuristics, not compromise probabilities. <Link className="text-accent hover:underline" to="/settings">Change workspace settings</Link></p></div></details>
    </fieldset>
  </div>;
}
