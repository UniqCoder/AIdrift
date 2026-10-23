# DRIFTVEIL connected demo coverage

Updated 23 October 2026. Authority: [PRD revision 2.0](02_DRIFTVEIL_Final_Product_Requirements_Document.md).

The user's later instruction expands the demo work from checking three isolated proofs to demonstrating the key PRD features through an understandable end-to-end journey. This changes presentation and connects the existing prototype; production integrations remain outside the approved prototype requirements.

## Default user journey

Open `/demo`, or the root URL. The six steps are directly addressable and revisitable. They do not require a presenter to explain where to go next.

1. **Task & permissions:** understand the business objective, the two agent roles, enforced constraints and learned reference. Edit quantity, deadline, quality and cost tolerance.
2. **Run & test:** execute a normal purchase; then select Beacon for an overpriced purchase. Edit offers, test urgency or repeated 3% loss. Expand the security controls to try mismatched execution receipts, changed tool manifests or cold start.
3. **Investigate:** select a computed finding, inspect reasons, signals and saved inputs, and record review. Open its incident for notes, ownership and an incident report. Triage cannot authorize held effects.
4. **Approve change:** correct the purchase if necessary. Run pending scheduling to see the hold; approve the exact scheduling scope and rerun. The simultaneous bank export stays held. Optionally collect three permitted learning executions and validate a fourth before promoting the finance reference. Procurement's reference remains intact.
5. **Recover work:** recall a contaminated source and inspect affected descendants and held pending effects. Rebuild from trusted inputs; check independent completion, a fresh validated payment and a duplicate retry. Test incomplete provenance and a trusted-source negative control. Clean work is not paid twice by an unnecessary repair.
6. **Evidence & report:** inspect effect-based completion checks, run the separate evaluation suite and export the case's actual runs, incidents and current draft. A new case preserves prior evidence.

Supplier/task edits carry through scheduling and recovery. Independent recovery work uses a separate, explicitly trusted task. Every execution has a new run-local ledger; a case groups experiments, not a durable production transaction.

## P0 requirements

| PRD requirement | Working prototype path | Evidence |
|---|---|---|
| FR01 Branding and state labels | Guided entry, computed activity/reports, collapsed illustrative workspace | Screen rendering and source review |
| FR02 Trusted records and validation | Task/supplier editors, required lineage and current-state checks | Invalid/zero money, malformed records and stale-state assertions |
| FR03 Shared evaluator | Purchase, scheduling, export, payment and recovery | Same policy/executor functions across the journey |
| FR04 Outcome validator | Editable offers, urgency, ties, constraints and zero optimum | Arithmetic/negative-control assertions |
| FR05 Learned reference and drift | Frozen procurement training; repeated-loss stream; cold-start controls | Reference counts, stable stream and first restriction checks |
| FR06 Scoped change governance | Pending/effective approval, destination/task scope and validated finance reference | Approval binding, scope and reference-promotion assertions |
| FR07 Dependency recall | Source, summary, memory, payment and independent path | Descendant, missing/cyclic lineage and independent-source assertions |
| FR08 Checked reconstruction | Recovery from trusted supplier records through the same business checks | Fresh payment, independent output and unresolved hold checks |
| FR09 Controlled executor and retries | Held reads/exports/payments, stale assessments and duplicate retries | Effect ledger and binding assertions; redundant repair test |
| FR10 Risk and scoped response | Reasons, signal contributions, behavioral controls and mandatory gates | Behavioral-off hard-gate tests |
| FR11 Interactive demonstrations | Guided workflow plus advanced Lab | All six stages render; changed inputs reach each engine workflow |
| FR12 Consistent evidence | Shared persisted runs, activity, findings, snapshots and reports | Store/report rendering and persistence assertions |
| FR13 Evaluation and export | Case export plus fixed-seed evaluation UI | 20 benign/12 violation action cases, streams, recovery checks and JSON artifact |

These are implemented paths and bounded checks, not a claim that every PRD acceptance case has been exhaustively tested. Completion badges report saved demonstrations across the case's experiments, not approval of the current unsaved configuration.

## Verification and remaining work

`npm test` includes 29 focused checks, with the connected store/UI check exercising every guided stage, computed reports, persistence and non-destructive new-case behavior. `npm run build` includes TypeScript checking. `scripts/smoke-browser.cjs` now includes the full guided interaction/export path before the older advanced-Lab checks.

A fresh browser run was attempted, but Chrome terminated with Windows sandbox access errors. Current browser interaction, screenshots, mobile layout and download behavior have therefore **not** been newly verified. Prior browser results in the handoff cover the older advanced Lab, not this new guided experience. A disposable-profile browser rehearsal remains the final presentation check.

The complete PRD baseline/ablation matrix, scale measurements and real-agent/adaptive-attack evidence remain incomplete. Existing evaluation results are controlled action cases, not independent sessions or production accuracy. Candidate-reference samples are separate deterministic synthetic executions and demonstrate governance, not adaptation effectiveness.

P1 counterfactual Ghost Replay, decoys and richer integrations remain explicitly illustrative or future work. P2 authenticated approval services, protected enforcement, production identities, real adapters, durable audit storage and tenant isolation are not implemented. The user's later hosting instruction adds the optional stateless Docker API documented in [DEPLOYMENT.md](DEPLOYMENT.md), with seven additional HTTP/client integration tests. No new npm dependency was added.
