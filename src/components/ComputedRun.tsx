import { DecisionBadge, SignalBreakdown } from "@/components/domain";
import { Badge, Panel, PanelHeader } from "@/components/ui/primitives";
import type { Assessment, ProofRun } from "@/lib/simulation";

const ACTION_NAMES: Record<string, string> = {
  "suppliers.read": "Read supplier offers", "vendor.purchase": "Place purchase", "payment.schedule": "Schedule payment",
  "payment.commit": "Send payment", "bank.export": "Export bank records", "hr.salary.read": "Read HR salary records",
};
const ACTION_LABELS: Record<string, string> = {
  "payment-original": "Original payment", "payment-repaired": "Rebuilt payment", independent: "Independent purchase", "repair-read": "Read trusted records",
};
const EFFECT_LABELS = { held: "Held", committed: "Completed", duplicate: "No extra effect" };

export function Finding({ value }: { value: Assessment }) {
  return <div className="rounded-xl border border-border bg-bg p-4" aria-live="polite">
    <div className="flex flex-wrap items-center gap-3"><DecisionBadge decision={value.decision} /><span className="text-sm">Risk {value.score}/100</span><Badge>{{ base: "Existing permission", "approved delta": "Approved change", outside: "Outside permissions" }[value.scope]}</Badge></div>
    <p className="mt-3 text-base leading-relaxed">{value.reasons[0]}</p>
    {value.reasons.length > 1 && <details className="mt-3 text-sm"><summary className="cursor-pointer text-accent">All policy reasons ({value.reasons.length})</summary><ul className="mt-3 list-disc space-y-2 pl-4 text-muted">{value.reasons.slice(1).map((reason, i) => <li key={i}>{reason}</li>)}</ul></details>}
    <p className="mt-3 text-xs text-muted">Risk is a heuristic score, not a probability.</p>
    <details className="mt-3 text-xs"><summary className="cursor-pointer text-accent">Calculated signal contributions</summary><div className="mt-3"><SignalBreakdown signals={value.signals} /></div></details>
  </div>;
}
export function Effects({ run }: { run: ProofRun }) {
  const title = run.kind === "outcome" ? run.effects.at(-1)?.status === "committed" ? "Purchase completed" : "Purchase held"
    : run.kind === "change" ? "Change check results" : "Recovery results";
  return <Panel className="mt-4">
    <PanelHeader title={title} actions={<Badge>Calculated result</Badge>} />
    <ul className="divide-y divide-border">{run.effects.map((effect, i) => <li key={i} className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-medium">{ACTION_LABELS[effect.actionId] ?? ACTION_NAMES[effect.tool] ?? effect.tool}{run.effects.slice(0, i).some(e => e.actionId === effect.actionId) ? " (retry)" : ""}</span><Badge tone={effect.status === "held" ? "warning" : "healthy"}>{EFFECT_LABELS[effect.status]}</Badge></div>
      <p className="text-sm leading-relaxed text-muted">{effect.reasons[0]}</p>
    </li>)}</ul>
    <details className="border-t border-border p-4 text-xs"><summary className="cursor-pointer text-muted">Execution context</summary><div className="mt-3 space-y-2 leading-relaxed text-muted"><p>{run.execution === "api" ? "Server API" : "Local browser"} · {run.ledger.length} mock commits.</p><p>{run.summary}</p><p>Held actions return no data or payment/export effect. Duplicate retries add no effect.</p></div></details>
    <p className="px-4 pb-4 text-xs text-muted">Simulated effects. No real purchase or payment is made.</p>
  </Panel>;
}
