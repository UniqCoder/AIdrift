# DRIFTVEIL

Lightweight hackathon proof of concept for the three USPs in the [authoritative PRD v2.0](02_DRIFTVEIL_Final_Product_Requirements_Document.md).

The enterprise, agent proposals and approvals are synthetic. The core validators, policy gates, graph traversal and mock executor run real TypeScript logic, either locally or through the optional Docker-packaged API. No hosted model, credentials or production integrations are required. See [DEPLOYMENT.md](DEPLOYMENT.md) for the Render/Vercel deployment path and current publication blockers.

## Run and verify

```sh
npm install
npm run dev
npm test
npm run build
```

Open http://localhost:5173/operations. The root URL opens the operations console. `/demo` retains the secondary task workspace and `/lab` the advanced input editor. `npm test` runs engine, workflow-state and server-rendered UI assertions and writes the measured fixture report to `artifacts/synthetic-evaluation.json`.

For presentation evidence, open **Evidence** to see the claim-to-control map, then **Run evaluation suite** for computed comparisons and bounded graph-workload measurements. In OutcomeGuard, **Cost deviation** matches the slide's INR 1,000/INR 1,300 example. Enable **Include document-derived salary-read proposal** on a lowest-cost purchase to execute the salary-access boundary example: the read is held with no returned salary data, and valid procurement continues. Source attribution/proposals are synthetic; document language is not semantically analyzed. Export the saved case for its exact inputs, reasons and effects.

## Operations console

Core controls appear before detailed topology. Feature workspaces put inputs, execution and saved results first; history, additional tests and technical comparisons expand on demand. Reports lead with the feature and held/completed counts. Shared typography and controls are larger across the working routes; mobile layouts prioritize actionable controls.

The application uses persistent horizontal navigation for Security operations, Activity, Findings, Reports, Task workspace, Advanced lab and Settings. On smaller screens the same navigation scrolls horizontally; there is no sidebar or illustrative-workspace launcher. Operational body text and labels use a larger, higher-contrast type scale.

The default interface is an operational system with directly accessible Overview, OutcomeGuard, DriftGate, ChainRestore and Evidence workspaces. It uses the existing shared engine and optional API; it introduces no scripted verdicts. Edit offers and task constraints, execute proposed actions, manage exact change scope, recall/rebuild dependent state and export the saved case. The 3D graph visualizes the latest recovery snapshot or a labeled draft preview, supports node inspection and has an accessible list/failure fallback. Stale results retain their original evidence.

Metrics count action attempts across run-local mock ledgers in the current case; they are not production telemetry or deduplicated enterprise transactions. Evaluation is a separate controlled synthetic suite. Creating a case preserves previous runs. The implementation plan is [PROTOTYPE_IMPLEMENTATION_PLAN.md](PROTOTYPE_IMPLEMENTATION_PLAN.md).

`node scripts/smoke-operations.cjs` exercises the operations console against an isolated headless Chrome debug session on port 9223, including mobile layout, graph fallback and evidence downloads. Screenshots are written under `.browser-test/operations-review/`.

## Secondary connected task workspace

The secondary task workspace follows **Set task → Run purchase → Review finding → Approve change → Recover work → Export report**. One saved case carries the task and supplier inputs into finance and recovery. Each stage explains its purpose, the calculated result and the next action. Advanced controls and raw evidence expand on demand; the existing visual theme is retained.

Run a normal purchase first, select Beacon to create a held purchase, record an evidence review, correct the supplier, approve scoped scheduling, recall/rebuild affected work and export the case. Credential mismatch, changed tools, cold start, slow drift and incomplete provenance can be tested without leaving this flow. Step 4 also demonstrates learning from three permitted scheduling executions, validating a fourth and promoting a scope-specific reference; those deterministic samples are not independent real-agent sessions.

Activity, findings and reports default to computed evidence. The illustrative workspace is collapsed in navigation; its fleet editors do not configure the working demo. Starting another case preserves prior evidence. See [DEMO_READINESS.md](DEMO_READINESS.md) for the PRD coverage map and remaining verification boundaries.

