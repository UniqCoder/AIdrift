import { DecisionBadge, SignalBreakdown } from "@/components/domain";
import { Badge, Panel, PanelHeader } from "@/components/ui/primitives";
import type { Assessment, ProofRun } from "@/lib/simulation";

const ACTION_NAMES: Record<string, string> = {
  "suppliers.read": "Read supplier offers", "vendor.purchase": "Place purchase", "payment.schedule": "Schedule payment",
  "payment.commit": "Send payment", "bank.export": "Export bank records",
};

export function Finding({ value }: { value: Assessment }) {
  return <div className="rounded-xl border border-border bg-bg p-4" aria-live="polite">
    <div className="flex flex-wrap items-center gap-3"><DecisionBadge decision={value.decision} /><span className="text-sm">Risk {value.score}/100</span><Badge>{value.scope}</Badge></div>
    <ul className="mt-3 list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted">{value.reasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul>
    <p className="mt-3 text-[11px] text-subtle">Heuristic score, not a probability. Hard policy gates apply independently.</p>
    <details className="mt-3 text-xs"><summary className="cursor-pointer text-accent">Calculated signal contributions</summary><div className="mt-3"><SignalBreakdown signals={value.signals} /></div></details>
  </div>;
}
export function Effects({ run }: { run: ProofRun }) {
  return <Panel className="mt-4">
    <PanelHeader title="Executed mock effects" actions={<><Badge>{run.execution === "api" ? "Server API" : "Local browser"}</Badge><Badge tone="healthy">Computed snapshot</Badge></>} />
    <p className="px-4 pb-3 text-xs text-muted">{run.summary}</p>
    <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-y border-border text-muted"><tr>{["Action", "Decision", "Effect", "Reason"].map(h => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr></thead>
      <tbody>{run.effects.map((effect, i) => <tr key={i} className="border-b border-border last:border-0"><td className="px-4 py-3">{ACTION_NAMES[effect.tool] ?? effect.tool}<span className="block font-mono text-[10px] text-subtle">{effect.tool} · {effect.actionId}</span></td><td className="px-4 py-3"><DecisionBadge decision={effect.decision} /></td><td className="px-4 py-3"><Badge tone={effect.status === "held" ? "warning" : "healthy"}>{effect.status}</Badge></td><td className="min-w-64 px-4 py-3 text-muted">{effect.reasons[0]}</td></tr>)}</tbody>
    </table></div>
    <p className="p-4 text-xs text-muted">{run.ledger.length} mock commits in this sandbox. Held actions return no data or payment/export effect; duplicate retries add no effect.</p>
  </Panel>;
}
