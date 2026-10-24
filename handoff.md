# DRIFTVEIL handoff

Updated: 23 October 2026. Workspace: `D:\DRIFTviel`. Application repository: `D:\DRIFTviel\exorcist` (the folder retains the former product name).

## Latest continuation: operations console, 24 October 2026

Subsequent user request: remove the illustrative-workspace launcher, use top horizontal navigation, and improve readability. `AppShell.tsx` now uses a two-row sticky header (brand/search/status followed by all working routes), with horizontal scrolling on mobile. The sidebar and fixture launcher were removed. Operational text formerly 9–11px is generally 12–14px, contrast is stronger, and the main panels use the recovered horizontal space. Task/Lab sticky status and heading offsets account for the taller header. Added route/search and no-sidebar assertions to the browser/store checks. Both browser suites, 31 focused checks, seven API tests and the production build passed. Synthetic labels and actual execution boundaries remain visible.

The user requested a premium complete demonstration and then explicitly clarified that it must be a proper system, not a guide. Plan recorded before implementation in [PROTOTYPE_IMPLEMENTATION_PLAN.md](PROTOTYPE_IMPLEMENTATION_PLAN.md). The root now opens `/operations`; it has directly accessible Overview, OutcomeGuard, DriftGate, ChainRestore and Evidence workspaces. `/demo` remains available as the secondary Task workspace. Earlier default-route descriptions below are historical.

The new console uses the existing `simulationClient`, Zustand case/run persistence and shared engine. Supplier/task edits, receipt/tool/cold-start controls, scoped approvals, reference collection, recall/rebuild and evidence export execute the same logic as before. No new dependency or security engine was introduced. `src/lib/operations.ts` derives graph statuses and checks saved-result/draft consistency. The lazy-loaded 3D dependency map uses actual artifact parents and computed exposure, distinguishes historical invalidation from verified new paths, and provides accessible node selection, list view, paused rotation and WebGL-loss fallback. Canvas-texture labels avoid HTML-overlay cleanup errors on workspace changes.

Verified: 31 focused checks, seven API tests, production build, operational browser flows, original guided/Lab browser regression, 390px overflow, light theme, keyboard focus, reduced motion, graph fallback, downloads and case preservation. No uncaught browser exceptions in final checks. Screenshots: `.browser-test/operations-review/`. Development server: `http://127.0.0.1:5173/operations` while the current process remains running. Changes are local, not pushed or deployed. Production security, real agents, durable audit, authenticated governance, full ablations and scale remain unproven.

## Previous continuation: connected user journey

Readability revision, 24 October: the user asked to keep the premium visual design while reducing confusion. The guided demo now uses shorter step labels, one prominent action at a time, collapsed advanced controls, a compact mobile step selector and clearer calculated-result labels. Repeated introductions and technical metadata are removed from the default reading path; input editors, learned-reference details, lineage and original evidence remain available. Existing fonts, palette and panel styling are retained. The full guided/Lab browser script and the 29 focused checks passed, including mobile overflow and evidence export. These are presentation changes; evaluator, policy and recovery logic are unchanged. This revision is local and has not been pushed or deployed.

Later user instruction on 23 October renamed the USPs to **OutcomeGuard**, **DriftGate**, and **ChainRestore** and requested a Docker API on Render plus Vercel frontend hosting. App labels, current docs and browser assertions were updated; old computed-incident titles use the current display names without rewriting saved evidence. `server/`, `Dockerfile`, `scripts/build-api.cjs`, the async frontend client and `DEPLOYMENT.md` implement the deployment path. Seven HTTP/client integration checks supplement the 29 existing checks. Publication remains pending GitHub write access (both connections lack push permission for the existing remote), Render workspace confirmation and Vercel connection. No public deployment, Docker image build or registry push is claimed.

The user clarified that readiness must cover the key PRD features through a simple end-to-end flow, not only three isolated USP demonstrations. The default route now opens `/demo`: task/permissions → execution/testing → investigation → scoped change → verified recovery → evidence/report. `/lab` remains the advanced editor. The sections below describing the old root route and 22-check status are historical; see [DEMO_READINESS.md](DEMO_READINESS.md) for the updated coverage and walkthrough.

- Added a persisted case with shared task/supplier inputs across purchase, scheduling and recovery. Completion depends on saved effects and an evidence review; starting a new case preserves history.
- Activity, incidents and reports default to computed evidence. Illustrative fleet navigation is collapsed and explicitly separated; grain/aura decoration was removed from the application shell. Mobile navigation uses a focus-managed dialog.
- Added interactive credential-receipt mismatch, changed-tool and cold-start controls. Finance no longer borrows procurement's behavioral reference. A scoped reference can be learned from three permitted scheduling executions and promoted after a separate fourth validation execution; samples remain deterministic synthetic fixtures.
- Added change-envelope agent binding and dependency-specific stale-assessment checks. An unrelated source recall no longer invalidates an independent payment, and an unnecessary repair cannot duplicate an already clean payment.
- Engine version is now `driftveil-synthetic-2.1`. Existing run snapshots retain their recorded versions. Storage remains `driftveil-demo-v2`; its normal state merge adds the new case to older v2 state without relabeling older evidence.
- Expanded assertions to 29 checks, including store persistence and server-rendered guided/report screens. Extended the browser script to cover the new journey and evidence export.
- Fresh browser verification is still pending: attempts to launch Chrome failed with Windows sandbox access errors. Prior browser checks below apply to the advanced Lab, not the new guided screens. No current claim of verified mobile interaction or downloads is made.

