import { Link } from "react-router-dom";
import { useStore } from "@/store/useStore";
import { PROOF_NAMES, PROOF_DESCRIPTIONS, type ProofKind } from "@/lib/simulation";
import { Badge, Panel, PanelHeader } from "./ui/primitives";

export function ProofSummary() {
  const runs = useStore(s => s.proofRuns);
  const evaluation = useStore(s => s.evaluation);
  return <Panel className="mb-5 border-accent/30">
    <PanelHeader title="DRIFTVEIL: computed core proofs" description="Computed results are separate from illustrative fleet history." actions={<Link to="/lab" className="text-xs text-accent hover:underline">Open Simulation Lab →</Link>} />
    <div className="grid gap-3 p-4 md:grid-cols-3">{(Object.keys(PROOF_NAMES) as ProofKind[]).map(kind => {
      const latest = runs.find(r => r.kind === kind);
      return <Link key={kind} to={latest ? `/lab?tab=${kind}&run=${latest.id}` : `/lab?tab=${kind}`} className="rounded-xl border border-border bg-bg p-4 hover:border-accent/50"><div className="mb-2 flex items-center justify-between gap-2"><span className="text-sm font-medium">{PROOF_NAMES[kind]}</span><Badge tone={latest ? "healthy" : "neutral"}>{runs.filter(r => r.kind === kind).length} runs</Badge></div><p className="text-xs leading-relaxed text-muted">{PROOF_DESCRIPTIONS[kind]}</p><p className="mt-2 text-xs leading-relaxed text-muted">{latest?.summary ?? "Run the interactive simulation to generate evidence."}</p></Link>;
    })}</div>
    {evaluation && <p className="border-t border-border px-4 py-3 text-xs text-muted">Measured synthetic suite: {evaluation.detected}/{evaluation.attacks} attack cases held; {evaluation.falseHolds}/{evaluation.benign} false holds; {evaluation.benignCompleted}/{evaluation.benign} benign effects completed. <Link to="/lab?tab=evaluation" className="text-accent hover:underline">Inspect cases and limitations →</Link></p>}
  </Panel>;
}
