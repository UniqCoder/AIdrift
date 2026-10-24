# DRIFTVEIL operational prototype plan

24 October 2026. Authority: root PRD revision 2.0 and the user's instruction to build a premium working system, not a guide. This plan changes presentation and access to the existing computed prototype; it does not redefine the approved security strategy.

## Existing foundation

The repository already implements outcome validation, learned references, scoped approvals, dependency recall/reconstruction, controlled mock execution, saved runs and evaluation. Preserve these functions, the optional API client, and the existing uncommitted guided-workflow/report changes. Do not replace evidence with animated or scripted verdicts.

## Product structure

Make `/operations` the default entry and primary navigation item. It is a working operations console with five directly accessible workspaces:

1. **Overview:** current case, computed operational totals, recent decisions, and an interactive dependency topology. No fabricated fleet telemetry, uptime, revenue or prevention percentages.
2. **OutcomeGuard:** editable supplier bids and task constraints, agent selection, purchase execution, legitimate urgent counterexample, cumulative decision-drift chart, and saved policy/effect evidence. Show feasibility and objective cost separately from identity/tool authorization.
3. **DriftGate:** active approval state, exact scope and destination, simultaneous scheduling/export decisions, and controlled collection/validation of a new reference. Preserve prohibitions outside the approved delta.
4. **ChainRestore:** interactive 3D source/artifact/dependency graph, accessible node inspector/list, recall and verified-rebuild operations, independent continuation, provenance uncertainty, original holds and duplicate prevention. Every displayed graph state comes from a computed run or a clearly labeled input preview.
5. **Evidence:** saved runs and their original inputs, decisions, receipts and ledger; measured synthetic evaluation with denominators; JSON export; non-destructive creation of a new case.

No step numbers, guided narrative, tour modals, automatic scenario playback or locked progression. The older guided view remains available as a secondary view. Presets edit inputs; only explicit execution produces saved results.

## Implementation scope

- Add one operations page, scoped visual styles, one dependency-graph component, and a small shared evidence/model helper where needed for faithful current-draft comparisons and node states.
- Reuse Button, Input, Badge, Effects, Finding, Zustand, simulationClient, traceExposure, trackDrift, and the installed React Three Fiber/Drei/Recharts libraries. No new dependencies.
- Add the route and navigation entry; update existing browser root-entry expectation without rewriting the guided tests.
- Lazy-load the graph; provide a 2D/keyboard-accessible equivalent, WebGL failure fallback and motion controls. Node selection must expose version, lineage, exposure and recovery status.
- Preserve saved snapshots when inputs change. Display an explicit stale-result notice; previews do not become saved executions. Keep metrics scoped to the selected case and describe them as run-local attempts rather than unique real-world transactions.
- Refine the presentation using typography, purposeful color, chart annotations and concise empty states. Avoid decorative 3D that suggests nonexistent agents or measured traffic.

## Sequence and acceptance

1. Record this plan, inspect callers and reuse contracts.
2. Implement the operational workspace and input/evidence binding.
3. Add the topology and premium visual treatment.
4. Add focused assertions for input sensitivity, stale detection and graph-state derivation; run existing simulation/API tests and production build.
5. Check real browser behavior: safe/unsafe/urgent purchases; repeated drift; scoped approval with held export; validated reference; original held payment, verified replacement and independent completion; unresolved provenance; export and preserved case history. Check desktop/mobile, keyboard access and WebGL fallback.
6. Record exactly what passed and remaining boundaries in readiness notes.

Production integrations, real LLM behavior, authenticated approval, durable/tamper-resistant audit, production effectiveness and broad scalability remain outside this prototype's claims. Three-dimensional topology is a visualization of recorded synthetic dependencies, not independent proof of recovery or novel detection research.

## Delivery record

Implemented locally on 24 October 2026. All five operations workspaces are connected to the existing engine, case store and optional API client. The default route and sidebar now prioritize the operational console; the original task workspace remains secondary. No npm dependencies were added.

Verification: 31 focused checks; seven API/client integration tests; TypeScript/production build; operational Chrome smoke against both development and production bundles; existing guided/advanced-Lab browser regression. The operational script covers effect-sensitive inputs, scopes, reference collection, recall/rebuild, provenance uncertainty, current-case JSON export, history preservation, mobile overflow, light theme, keyboard focus, reduced motion and simulated WebGL-loss fallback. Final browser runs had no uncaught exceptions. Screenshots and downloaded evidence are in `.browser-test/operations-review/`.

Not published or deployed. This delivery does not establish the full PRD ablation matrix, enterprise-scale performance, production security or real-agent/adaptive-attack effectiveness.
