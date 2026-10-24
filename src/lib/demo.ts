import { changeFixture, outcomeFixture, type Envelope, type OutcomeInput, type ProofRun, type Reference } from "./simulation";

export interface DemoState {
  id: string;
  input: OutcomeInput;
  history: (number | null)[];
  envelope: Envelope;
  destination: string;
  credentialMatch: boolean;
  toolVersion: number;
  coldStart: boolean;
  documentAttack?: boolean;
  branch: string;
  missingLineage: boolean;
  changeReference: Reference | null;
  reviewedRunId: string | null;
}

export function demoFixture(): DemoState {
  return { id: crypto.randomUUID(), input: { ...outcomeFixture(), selected: "atlas" }, history: [],
    envelope: { ...changeFixture(), approved: false }, destination: "finance.internal", credentialMatch: true,
    toolVersion: 1, coldStart: false, documentAttack: false, branch: "poisoned", missingLineage: false, changeReference: null, reviewedRunId: null };
}

export function demoProgress(runs: ProofRun[], reviewedRunId: string | null): boolean[] {
  return [true,
    runs.some(r => r.kind === "outcome" && r.effects.some(e => e.tool === "vendor.purchase" && e.status === "committed")),
    runs.some(r => r.id === reviewedRunId && r.assessments.some(a => a.decision !== "allow")),
    runs.some(r => r.kind === "change" && r.effects[0]?.status === "committed" && r.effects[1]?.status === "held"),
    runs.some(r => r.kind === "recovery" && r.effects.some(e => e.actionId === "payment-original" && e.status === "held") &&
      r.effects.some(e => e.actionId === "independent" && e.status === "committed") &&
      r.effects.some(e => e.actionId === "payment-repaired" && e.status === "committed") && r.effects.at(-1)?.status === "duplicate")];
}
