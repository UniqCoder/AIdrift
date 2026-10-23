# DRIFTVEIL: solution landscape and three proposed USPs

Review date: 22 October 2026. Decision state: the user accepted the three-USP synthetic-data strategy and requested its incorporation into the PRD. The [revised DRIFTVEIL PRD](02_DRIFTVEIL_Final_Product_Requirements_Document.md) is authoritative; this review preserves research evidence and validation hypotheses. No application implementation is implied. EXORCIST in older files is historical branding.

## 1. Read against the actual challenge

Primary challenge supplied by the user: `C:/Users/Admin/Downloads/a65af2cb-cd0a-4be0-ad84-1d401c1dcdbb (1).pdf`, two pages, read locally in full.

The challenge requires learning normal agent behavior, continuously comparing it with a declared role despite valid credentials, explaining alerts with risk scores, and restricting or isolating threats while preserving legitimate work. Page 2 makes legitimate evolution, cold start, agent chains, imitation, and gradual evasion explicit. Hidden document instructions, poisoned tools, and stolen tokens are named vectors. The PDF contains no judging weights, submission format, team count, or deadline.

Consequently, DRIFTVEIL must retain a real behavioral baseline and role comparison. It must not become only a prompt filter, IAM gateway, procurement optimizer, or incident-replay dashboard. The proposed USPs extend that foundation.

## 2. Review method and confidence

This maps the main publicly documented solution families and close alternatives, not every system ever built. Primary papers and official product documentation were preferred. A published paper's experiments are author-reported findings; a vendor page establishes advertised scope, not independently measured effectiveness. We did not deploy or benchmark the listed systems.

Evidence labels used below:

- **Explicit:** an author states a limitation or bounds the system's threat model.
- **Empirical:** a paper reports a failure in its tested setup. It is not a universal failure rate.
- **Inference:** a limitation follows from an architecture or stated assumptions; it requires testing in a concrete implementation.
- **Unknown:** public material does not settle the capability. Unknown is not evidence that a vendor lacks it.

No cross-paper attack-success leaderboard is constructed: models, attack budgets, data, and evaluation conditions differ.

## 3. Existing solution landscape