## Three judge demonstrations

1. **OutcomeGuard:** the initial valid-token purchase selects a qualified but overpriced supplier and is held. Lower Beacon's unit price from 14000 to 9000 paise and execute again: it passes. Load the urgent fixture: the premium supplier is valid because the cheaper option misses the deadline. Load slow drift and execute four decision windows: repeated 3% losses cross the learned-reference CUSUM threshold even on the same approved tool path.
2. **DriftGate:** execute the approved scheduling change. Scheduling commits; simultaneous bank export stays held. Revoke approval or change the destination: scheduling is held too. The exact delta never resets the behavioral reference or overrides an explicit data prohibition.
3. **ChainRestore:** execute with the contaminated PDF dependency. The old payment assessment and retry are held while an independent purchase completes. Enable recomputation: fresh summary/memory/payment artifacts are created from trusted records, checked again, then committed once. The duplicate retry adds no effect. Incomplete provenance remains unresolved. Editing dependencies forks a fixture; it never erases saved contamination.

Use **Measured evaluation** for computed denominators, case results, simple credential/tool-allowlist comparators, drift delay and recovery checks. Export evidence as JSON. These are controlled synthetic measurements, not production accuracy, scalability or effectiveness benchmarks.

## What executes

- Integer minor-unit supplier comparisons, feasibility, relative/absolute loss limits and zero-cost handling.
- A frozen benign split of 12 traces: calculated loss mean and 24 tool-transition observations. References are scoped by agent role/task; finance does not borrow procurement confidence. Four separate calibration assertions precede held-out evaluation; no large-model training or automatic baseline reset.
- Shared role/task/resource/tool-manifest policy, exact approved changes, mock credential/action binding and mandatory hard holds independent of the behavioral setting.
- Dependency recall, incomplete/cyclic lineage checks, historical invalidation, fresh-path reconstruction and current-state fencing.
- A run-local effect ledger: denied reads return no data, denied exports/payments commit nothing, and idempotent retries cannot duplicate effects.
- Immutable-by-convention run snapshots linked to computed events/incidents, dashboard summaries and reports.

The old scripted Lab runner was replaced. Supporting fleet history, analytics, replay, decoys and integration screens remain explicitly **illustrative**. Computed runs are separately marked; they do not imply that an entire seeded agent was shut down.

## Evidence and storage

`driftveil-demo-v2` stores local simulation state. The older `exorcist-demo-v1` history is left in its own namespace and is not relabeled computed. Settings can reset the current demo. Each execution uses a fresh mock sandbox; its ledger is not a real payment system or a shared cross-run transaction database.

The browser is operator editable. Approval authentication, cryptographic receipts, protected enforcement, durable audit storage, real-agent adapters and enterprise-scale testing are future work. Hidden-instruction wording is not semantically analyzed; structured actions and contaminated lineage are the tested inputs. Recall cannot undo an externally committed effect.

## Implementation

- `src/lib/simulation.ts`: pure validators, benign learning, policy, executor and three workflows.
- `src/lib/simulationEvaluation.ts`: fixed-seed held-out harness (20 benign cases, 12 attack cases and separate streams); truth labels never enter the detector.
- `src/pages/Lab.tsx`: editable inputs, live calculations, lineage, effect results and evidence export.
- `src/pages/Demo.tsx` and `src/lib/demo.ts`: connected six-stage workflow and effect-based completion checks.
- `scripts/test-workflow.cjs`: actual store persistence and server-rendered workflow/report checks; not a substitute for browser interaction testing.
- `scripts/test-simulation.cjs`: focused regression assertions without a new test dependency.
- `scripts/smoke-browser.cjs`: optional browser checks using the built-in Node WebSocket client. Requires a dedicated disposable Chrome/Edge profile with remote debugging on port 9223 and the local server running. Do not use a personal browser session; this check resets its DRIFTVEIL demo state. Set `DRIFTVEIL_TEST_URL` to override the server URL.

Stack: existing React, TypeScript, Vite, Tailwind, Zustand and Recharts. No new dependency was added.