Full PRD ablation comparisons, scale benchmarks and real-agent security validation remain incomplete. This continuation adds no dependencies, backend, commit, push or deployment.

## Authority and user intent

- Read [AGENTS.md](AGENTS.md) and the [authoritative PRD revision 2.0, 22 October 2026](02_DRIFTVEIL_Final_Product_Requirements_Document.md) before further product or PPT work.
- Current product name is **DRIFTVEIL**. The PRD governs development, demonstrations and presentation content; later explicit user instructions take precedence.
- The user wants a lightweight hackathon simulation that demonstrates a strong proposed solution. Simulate enterprise records and agent proposals; actually execute detection, policy and recovery calculations. Avoid adding production infrastructure or real-agent integrations without a concrete need.
- The three core USPs are **OutcomeGuard** (centerpiece), **DriftGate**, and **ChainRestore**. Role Contracts, explainable risk, credential reconciliation and selective containment support them.
- Distinguish proposed capabilities, illustrative fixtures and measured synthetic results. Do not claim global novelty, superiority to untested products, production effectiveness or measured scalability.

The PRD's opening status and section 16 describe the pre-implementation state. They were intentionally left unchanged during implementation; use this handoff, the code, [README](README.md), [implementation companion](HACKATHON_PLAN.md) and measured artifacts for current implementation status. This does not revise the PRD's requirements or mean every acceptance check has been exhaustively satisfied.

## Implemented

### 1. OutcomeGuard

- Editable supplier prices, delivery, quality and eligibility; task quantity, deadline, task family and loss tolerances.
- Deterministic feasible-alternative comparison using integer minor currency units (paise), total cost, relative loss and absolute gap. Invalid records, unsafe arithmetic, infeasible choices and missing material criteria hold the effect. Zero-cost alternatives use absolute limits.
- Frozen reference learned from 12 synthetic benign traces: mean loss `0.00125` and 24 tool-transition observations. Transition anomaly uses conditional outgoing counts.
- CUSUM: `max(0, previous + loss - benignMean - 0.005)`, with threshold `0.08`. Repeated 3% loss first restricts at proposal window four under default settings.
- Urgent purchases are a negative control: the higher-price supplier can be correct when cheaper suppliers miss the deadline. The urgent task family explicitly reports unavailable learned behavioral confidence.

### 2. DriftGate

- Mock contract versions and an exact approved/effective change envelope covering tool, resource, destination and task family.
- Payment scheduling can commit while a simultaneous bank export remains held. Pending/ineffective approvals and wrong scope do not authorize scheduling.
- An approved delta does not reset the benign reference or override the bank-record prohibition. Approvals are synthetic operator controls, not authenticated enterprise governance.

### 3. ChainRestore

- Recorded path: contaminated supplier PDF → procurement summary → finance memory → pending payment; independent work depends on trusted records.
- Actual dependency traversal, descendant invalidation and incomplete/cyclic lineage checks.
- Mock commit rechecks current policy/source state and rejects stale assessments. The original payment and retry remain held while an independent purchase completes.
- Optional reconstruction creates new artifacts from trusted records, validates the business output and commits a fresh payment once. A duplicate retry adds no effect. Unresolved provenance prevents verified repair in the demo.
- Dependency edits fork a new fixture; old snapshots retain their original lineage and invalidation.

### Shared UI and execution

- One shared evaluator checks mock role/task authority, known tools/manifests/resources, credential/action binding, dependencies, outcomes and behavioral signals.
- Mandatory gates remain active when automatic behavioral restriction is disabled. Scores are heuristics, not compromise probabilities.
- Denied reads return no data. Denied exports/payments produce no mock effect. The ledger is **run-local**, not a cross-run transaction database.
- The old scripted Lab runner was removed. `/` opens `/lab`; the existing dashboard remains at `/dashboard`.
- Saved computed runs feed events, incidents, dashboard summaries and JSON/report exports. Legacy fleet history, analytics, replay, decoys and integrations remain explicitly illustrative.
- Persistence uses `driftveil-demo-v2`. Older `exorcist-demo-v1` history was not migrated or relabeled computed. Settings reset clears current computed runs and evaluation.
- No new dependencies, backend or hosted model were added.

## Run and verify

From PowerShell:

```powershell
Set-Location D:\DRIFTviel\exorcist
npm install  # Only needed if dependencies are absent.
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/lab`; use the port Vite prints if 5173 is occupied. A local server was running during the previous implementation turn; its continued availability has not been checked for this documentation task.