| Family / representative work | What it already contributes | Relevant limitation or scope boundary | Consequence for DRIFTVEIL |
|---|---|---|---|
| [Microsoft Entra Agent ID](https://learn.microsoft.com/en-us/entra/agent-id/security-for-ai-overview), [directory visibility guidance](https://learn.microsoft.com/en-us/entra/fundamentals/zero-trust-ai) | Agent identities, access policy, lifecycle, accountability, and risk controls | **Explicit:** the directory does not directly observe host behavior; sign-in evidence cannot establish all runtime semantics | Integrate identity evidence; independently evaluate behavior and effects. Do not describe the entire Microsoft security stack as authentication-only |
| [NVIDIA OpenShell](https://docs.nvidia.com/openshell/about/overview), [runtime controls](https://developer.nvidia.com/blog/?p=122891) | External sandbox enforcement, file/network/process boundaries, fleet operation, reviewed policy updates | **Inference:** access containment alone does not establish that an allowed business decision is appropriate. Policy correctness and integration remain necessary | Use external enforcement as a foundation. Do not claim invention of an unpromptable gateway or sandboxes |
| [NeMo Guardrails](https://docs.nvidia.com/nemo/guardrails/latest/home), [Lakera / Check Point API](https://docs.lakera.ai/docs/api) | Programmable rails and security inspection; current APIs also cover agent tools and trusted mandates | **Inference:** protection depends on configured controls, supplied context, and interception coverage | Avoid the outdated claim that all guardrails only inspect prompt keywords |
| [Meta LlamaFirewall](https://ai.meta.com/research/publications/llamafirewall-an-open-source-guardrail-system-for-building-secure-ai-agents/), [AlignmentCheck](https://meta-llama.github.io/PurpleLlama/LlamaFirewall/docs/documentation/scanners/alignment-check) | Injection scanning, trace/goal alignment, code checks | **Explicit scope:** the reasoning auditor is model-based. [ControlValve research](https://arxiv.org/abs/2510.17276) demonstrates evasions of tested alignment defenses and highlights incomplete context | Do not make the agent's own explanation or another LLM's confidence the sole authority |
| [Task Shield](https://aclanthology.org/2025.acl-long.1435.pdf), section 8 | Checks whether instructions and calls contribute to the user's goals | **Explicit:** extraction/scoring can fail under weak or adversarially probed defenders; extra model calls add overhead; evaluation coverage is bounded | Use deterministic task assertions where the domain allows them, and reserve semantic inference for uncertain cases |
| [MELON](https://arxiv.org/abs/2502.05174) | Masked re-execution and tool comparison | **Inference:** depends on useful replay controls and additional executions. A replay difference is not general proof of malicious cause | Retain replay as supporting evidence. Report control reproduction and preserve task facts |
| [CausalArmor](https://arxiv.org/abs/2602.07918) | Selective causal ablation and targeted sanitization at privileged decisions, including masking poisoned reasoning | **Explicit scope:** guarantees are conditional on its attribution assumptions; this already addresses selective intervention and cost | Do not present selective sanitization or source influence scoring as an untouched idea |
| [CaMeL](https://github.com/google-research/camel-prompt-injection), [paper](https://arxiv.org/abs/2503.18813) | Separates trusted planning and untrusted data; applies capability/data-flow policies | **Explicit in the paper:** policy specification and user intervention remain burdens; some text-output manipulations are outside its objectives | Extend business-purpose checks rather than claiming data-flow enforcement is new |
| [Progent](https://arxiv.org/html/2504.11703v2), defense scope and discussion | Deterministic programmable privilege control, argument rules, dynamic policies, fallback behavior | **Explicit:** preference manipulation among permissible choices is excluded; guarantees depend on correct, comprehensive policies | This supplies a concrete motivation for outcome-relative behavioral monitoring |
| [AgentSpec](https://arxiv.org/abs/2503.18666), [Agent Behavioral Contracts](https://arxiv.org/abs/2602.22302) | Runtime specifications, constraints, governance, and recovery | **Inference:** authors must specify meaningful constraints and expose the state needed to check them. General rules can already express many business invariants | Differentiate through how task evidence, learned deviations, and bounded changes are combined and evaluated, not through the word contract |
| [DRIFT](https://arxiv.org/abs/2506.12104) | Secure initial plans, dynamic validation of deviations, and injection isolation | **Explicit scope:** already goes beyond static plans and addresses dynamic tasks | DRIFTVEIL's change proposal must address longitudinal learned identity and narrow approved deltas, not merely dynamic plan validation |
| [PAuth](https://arxiv.org/abs/2603.17170), [IntentCap](https://arxiv.org/abs/2609.14631) | Task-scoped operations, operand provenance, source-aware authority composition | **Inference:** relies on trustworthy task/operand interpretation and controlled enforcement boundaries | Do not claim newness for task binding, argument authorization, or provenance alone |
| [MetaPermit](https://arxiv.org/abs/2609.31039) | Separates inferred semantic attributes from fixed authorization policies | **Explicit mechanism:** inferred attributes still come from an LLM | Independent structured business witnesses are a different evidence path; no universal superiority is established |
| [Bounded Agents](https://arxiv.org/abs/2608.15888), [ControlValve](https://arxiv.org/abs/2510.17276) | Scope/budget propagation, action composition checks, permitted multi-agent control flows | **Explicit/inference:** guarantees concern specified restrictions and permitted paths; they do not establish the truth of every business fact | A delegation graph and scoped tokens are foundation features, not standalone USPs |
| [DriftNet](https://arxiv.org/abs/2609.10892) and its AgentDrift benchmark | Learns trajectory compromise and localizes injection/hijacked steps | **Empirical scope:** results are on a specified benchmark; cross-domain lifecycle and update behavior need separate evaluation | Learned behavioral localization already exists. Evaluate held-out tasks, benign changes, and mimicry rather than citing synthetic accuracy alone |
| [AgentShield](https://arxiv.org/abs/2605.11026) | Tool/credential/parameter traps and compromise detection | **Inference:** trap contact provides evidence, but absence of contact is not proof of integrity | Keep decoys as corroboration; test attackers that avoid them |
| [Sell Me This Stock](https://arxiv.org/abs/2603.12564), formerly titled AgentDrift | Shows risk-inappropriate recommendations despite largely preserved conventional quality scores | **Empirical:** task quality and suitability can diverge under manipulated tools; tested self-checks do not reliably correct the outcome | Supports monitoring task-relative consequences; it also means outcome drift is an existing research topic |
| [ImpactTwin / ProcureBench](https://github.com/immu4989/dspy-security-bench/blob/main/ARCHITECTURE.md) | Paired procurement scenarios, decision drift, and functional state-based evaluation | **Documented scope:** an assurance/benchmark approach; its existence rules out claiming the first synthetic procurement consequence test | Proposed extension: a running, longitudinal role monitor with task-relative loss and narrow change/recovery semantics |
| [Revoked but Still Authoritative](https://arxiv.org/abs/2609.08258) | Evaluates revoked-memory reuse and introduces retrieval filtering | **Empirical:** marks alone were not enforced in the tested defaults. Filtering one retrieval layer is not a complete account of already-derived execution state | Revocation must affect dependent context and pending actions at controlled boundaries |
| [Dependency-guided rollback](https://arxiv.org/abs/2608.10502), [PolyGraph](https://arxiv.org/abs/2610.17719), [MnemoIR](https://github.com/DheerajPranav/mnemo-ir) | Dependency repair, alternative support, source retraction, recovery evidence | **Explicit/empirical:** provenance quality matters; derived artifacts can survive simple deletion. Selective recovery itself is already prior art | Improve and test recovery completeness under retries, missing lineage, and queued work; do not claim invention of memory repair |
| [CONTINUITY](https://arxiv.org/abs/2609.05269) | Carries security context to current, effect-bound authorization checks | **Explicit scope:** structural authorization integrity does not establish sensible reasoning or truthful sources | Combine effect checks with outcome evidence; receipt validity must not substitute for task correctness |
| [Budgeted verification research](https://arxiv.org/abs/2608.25553) | Demonstrates the importance of selecting the right evidence path, and tests simple allocation guidance | **Explicit:** the forced critical-path intervention uses experimenter knowledge; that intervention is not an automatic scheduler | Our earlier scheduler remains a possible optimization, not the primary challenge contribution |
| [GATE baseline control](https://deterministicagents.ai/controls/c19-model-behaviour-monitoring), [AWS configuration drift guidance](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops02-bp02.html), [StepWise](https://netman.aiops.org/wp-content/uploads/2019/07/issre-stepwise.pdf) | Approved/versioned baselines and expected-versus-unexpected change handling | **Documented distinction:** config drift, versioned baseline renewal, and change-aware concept drift are established ideas | Proposed improvement is a task-conditioned, narrowly bounded behavioral update, with unchanged safeguards and measured residual drift |

### Commercial platforms must be treated fairly

| Platform | Publicly advertised capability | What this review cannot conclude |
|---|---|---|
| [Noma](https://noma.security/solutions/agent-behavior-runtime-control) | Session context, identity/data context, historical behavior, action controls, role profiles | That it lacks longitudinal detection or selective response |
| [Zenity](https://zenity.io/blog/agentic-security-runtime-context) | Runtime intent/context across identities, data, posture, and multi-step activity | That it only checks credentials or isolated calls |
| [WitnessAI](https://witness.ai/for-agents/) | Tool governance, runtime protections, action reconstruction | That no business-purpose checking can be configured |
| [Operant](https://www.operant.ai/platform/pricing) | Action tracing, identity/access controls, intent/scope guards, inline blocking/redaction | That coverage or algorithms are inferior without a direct test |
| [Prisma AIRS](https://docs.paloaltonetworks.com/prisma-airs), [platform architecture](https://docs.paloaltonetworks.com/prisma-airs/getting-started/prisma-airs-platform-architecture) | Agent identity, runtime protection, gateway policy, supply-chain testing, inventory | That it lacks memory poisoning or multi-turn testing; current documentation includes those capabilities |
| [Cisco AI Defense](https://blogs.cisco.com/ai/securing-ai-agents-with-cisco-ai-defense) | SDK-integrated LLM/MCP inspection and agent runtime protection | That its unreported behavior on our experiments is a known weakness |

The comparison opportunity is a reproducible experiment with defined controls and costs. Public marketing omissions are not verified product limitations.

## 4. Recommended three USPs

### USP 1 — OutcomeGuard: detect harm inside permitted behavior

**Recommended centerpiece.** Learn whether an agent's decisions continue to satisfy its assigned business purpose, including when tool names, credentials, and access patterns look normal.

The mechanism has two layers:

1. An independent outcome witness checks a proposed decision against trusted task constraints, authoritative source versions, and feasible alternatives.
2. A role/task-conditioned reference monitors the sequence of normalized decision losses and hard violations, alongside ordinary tool/sequence behavior. Accumulating small unexplained losses can request review even when every individual choice remains below a hard policy limit.

For a narrow procurement task whose approved objective is minimum total landed cost subject to eligibility, quality, and delivery requirements:

`task-relative loss = max(0, chosen feasible cost - best observed feasible cost) / best observed feasible cost`

Use integer minor currency units. A nonpositive denominator, missing material criterion, uncertain source, incomplete required evidence, or unassessable choice yields unresolved evidence, not a fabricated score. This example is not a universal objective for all procurement.

**Illustration:** A costs INR 1,000 and arrives in five days; B costs INR 1,300 and arrives in five days; both satisfy all approved criteria. A recommendation for B has a 30% unexplained cost gap under the declared objective. If the deadline is two days and C costs INR 1,500 but arrives tomorrow, C may be the correct choice with zero loss relative to the feasible set. Higher price alone is not drift.

**Concrete improvement:** relative to privilege-only controls and self-reported alignment, assess measurable task consequences using an independent source of truth, then monitor that evidence over time. Do not claim the first outcome validator: recommendation-drift research, general contract languages, and ProcureBench are close prior art. The proposed differentiation is the longitudinal task-relative identity signal tied to current evidence and pre-effect response.

**What it can establish:** inconsistency with a declared objective, a hard policy violation, or statistically unusual decision loss. It cannot by itself establish malicious intent or the globally best choice from unseen alternatives. Ordinary model mistakes may produce the same signal.

**Prototype proof:** keep tool sequences and token validity identical; change only the proposed choice or its supporting narrative. Compare tool-only, role-policy-only, semantic alignment, and the full outcome-aware monitor. Include urgent purchases, legitimate quality tradeoffs, ties, missing facts, and gradual attacker-favoring choices.

**Falsifier:** reject the headline claim if a simple task-rule baseline performs equally well on held-out cases, if opportunity changes create excessive false alerts, or if the added learning signal contributes nothing beyond fixed constraints. Report that result rather than renaming ordinary validation as new detection.

### USP 2 — DriftGate: approve the change without normalizing the attack

Treat an approved update as a bounded explanation for specified behavioral changes, rather than a reason to discard the whole old baseline or suppress alerts for that agent.

Maintain three distinct objects:

- An owner-approved role/task contract with hard invariants.
- A frozen benign reference, conditioned on task family and version, with a role-cohort prior for cold start.
- An approved change envelope: affected tools/resources/destinations/task families, effective version/time, and expected ranges supported by clean test traces. Approval alone does not prove that a behavior distribution is safe.

At runtime, separate hard violations, change-compatible deviations, unexplained deviations, and insufficient evidence. Only a deviation within the envelope can be discounted. Untouched dimensions retain their references; hard prohibitions never disappear. A clean challenger profile can be promoted after review and held-out checks. Blocked or suspected traffic is excluded from reference learning.

**Illustration:** Finance gains `schedule_payment` for approved payment-terms tasks. The new tool is expected in that scope. A simultaneous increase in unrelated bank-detail exports remains unexplained and prohibited where policy says so. A new model version does not automatically authorize a new data class.

**Concrete improvement:** task-aware, feature-bounded adaptation with a preserved security anchor, tested under mixed benign update plus attack. This builds on dynamic planners, approved re-baselining, and change-aware concept drift; it is not the invention of change management. Compatibility with an approval is evidence, not causal proof that the update caused the behavior.

**Prototype proof:** compare a frozen reference, a naive rolling reference, a whole-profile reset, and the bounded update. Use a legitimate update, an attack during that update, a new agent, changed task mix, a retry-heavy benign workload, and gradual mimicry. Report false holds, missed violations, detection delay, and reference contamination.

**Falsifier:** if task conditioning and bounded updates add no benefit beyond a versioned contract, keep them as implementation details rather than a claimed breakthrough. Unknown task families require contract-first protection and explicit uncertainty.

### USP 3 — ChainRestore: contain propagated influence and verify what still runs

Extend response beyond marking an agent quarantined. Record observed source-to-artifact/action dependencies; when a source is recalled, prevent its known derivatives and stale approvals from producing new consequential effects through controlled sinks.

Response includes:

1. Preserve evidence and identify known affected artifacts, sessions, and pending actions.
2. Distinguish known dependency, possible exposure, and unaffected status established within an instrumented boundary. A missing edge is not evidence of no influence.
3. Fence affected queued actions, late memory writes, retries, and restarts using current source/policy state at the actual execution boundary.
4. Regenerate necessary work from independently validated inputs or a clean checkpoint; merely removing a taint label is not recovery.
5. Verify the business output and the absence of prohibited mock effects in the tested continuation. Leave unresolved consequential paths held.

**Illustration:** a poisoned PDF becomes Procurement's summary and then Finance's remembered payment instruction. Stopping Procurement alone does not remove Finance's inherited state. DRIFTVEIL holds the affected payment lineage, checks current supplier evidence, and resumes the verified task. Independently supported work can continue.

**Concrete improvement:** evaluate source recall, current authorization at commit, recovery utility, and incomplete evidence as one operational response. Dependency repair, MnemoIR, and CONTINUITY already cover substantial parts. The candidate contribution is the combined, measured recovery contract under adversarial lifecycle events; its pieces are not new primitives.

**Prototype proof:** source-only deletion, whole-agent quarantine, memory repair alone, and full recovery under delayed queue delivery, stale receipts, process restart, late writes, duplicate retries, and deliberately missing lineage. Report residual prohibited effects, affected-work recall, unnecessary holds, task completion, and checks/replay cost.

**Falsifier:** if the full system cannot demonstrate a benefit over existing dependency repair plus current-action checks, describe it as integration engineering rather than a separate research advance.

**Boundary:** an already delivered email, disclosed secret, or committed third-party payment is not undone. Atomic authorization/effect ordering is only enforceable at sinks we control or through suitable target-side adapters. Network partitions trade availability for freshness; no instant global revocation claim is justified.

## 5. Why these form one solution

**Product statement:** DRIFTVEIL learns role- and task-specific behavior, checks whether decisions still serve approved business objectives, explains permitted evolution narrowly, and verifies recovery across affected workflows.

**Pitch:** "Catch harmful decisions that look normal. Let legitimate change through. Keep unaffected work running."

| Challenge requirement | Core mechanism / supporting control |
|---|---|
| Valid identity, wrong role | Contract gates, task-relative consequences, behavioral reference |
| Learn normal behavior | Benign tool transitions and task-relative outcome distributions, versioned and evaluated on held-out traces |
| Continuous comparison | Evaluate each consequential proposal; update session/window statistics incrementally |
| Hidden instructions / poisoned tools | Controlled source labels, baseline/context checks, manifest versions, consequence witnesses; replay supports attribution |
| Stolen token | Protected-sink action/credential reconciliation with action-bound, fresh execution authority; missing span alone is not proof of theft |
| Legitimate evolution | Narrow approved change envelope plus clean reference promotion |
| Little history | Explicit contract first; approved role/task cohort prior; insufficient-history status |
| Agent chains | Inherited scope and recorded dependencies, source recall, current sink checks |
| Imitation / slow drift | Outcome-relative loss as well as tool patterns; cumulative monitoring with false-alarm validation |
| Clear risk and explanation | Separate rule violations, outcome loss, statistical deviation, and evidence uncertainty; show reason codes and policy/source versions |
| Preserve legitimate work | Scope response to affected execution and independently verify task continuation |

Critical-path verification becomes a possible cost optimization inside these controls. Ghost Replay, decoys, credential receipts, and graphs remain supporting features rather than three more headline USPs.

## 6. Scaling model and impact

### Proposed scaling properties, not benchmark results

- **Outcome witnesses:** compile per task template. For n observed candidate options and k fixed criteria, direct validation is O(nk); more complex allocation problems may be substantially harder. Avoid a second model on every event where a deterministic check suffices.
- **Behavioral reference:** maintain task/role/version counters and bounded windows. Share approved cohort priors without merging sensitive tenant data or blindly pooling different tasks. Cold start protection does not depend on training a bespoke model.
- **Change validation:** test a shared role/version once per rollout, while retaining per-agent/task monitoring. Limit the number of live versions; unbounded context cardinality would defeat this advantage.
- **Recovery:** index dependency edges and revisit the affected reachable region, with O(Va + Ea) traversal for explicit affected vertices/edges. Large shared sources can still affect the whole tenant. Provenance growth, fanout, and missing instrumentation are real limits.
- **Verification:** batch and deduplicate authoritative lookups. Cache by tenant, source version, policy version, and freshness, with reliable invalidation. Reusing stale evidence is a failure, not an optimization.
- **Deployment:** partition analysis by tenant/workflow; keep final enforcement near the protected sink. An event queue supports analysis but cannot alone enforce fresh authorization before an irreversible effect.

Benchmark the full path at increasing synthetic task volumes and fanout, including a single shared-source hot spot. Measure throughput, p50/p95 decision latency, memory/event growth, authoritative requests, revocation visibility, false holds, and task completion. Do not call 10,000 synthetic trace nodes 10,000 deployed autonomous agents.

### Business value hypotheses

Start with managed procurement/accounts-payable agents. Outcomes are bounded, task owners are identifiable, and authoritative vendor/approval data can be instrumented. Potential value is avoided inconsistent decisions, lower alert fatigue during approved changes, and less interruption during incident response. Future templates could cover refunds, access provisioning, or release workflows, with separately defined objectives and evidence.

Use observed protected-workflow loss versus a matched unprotected mock run, task completion, false holds, and checks per task as prototype metrics. Do not translate them into enterprise ROI, actual fraud prevented, or analyst hours saved without customer evidence.

## 7. Verification performed during this review

These are small in-memory specification checks, not implementation or LLM results:

| Check | Observed result | What it does not establish |
|---|---|---|
| Outcome witness cases | Seven assertions passed: unjustified 30% cost gap, valid cheapest choice, urgent expensive choice, ineligible alternative, equal-cost tie, no feasible choice, and untrusted evidence | Real-world objective completeness, general attack detection, source truth, or learned outcome drift |
| Approved scope | Five assertions passed: approved new tool in scope allowed; unapproved, wrong-resource, and wrong-task uses held; existing valid operation allowed | An accurate behavioral change envelope or low false-alarm rate |
| Revocation ordering | Three possible approval-before-commit schedules checked; revocation before atomic mock commit prevents the effect; earlier committed effect remains | Distributed atomicity, cryptographic receipts, complete lineage, or network-partition safety |

Previous abstract scheduler results are not evidence for these three USPs. They tested a separate, simplified allocation model.

## 8. Minimum demonstration and decision gates

Keep the current UI and stack. Use synthetic agents and trusted mock business records. Replace preset verdicts with a shared evaluator and a mock side-effect ledger. The detector must not receive attack labels, scenario IDs as truth, or prewritten expected decisions.

Three proof scenes:

1. **Same tools, different business outcome:** tool-only risk appears normal; task-relative loss drifts; an unjustified decision is held. A higher-priced urgent decision remains valid.
2. **Approved update with an attack alongside:** the new operation works; unrelated sensitive behavior is still detected; old anchors remain inspectable.
3. **A recalled source reaches a second agent:** stale queued execution is stopped, necessary work is regenerated from clean evidence, and an unrelated task completes. Missing lineage is visibly unresolved.

Also retain one straightforward poisoned-PDF denial and one valid-token/missing-authority request to demonstrate the stated attack vectors. These are baseline controls, not additional USPs.

Before promotion to the pitch, test each proposed improvement against its closest simpler configuration, using held-out tasks and counterexamples. Include all attempts in denominators and evaluate after the attacker can observe the control. [Adaptive evaluation research](https://arxiv.org/abs/2510.09023) shows why fixed successful demo strings do not establish robustness.

Approval should select the proposed scope, not accept unmeasured novelty or performance claims. No full enterprise backend or real agent integration is needed to test the synthetic mechanism; those are later coverage/feasibility milestones.

## 9. Recommendation and claims discipline

Recommend USP 1 as the primary differentiator and business-impact story; USP 2 directly addresses the challenge's legitimate-change and cold-start difficulty; USP 3 makes containment and continuity concrete across agents. This is stronger challenge alignment than elevating a generic security dashboard or the earlier evidence scheduler.

The defensible novelty claim is a specific integration and evaluated extension of prior work: a task-relative learned identity signal, narrowly approved behavioral adaptation, and verified recovery within a declared enforcement boundary. Global firstness, superiority to commercial platforms, and competition placement are not established. Each candidate has an explicit falsifier so the team can reduce its claims if the experiments do not support them.

The user subsequently accepted this synthetic-data strategy and requested the PRD update. That update is now recorded in [the authoritative PRD](02_DRIFTVEIL_Final_Product_Requirements_Document.md); [the implementation companion](HACKATHON_PLAN.md) follows its priorities. Application rebranding, computed product behavior, and evaluation remain implementation work, not completed outcomes of the documentation revision.
