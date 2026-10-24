import type { DemoState } from './demo';
import { recoveryFixture, traceExposure, type Artifact, type ProofRun } from './simulation';

export type NodeState = 'affected' | 'unresolved' | 'verified' | 'clean';
export function topology(artifacts: Artifact[], run?: ProofRun) {
  const exposure = traceExposure(artifacts);
  const verified = !!run?.effects.some(e => e.actionId === 'payment-repaired' && e.status === 'committed');
  return artifacts.map(artifact => ({ ...artifact, status: (
    exposure.unresolved.includes(artifact.id) ? 'unresolved' : exposure.affected.includes(artifact.id) ? 'affected'
      : verified && artifact.id.endsWith('rebuilt') ? 'verified' : 'clean'
  ) as NodeState }));
}

export function draftArtifacts(demo: DemoState): Artifact[] {
  return recoveryFixture(demo.branch).map(a => a.id === 'finance-memory' ? { ...a, complete: !demo.missingLineage } : a);
}

export function matchesOperation(run: ProofRun, demo: DemoState, options: { autoHold: boolean; reviewAt: number }) {
  const saved = run.input as {
    input?: unknown; envelope?: unknown; destination?: string; branch?: string; missingLineage?: boolean;
    options?: { autoHold?: boolean; reviewAt?: number; credentialMatch?: boolean; toolVersion?: number; documentAttack?: boolean; reference?: unknown; changeReference?: unknown };
  };
  if (JSON.stringify(saved.input) !== JSON.stringify(demo.input) || saved.options?.autoHold !== options.autoHold || saved.options?.reviewAt !== options.reviewAt) return false;
  if (run.kind === 'outcome') return saved.options.credentialMatch === demo.credentialMatch && saved.options.toolVersion === demo.toolVersion && (saved.options.reference === null) === demo.coldStart && !!saved.options.documentAttack === !!demo.documentAttack;
  if (run.kind === 'change') return JSON.stringify(saved.envelope) === JSON.stringify(demo.envelope) && saved.destination === demo.destination && JSON.stringify(saved.options.changeReference ?? null) === JSON.stringify(demo.changeReference);
  return saved.branch === demo.branch && saved.missingLineage === demo.missingLineage;
}
