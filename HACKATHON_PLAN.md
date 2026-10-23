# DRIFTVEIL implementation companion

Updated: 22 October 2026. The three-USP simulation is now implemented in the existing frontend. Core calculations, mock policy/effect gates, dependency recovery and a fixed-seed evaluation run locally without new dependencies. Production integration and scale validation remain future work.

The authoritative scope is [the DRIFTVEIL PRD](02_DRIFTVEIL_Final_Product_Requirements_Document.md). The [research review](DRIFTVEIL_USP_REVIEW.md) retains prior-art evidence and falsifiers. The PRD takes precedence over earlier planning suggestions, including the previous main-demo emphasis and real-agent prerequisites.

## Agreed scope

1. **OutcomeGuard (centerpiece):** trusted synthetic suppliers and task constraints; deterministic feasible-choice/loss validator; learned benign reference and repeated-loss monitoring.
2. **DriftGate:** versioned Role Contracts; exact approved delta; untouched dimensions remain protected; no automatic whole-profile reset.
3. **ChainRestore:** recorded dependencies; source recall; affected actions held; current-state checks and trusted recomputation; independent task completion.

Role Contracts, risk explanations, credential reconciliation, data-flow checks, Ghost Replay, and selective containment support these mechanisms. Critical-path scheduling is a possible later efficiency optimization. No real agent, model training, production authentication, database server, or new service is required for this PoC.

## Implementation order and reach

| Phase | Work | Existing files/consumers to inspect | Exit check |
|---|---|---|---|
| 1 | Typed trusted task/offer/action records; shared policy evaluator; controlled mock effect ledger | `src/data/types.ts`, `agents.ts`, `scenarios.ts`, `seed.ts`, `src/lib/risk.ts`, `src/store/useStore.ts` | Policy depends on inputs; denied effects never execute; valid task completes |
| 2 | Outcome witness, benign loss/transition reference, cumulative drift | Small calculation/trace modules as needed; store; `Lab.tsx`, `Drift.tsx`, `AgentDetail.tsx`, shared chart/inspector components | Supplier/deadline edits recompute; urgent valid choice passes; repeated loss is calculated |
| 3 | Contract version and bounded-envelope approval logic | Store; `Contracts.tsx`, `Changes.tsx`, `Settings.tsx`, relevant types/fixtures | Approved scheduling works in scope; unrelated export stays held; no legitimate-scenario bypass |
| 4 | Dependency recall, current authority, recovery recomputation/assertions | Store; lineage/provenance graphs; `Containment.tsx`, incident detail; action/receipt/effect records | Affected payment stays held; regenerated clean output and independent task complete |
| 5 | DRIFTVEIL branding, input editors, consistent run evidence, supporting controls | `index.html`, app/layout/Sigil text as applicable; `Dashboard.tsx`, `Lab.tsx`, `Incidents.tsx`, `Analytics.tsx`, `Activity.tsx`, `DataFlow.tsx`, `Credentials.tsx`, `Decoys.tsx`, `Reports.tsx`; replay views if computed | Views/export agree; structured edits recalculate; fixed metrics removed or labeled; historical seed remains illustrative |
| 6 | Held-out evaluation, failure cases, scale tests, walkthrough | Focused automated checks/runner, export, README, presentation data | Report denominators and failures; prototype claims match measured results |

These paths identify the change's reach, not a requirement to rewrite every file. Search callers and scenario/incident consumers before editing shared code. Preserve the existing layers and installed dependencies.

## Critical implementation boundaries

- Remove `step.signals`, `step.decision`, `scn.legitimate`, and narrative stage labels as authorities for computed runs. Expected labels remain test-only.
- All mock consequential tools use one policy path. A blocked read returns no data; later steps must respect that result. Match receipts to actions and use idempotency for approved retries.
- Validate monetary values and material criteria. Compare only feasible alternatives under the declared objective. Missing evidence is explicit; higher price alone is not malicious drift.
- Learn from separate approved benign traces. Version references and exclude suspected/blocked events. Changing an authorized scope does not reset unrelated history.
- Graph edits fork fresh synthetic fixtures. Hiding an edge cannot cleanse historical contaminated state. Recovery needs validated new artifacts and output assertions.
- Recheck current policy/source state at mock commit. Preserve earlier effects; no claim of distributed atomicity or undoing an external payment.
- Invalidate stale pending assessments after input edits. Migrate or disclose a reset of prior persisted state so scripted history is not relabeled computed.
- Statistical thresholds/auto-hold settings do not override hard gates. Release does not grant a prohibited scope.
- Keep fixture-only replay and peripheral views labeled until implemented. Repeating a deterministic run does not establish independent confidence.

## Verification and deliverables

Follow PRD section 10. The implemented harness separates 12 benign training traces, four calibration checks, 20 benign action cases, 12 attack/violation cases and stable/gradual streams. Focused checks also cover cold start, mixed authorized/unauthorized changes, uncertainty, stale assessments, read prevention and recovery retries. See `artifacts/synthetic-evaluation.json` for measured denominators and failures. These are small controlled action cases, not independent real-agent sessions or enterprise effectiveness measurements.

Use negative controls for urgent purchases, quality tradeoffs, equal-cost choices, missing facts, benign retries, and independent graph branches. Compare each USP with the closest simpler configuration. Record outcome-history contribution, false holds, prevented mock effects, task completion, recovery residuals, checks, and local latency. Publish no preselected success rate.

Scale the synthetic workloads and fanout before making a scale claim. Report environment, p50/p95, throughput, storage growth, and shared-source hot spots. Synthetic node count is not deployed agent count.

The main walkthrough is `/lab`: edit supplier costs/deadlines, run the exact-scope change and its unrelated export, then recall and rebuild the affected dependency path while an independent order completes. Run measured evaluation and export JSON evidence. The dashboard, incidents and reports expose the same saved runs. Supporting legacy screens remain labeled illustrative; the old scripted Lab runner has been removed. The authoritative PRD remains unchanged.