```powershell
npm test
npm run build
```

`npm test` writes [artifacts/synthetic-evaluation.json](artifacts/synthetic-evaluation.json). `npm run build` includes TypeScript checking. `npm run typecheck` is also available.

Optional browser check: `node scripts/smoke-browser.cjs`. It requires a **dedicated disposable** Chrome/Edge profile with remote debugging on port 9223 and the dev server running. Do not attach a personal browser profile: the check resets its DRIFTVEIL demo state. `DRIFTVEIL_TEST_URL` overrides the default server URL. The prior test browser was closed after verification.

## Verification already performed

Last implementation turn, 22 October 2026:

- **22 focused assertion checks passed**, including four separate calibration checks, full read/purchase drift behavior, malformed input, hard gates, role/manifest checks, stale authority, idempotency and recovery.
- **Production build and TypeScript checks passed.**
- **Browser checks passed** for input edits, urgent control, cumulative drift, approval scope, recovery, persisted snapshots, dashboard/report consistency and mobile overflow; no uncaught browser exceptions were observed in those flows.
- Existing measured report: engine `driftveil-synthetic-2.0`, seed `422026`, generated `2026-10-22T15:51:46.397Z`.

| Controlled evaluation metric | Measured result |
|---|---:|
| Attack/violation action cases held | 12 / 12 |
| False holds among benign action cases | 0 / 20 |
| Benign effects completed | 20 / 20 |
| Prohibited effects committed | 0 / 12 |
| First restriction in the eight-window 3% loss stream | Window 4 |
| First restriction in the matched benign stream | None |

Recovery assertions for original hold, independent completion, fresh-path commit, duplicate prevention and unresolved-lineage hold all passed. These are small controlled synthetic cases, **not independent real-agent sessions or general security accuracy**. Detailed PRD ablations and enterprise scale tests have not all been implemented. Tests were not rerun merely to create this handoff.

## Code map

| File | Responsibility |
|---|---|
| `src/lib/simulation.ts` | Typed fixtures, outcome validator, learned reference, CUSUM, policy, lineage, mock executor and three workflows |
| `src/lib/simulationEvaluation.ts` | Fixed-seed evaluation; expected labels stay outside the detector |
| `src/lib/risk.ts` | Explainable aggregation, outcome signal, bands and signal validation |
| `src/pages/Lab.tsx` | Three interactive proofs, computed previews, effect results, evaluation and JSON export |
| `src/store/useStore.ts` | Persisted computed snapshots and linked events/incidents; separate illustrative controls |
| `src/components/ProofSummary.tsx` | Shared computed summaries on dashboard, drift and reports |
| `src/pages/IncidentDetail.tsx` | Computed evidence links; historical triage cannot authorize held effects |
| `src/pages/Reports.tsx` | Computed/fixture distinctions and export |
| `scripts/test-simulation.cjs` | Dependency-free assertion harness using installed TypeScript |
| `scripts/smoke-browser.cjs` | Browser interaction checks using Node's built-in WebSocket client |

## Judge walkthrough

1. Open `/lab`. Execute the initial overpriced supplier choice: held. Change Beacon price from `14000` to `9000` paise and execute again: allowed.
2. Load the valid urgent purchase: the premium supplier passes. Load 3% slow drift and execute four windows: calculated cumulative restriction.
3. Open DriftGate and execute both actions: scheduling commits; bank export stays held. Uncheck approval or change destination: scheduling is held too.
4. Open ChainRestore. Run recall; observe independent work completing. Enable recomputation and rerun: new artifacts, validated payment, duplicate prevented. Enable incomplete provenance: unresolved hold.
5. Run Measured evaluation, inspect failures/denominators, export evidence and open the same saved findings in dashboard/reports.

## Limits and continuation

- Browser policy, approvals, records and snapshots are operator editable. Mock receipts are not cryptographic identity; snapshots are immutable by application convention, not tamper-proof storage.
- No real autonomous agents, semantic prompt-injection classifier, enterprise connectors, protected gateway, authenticated approval service or durable audit backend exists. Editing attack prose does not demonstrate semantic detection.
- Recovery cannot undo an externally committed payment, email or disclosure. Current-state ordering and idempotency guarantees apply only inside the controlled mock executor.
- No enterprise throughput, p50/p95, large-fanout, multi-tenant, adaptive-attack or real-agent benchmark was established. Local evaluation milliseconds must not become production latency claims.
- The next work should follow the user's instruction: rehearse and refine the existing three proofs/PPT, or implement a specifically requested gap. Do not automatically broaden the product or add infrastructure.
- The application changes and supporting artifacts remain **uncommitted** in the repository as of this handoff. Preserve existing modified/untracked files; no commit, push or deployment was performed in this documentation task.

Historical specs live under `exorcist/archive/`; prior-art discussion is in [DRIFTVEIL_USP_REVIEW.md](DRIFTVEIL_USP_REVIEW.md). Neither overrides the PRD. Verify external claims again before using them in a new presentation.
