---
title: "EXORCIST | Final Product Requirements Document"
subtitle: "Selection-round solution, build-ready MVP, innovation audit and commercialization • 18 October 2026"
geometry: margin=0.75in
fontsize: 10pt
colorlinks: true
---

# 0. Document control and review outcome

**Hackathon scope update — 22 October 2026:** The current synthetic-data prototype scope, current prior-art review, revised differentiation, and implementation acceptance checks are in [EXORCIST Hackathon Plan](exorcist/HACKATHON_PLAN.md). For this stage, that plan supersedes the real-LLM/backend prerequisites and build priorities below. The full architecture remains proposed roadmap scope; neither document is evidence that planned features have shipped.

**Project:** EXORCIST — behavioral identity security for autonomous AI agents. **Hackathon:** D3COY / Identity Drift Detection in Autonomous AI Agents. **Stage:** PPT screening for 36 places from 500 submissions. **This document:** proposed final architecture; NOT evidence that all features have been implemented or externally validated. **Inputs reviewed:** uploaded 26-page Identity Drift Detection Study Guide; original 525-line EXORCIST PRD; separate EXORCIST v2 Architecture, Flows, Data & Loophole Review.

**Strict verdict:** Keep the concept; do not keep its original feature scope or unqualified novelty claims. Lead with (1) inline behavior and data-flow policy; (2) evidence-linked source-to-action investigation; (3) action-to-credential reconciliation on managed protected APIs; (4) selective containment. Replay, decoys, change management and learning differentiate as integrated supporting mechanisms, not universally original algorithms. Present three strong proofs, not fourteen promised modules.

# 1. The problem and opportunity

AI agents can use valid machine credentials to take harmful actions when an email, PDF, third-party tool, memory entry or another agent steers their behavior. A conventional IAM check may still approve each operation. Hackathon challenge: **learn normal agent behavior; compare it continuously with declared role; detect identity drift despite valid credentials; provide clear risk/explanation; and isolate or restrict threats without disrupting legitimate work**. The study guide additionally emphasizes hidden instructions, poisoned tools, stolen credentials, and the difficulty of nondeterministic behavior, cold start, and low false positives.

**Product definition:** EXORCIST is a policy-enforced agent action gateway with an evidence graph, role/behavior baseline, targeted investigation and response controls. Primary buyer: enterprise AI platform/security teams running tool-using autonomous agents with managed API access. Initial deployment target: organization-controlled LangGraph/MCP workflows, then expansion via enterprise gateways/adapters.

**Core message for PPT:** **"A valid agent identity does not mean a valid action. EXORCIST verifies behavioral intent at the execution boundary—then blocks only the unsafe action."**

# 2. Outcomes, personas, JTBD

| Persona | Decision/job | Required screen or artifact |
|---|---|---|
| SOC analyst | identify dangerous action and evidence quickly | risk alert, source→action evidence, safe release |
| Agent/platform engineer | add an agent without breaking useful work | contract wizard, coverage status, integration docs |
| Agent owner | keep business task functioning while an action is denied | selective hold, benign-task continuation |
| Security lead/CISO | know where machine identities are acting outside purpose | portfolio risk, gaps in enforcement, blast-radius estimate |
| Auditor | reconstruct what was proposed, allowed, blocked and reviewed | immutable event/evidence bundle |

**MVP user stories:** create approved contract; run benign task; inspect intercepted risky tool invocation; see reason and risk; release or deny held actions; see source-linked replay with uncertainty; run poisoned-tool and token mismatch if P1 completed; export JSON report.

# 3. Requirements traced to the problem statement

| PS demand | Product mechanism | Live acceptance evidence | Priority |
|---|---|---|---|
| Agent identity with valid credentials | per-agent credential and gateway audit | mock ERP approves identity while action policy holds | P0 |
| Learns normal behavior | approved benign task transition counts, role-cohort prior | baseline visible, changes across runs | P0 |
| Compares to declared role continuously | approved YAML contract checked on every consequential call | in-role allow/out-of-role hold | P0 |
| Hidden instruction in document | provenance tagging + role/data policy + replay | malicious supplier PDF flagged; exfil denied | P0 |
| Poisoned tool | hash-pin approved MCP schema and output provenance | changed description blocked with before/after hash | P1 |
| Stolen token | protected API gateway execution-receipt reconciliation | valid token request without receipt held | P1 |
| Clear risk score and reason | deterministic signals + policy floors + event timeline | viewer sees trigger, action, score, confidence | P0 |
| Restrict/isolate while preserving work | action-level hold/deny; unaffected tools remain usable | price comparison completes after HR read is denied | P0 |
| Legitimate changes vs malicious drift | versioned owner-approved contract changes | approved new tool allowed, illicit HR access not approved | P0 |
| Chains of agents | source-label delegation envelope, downstream sink check | limited 2-agent example with trace IDs | P1 |
| No history/cold start | approved contract first; cohort behavioral prior | first-session policy works | P0 |
| Slow adversarial drift | frozen profile + JSD/CUSUM | held-out 30–40 session simulation | P1 |

**No PS requirement is silently dropped.** P1 items are explicitly designed but not promised as 24-hour guaranteed completion. Do not state that their mere architectural inclusion demonstrates end-to-end support.

# 4. Proposed solution and USPs: competitive red-team audit

| Candidate USP | Genuine value | Existing adjacent art / uniqueness risk | Final pitch positioning |
|---|---|---|---|
| **USP A: Source-to-action Evidence Replay** (Ghost Replay) | shows how outcome changes with suspected source replaced; contextualizes hard blocks | counterfactual prompt-injection analysis exists, incl. MELON; not unique by itself | **our implementation:** replay findings attached to an enforced role-policy decision and provenance DAG, with explicit inconclusive state |
| **USP B: Action–Credential Reconciliation** (Thought-Bound Credentials) | identifies externally executed API requests lacking authenticated gateway execution lineage | token binding, transaction authorization and trace correlation already exist | **our implementation:** correlate model-proposed call, approved tool execution and actual enterprise request; do not imply reading model thoughts |
| **USP C: Containment + Decoy/Delegation Mesh** (D3COY Mesh) | decoy evidence, propagation visibility and restriction of compromised paths | honeytokens, canaries, taint tracking, agent-policy enforcement and graph risk are known concepts | **our integration:** action-level, role-aware containment with inherited data labels and a measured benign-work continuation rate |
| **USP D: Purpose-bound data flow** (new recommended signature feature) | catches salary leakage hidden in *approved* business communication | DLP, information-flow control and taint tracking are established disciplines | **high-value integration:** data label × role × destination checks at agent tool boundary, not merely a keyword prompt classifier |

**Defensibility conclusion:** Cannot substantiate "nobody has ever built this" without exhaustive current product/patent review (no live web verification available here). In slides say **"differentiated architecture combining..."**, not first-ever or impossible-to-copy. Do not overstate comparison against CaMeL, MELON, Task Shield, Progent, AgentSpec, commercial agent firewalls, DLP or IAM products without directly testing them.

**USP proof cards for a high-scoring slide:** (A) "PDF source associated with 3/3 replay flips" *only if measured*; (B) "valid token, missing approved-execution receipt → blocked by managed gateway"; (C) "malicious HR read blocked, supplier price-comparison completes"; (D) "approved supplier endpoint cannot carry `hr.salary`". The narrative is a *new workflow*, not a new mathematical primitive.

# 5. Functional specification (priorities and pass criteria)

**P0: deliver before claiming complete MVP.** FR01 registry: unique agent ID, owner, status and coverage tier; test create and load. FR02 role contract: schema-validated contract with allowed intents/tool/resource labels/egress + approval/version; test forbidden HR resource. FR03 observe agent proposed calls, capture source IDs and request IDs; test timeline. FR04 protected mock API/MCP gateway holds policy-sensitive calls before execution; verify no bad downstream event. FR05 risk calculation with reason codes and policy floors; test deterministic expected decisions. FR06 role-cohort benign transition model; test expected vs anomalous sequence. FR07 provenance-connected alert; test source, proposal and decision linked. FR08 one replay control plus sanitized comparison in an isolated mock-tool sandbox; test inconclusive result on control-reproduction failure. FR09 human analyst hold/deny/allow-scoped-action; test audit record. FR10 dashboard live agent cards, timeline, actions and retained-utility outcome. FR11 benign change governance: approved contract version permits a new tool; unapproved change still blocked. FR12 unit/integration tests and basic evaluation report with denominators.

**P1 if time permits:** FR13 pinned MCP tool schema + changed manifest; FR14 managed API execution receipt/token mismatch; FR15 `hr.salary` label→approved destination DLP rule; FR16 decoy opened not merely listed; FR17 2-agent delegation graph; FR18 JSD/CUSUM simulation; FR19 repeated k=3 replay with reproduction fraction; FR20 JSON/PDF audit export.

**P2 roadmap:** genuine key-bound identities using mTLS/DPoP; OPA/Envoy production integration; cross-platform MCP/HTTP/SDK compatibility matrix; scalable stream processing; privacy-preserving sensitive-value matching; large real enterprise telemetry; authenticated two-person change approvals; long-term rebaseline controls; commercial multitenancy/SIEM integrations.

# 6. UX and complete user journey

**6.1 Onboarding:** SOC/admin opens Agents → New Agent → inputs declared role and risk classification → system generates contract draft → human reviews tools/resource-labels/destinations and clicks Approve → sees integration coverage badge → starts baseline with approved benign tasks → activation complete. **Do not say "paste role description and fully secure agent":** generated text requires explicit trust and policy approvals.

**6.2 Monitoring:** dashboard shows four demo-agent cards (Procurement, HR, Finance, Support) but real MVP may only instrument Procurement and Finance; distinguish demo-only static cards from connected agents. Agent card: current task, last action, profile, risk band, coverage tier and active hold. Tooltip explains why.

**6.3 Incident:** analyst opens alert → sees trusted user task and untrusted supplier source → blocked `fs.read` call, policy label mismatch, replay evidence state → chooses inspect/deny/approve narrowly → closure audit. UI MUST distinguish actual observed event, inference, replay outcome and analyst judgment.

**6.4 Recovery:** agent continues supplier work through allowed tools. An out-of-scope permission change requires versioned contract approval; one-click release never broadly authorizes `hr.salary` access for Procurement.

# 7. System architecture and integration

Use the **four-plane diagram and full event flows in the companion Technical Architecture document** as the normative design. Capture plane: LLM API proxy + MCP wrapper + managed API gateway. Intelligence plane: contract and fingerprint signals + provenance DAG + optional replay. Control plane: policy and credential service. Experience plane: SOC console and Possession Lab. Trusted policy enforcement must sit outside the agent runtime. Observed-only hosted providers cannot honestly claim preventive coverage.

**MVP stack by function:**

| Need | Selection | Why / caveat |
|---|---|---|
| Real autonomous agent | Python + LangGraph | explicit tool graph, familiar development path |
| Agent tools | simple FastAPI endpoints or tiny MCP server | fast and inspectable; implement only needed adapters |
| LLM | configurable hosted API **or** Ollama | choose on actual hardware/availability; never depend on unavailable 7B inference |
| API/decision gateway | FastAPI middleware | easy to hold writes and record execution receipts |
| Policy | Python deterministic engine, optional OPA/Rego later | minimize 24-hour moving parts |
| Data / event stream | SQLite local with append-only records | adequate MVP; PostgreSQL later |
| Provenance / lineage | NetworkX | inspectable small graph; Neo4j roadmap |
| Baseline | scikit-learn/simple transition matrix; numpy | no model training dependency for P0 |
| Drift | JSD + CUSUM in numpy | P1; small sample sensitivity acknowledged |
| Replay / task alignment | same model route + stubbed tools | controlled comparison only, cost capped |
| UI | Next.js, Tailwind, React Flow, Recharts | build three priority screens before sophisticated graph art |
| Deployment | Docker Compose | isolated mock services; controlled outbound access |
| Instrumentation | JSON event schema + OpenTelemetry optional | trace correlation first, avoid integration bloat |

**Not required:** training a bespoke foundation model, GPU-heavy classifiers, Neo4j, Kubernetes, full Envoy or a production OAuth provider. If a classifier is added, it augments rather than replaces deterministic data-flow policies.

# 8. Risk model: formula, features and decision matrix

For signals `s_i∈[0,1]` and weights `w_i∈[0,1]`, calculate

`B = 100 (1 - Π_i (1 - w_i*s_i))`;

`Score = max(F_policy, clip(B × M_context,0,100))`.

Initial signals and **untuned illustrative weights**, not model-trained probabilities: role-domain mismatch 0.55; sequence anomaly 0.30; destination novelty 0.25; suspicious provenance-to-sink 0.40; task misalignment estimate 0.25; slow drift 0.30. A purpose-bound DLP violation and credential execution mismatch are *policy gates* with hard floors independent of weights. Do not double-count correlated features when interpreting magnitude.

**Thresholds:** 0–39 observe; 40–59 step-up/hold high-impact sinks; 60–79 restrict affected resource/destination; 80–100 quarantine implicated scope / revoke implicated credential only under managed gateway control. Recommended floors: out-of-role sensitive read 60; suspect credential request 90 after exception checks; DLP violation 90; decoy invocation 85; unapproved schema change 70; downstream potentially exposed 40. These are initial product policy values and must be tuned for the benchmark's cost of false positives.

**Score explanation:** show rules directly, e.g. “blocked: Procurement role excludes `hr.salary` and supplier PDF is untrusted; destination not necessary to establish denial”; then show supplemental score and replay association. The risk value is **not a calibrated 92% chance of attack**.

**ML design: P0 vs when warranted**

- **P0 role fingerprint:** no supervised ML needed. Build per-role Markov transition frequencies from benign traces, with Laplace smoothing. Optional resource frequency and volume z-scores. Training input `agent_id, role, step, tool, resource_label, destination, timestamp, action_approved`; exclude attacker runs. Fixed seed, version data and publish confusion matrix.
- **P1 anomaly ensemble:** Isolation Forest on per-session `new_destination_count, rare_tool_ratio, unique_domain_count, sensitive_read_count, tool_transition_surprise, outbound_bytes`; contamination learned from benign validation, not assumed. Compare to simple baseline; keep only if measurable improvement.
- **P1 slow drift:** frozen role histogram, JSD, CUSUM, separate benign change evaluation. Threshold chosen using false-positive tolerance.
- **P2 calibrated risk:** obtain broader labeled human-reviewed incidents, temporal holdout, isotonic/Platt calibration if justified. Explain model-card limits and drift-retraining governance.
- **LLM judge:** independent isolated auxiliary assessment using sanitized structured task/actions, never sole gate. Treat probabilistic judgment as uncertain.

**Worked incident, illustrative (not a measurement):** `fs.read(hr.salary)` requested by Procurement after supplier PDF: role signal 1, source-to-sensitive action signal 1 and rare transition 0.8. With weights 0.55, 0.40, 0.30: `B = 100[1-(0.45×0.60×0.76)] = 79.48`. Floor 60, result ~79.5 and **gateway hold**; replay may strengthen analyst confidence but does not release the HR read. If subsequent outbound exfil violates DLP, floor 90 and deny.

# 9. Data and benchmark plan

**No reliable public production enterprise-agent-token telemetry is established in provided files.** Create synthetic enterprise records and execute *real* LLM agents to generate telemetry; never describe all synthetic tasks as equivalent to human enterprise behavior. Public research sets are for attack stimuli and comparative stress-testing, not proof that deployment works in every framework.

| Source | Use | Limit / check before claiming |
|---|---|---|
| [AgentDojo](https://github.com/ethz-spylab/agentdojo) | agent-task + injection tests | verify local version/task counts and licenses |
| [LLMail-Inject](https://huggingface.co/datasets/microsoft/llmail-inject-challenge) | hostile email injection payloads | not enterprise behavior baseline |
| [InjecAgent](https://github.com/uiuc-kang-lab/InjecAgent) | tool-response injection cases | scenarios may need adaptation |
| [ASB](https://github.com/gmh5225/ASB) | cross-scenario prompt injection | verify available harness and subsets |
| [MCPTox paper](https://arxiv.org/html/2508.14925v1) | MCP poisoning concepts/tests | independently check repository access |
| [tau2-bench](https://github.com/sierra-research/tau2-bench) | benign workflow tasks | data semantics different from Acme mock ERP |
| Acme mock company: Faker | HR/supplier/finance/support data | synthetic, label all screenshots clearly |
| AgentDrift | future step-localization comparator | no assumed public download; contingent |

**Data splits:** benign traces for reference profile; different benign tasks for threshold tuning; *held-out attack phrasing/sources* for evaluation; separate legitimate-change and adversarial slowly drifting runs. Never evaluate on examples encoded as exact training rules alone. Source counts in v2 documents are historically cited but **not independently verified** here; omit stale figures from final PPT until reconfirmed.

# 10. Evaluation, acceptance gates and metrics

| Metric | Formula / observation | Gate for credible prototype |
|---|---|---|
| Attack prevention rate | blocked prohibited sink attempts / all attempted prohibited sinks | publish numerator, denominator, at least 10 varied attempts |
| Alert recall | attacked sessions alerted / total attacked sessions | disclose session definition |
| Benign false alarm | benign sessions incorrectly alerted / benign sessions | at least 20 diverse benign sessions if time allows |
| Utility retained | protected benign tasks completed / identical unprotected benign tasks completed | show 1 full legitimate workflow after block |
| Containment latency | gateway receives proposal to hold/deny enforced | measured p50/p95 on local mock API |
| Replay reproduction | R0 recreated target action / total R0 trials | no attribution if reproduction fails |
| Replay source association | known injected-source identified / reproducible injection cases | 3 test variants minimum |
| Credential mismatch precision | true injected bypasses flagged / all mismatch flags | include legitimate retries and service refreshes |
| Coverage ratio | actions routed via enforced gateways / known actions | avoid universal coverage claims |
| Agent-to-agent reach | correctly linked delegated actions / seeded delegated actions | report possible vs confirmed |

**Prior PRD targets of ≥95% detection, ≤2% false positives, 100% token detection, p95<20ms etc. were aspirational** and cannot be used as achieved figures. For PPT, if no tests have run say **"targets under evaluation"**, not a fabricated result. Also do not claim CERT-In or DPDP compliance; export fields can *support* incident response, but legal compliance requires process, reporting deadlines and counsel.

**Ablations:** contract-only vs + sequence; without vs with source replay (analyst attribution quality, not pre-gate protection); with vs without DLP on approved-channel leakage; rolling vs frozen+drift on long sequences. Negative controls: approved tool addition, task unexpectedly needing a new legitimate document, tool retry, source PDF sanitized but task facts preserved.

# 11. Innovation vs alternatives and positioning

- **IAM/PAM:** authenticates/can authorize, generally not sufficient to assess task-specific behavior. EXORCIST overlays role/purpose policy and runtime evidence; it does **not** replace IAM.
- **Prompt-injection content filters:** scan text; EXORCIST evaluates behavioral consequences and protected sink controls even if payload text evades detection.
- **Pure anomaly UEBA:** baseline deviations alone may be benign and weak on cold start. EXORCIST anchors allowed behavior to an explicit approved contract and data policies.
- **Agent guardrails and policy engines:** already exist. EXORCIST must demonstrate incremental value through linked provenance, replay evidence, action–credential reconciliation and selective containment; not falsely claim policy enforcement itself is novel.
- **Enterprise DLP:** existing label-flow concepts. Innovation is binding them to *tool-using agent purpose and delegated provenance*, with the same decision explained in a behavioral identity dashboard.

**Competitive moat hypothesis (not proven):** verified gateway coverage, repeatable evidence datasets, workflow-specific policy packs, integrations, analyst outcomes and calibrated thresholds. No defensible assertion of a patentable first or absent competitor has been validated.

# 12. Build plan: shortlist-first and 24-hour MVP

## Pre-submission (highest selection ROI)

1. Freeze a concise problem→solution narrative with explicit role-policy/hijacked-PDF example; keep technical diagram readable in one slide.
2. Create a **minimum proof spike**: one agent, one invoice, two tools, protected HR resource, one actual denied operation and one completed legitimate task. Capture screenshot/10–20-second video if possible.
3. Generate a real event timeline and one `R0/R1` comparison; mark early results with sample sizes.
4. Finalize threat-to-control matrix and architecture in PPT, choose only three differentiator captions; show v2 safeguards as safeguards, not fourteen product promises.
5. Include current limitations; verify all stats, benchmark totals and research novelty outside these attachments before uploading slides.

## 24-hour implementation sequencing

| Time | Minimum deliverable | Owner suggestion | Hard exit test |
|---|---|---|---|
| 0–3 h | Acme mock APIs and real Procurement agent | Agent/Backend | benign task completes |
| 3–7 h | managed gateway, contract and hold | Backend/Security | forbidden HR read does not execute |
| 7–10 h | event chain and role+sequence scoring | ML/Backend | trace IDs connect source, action and decision |
| 10–14 h | isolated single-pair replay + explanation | ML/Agent | R0 reproduction reported; R1 comparison recorded |
| 14–18 h | dashboard screens and analyst hold state | Frontend | judge can inspect evidence and allowed work |
| 18–20 h | P1 one extra attack (token OR poisoned MCP) | Security | end-to-end test passes |
| 20–22 h | evaluation scripts and ablations | QA/ML | metrics show real denominators |
| 22–24 h | demos, offline fallback, freeze | All | 3 full runs without manual repair |

**Four-person task distribution:** (A) gateway/permissions and mock protected endpoints; (B) agent task and tool source injection/replay; (C) detection, baseline and evaluation; (D) dashboard, UX, demo, slide proof. Integrate from hour 3; don't wait until hour 16 to combine components.

**Release gates:** Gate 1 before any stretch: *actual harmful side effect is prevented*; Gate 2: *same agent finishes intended work*; Gate 3: *visible evidence explains why*; Gate 4: *one novel supporting experiment reproducible*. Drop animation, extra agents and unsupported integrations before compromising these gates.

# 13. Business model and viability

**Buyer and problem:** enterprise CISO / AI platform leads, particularly organizations with rapidly growing agent fleets handling HR, finance, procurement or customer data. **Wedge:** managed LangGraph/MCP agent protection with audit-grade action evidence and a safe staging simulator. **Model:** B2B enterprise SaaS / on-prem agent gateway subscription; pilot-priced per protected agent or protected actions, then annual tiered platform contract and add-on retention/connectors. No specific rupee ARR claim until willingness-to-pay interviews.

**Business requirements:** policy governance and integration hours; agent fleet visibility; support and high-availability controls; regulated-data hosting choices; evaluation against existing API security and DLP spend. **Sales motion:** design partner pilot, baseline false positives, prove harmful-action prevention, demonstrate unchanged task completion, then expand protected workflows. **Buyer objection:** "Why not use our existing API gateway, DLP and IAM?" Answer: EXORCIST joins agent-specific role/task provenance to these controls, with one analyst investigation and action-level containment—validated only through measurable incremental benefit.

**Cost drivers:** model-call/replay inference, event storage, API gateway throughput, secure snapshot retention, platform engineering, integration support and incident support. Cost controls: deterministic policy first, replay only flagged cases, cap budgets, limit retention, batch analytics. **Viability risk:** without demonstrable reduction in incidents/triage effort, enterprise buyers may treat it as an unnecessary wrapper.

# 14. Security, privacy, operational and ethical constraints

Secrets masked at ingestion; hash only when useful and use keyed hashing for sensitive low-entropy values; encrypt context snapshots, delete at declared TTL; minimize third-party inference by anonymization; use RBAC and separate approvers; protect audit integrity; alert when enforcement coverage degrades. For high-impact sinks, fail to held/denied on policy unavailability. Operational retries and legitimate system calls have controlled exceptions. Don’t present an attacker-authored visible model tool call as proof of an agent's authenticated execution. Avoid capturing personal salaries into LLM judge prompts; use synthetic demonstration data.

**Risks / mitigation:** replay may change task meaning (preserve facts and mark uncertainty); benign novel tasks may false-alarm (owner-approved change path); compromised approvers can maliciously change contracts (dual review roadmap and audit); agent direct-network bypass (isolated demo environment / enterprise egress control); allowed-channel exfil semantic transformation (not wholly solved); protected-data label missing (default restricted for unknown sensitive resources); event graph overclaims influence (mark possible vs observed); budget DoS through replay (rate limit and cache); hosted-tool invisibility (coverage tier).

# 15. PPT submission narrative: proposed 6-slide structure

1. **Security blind spot:** "valid credentials, wrong behavior" with procurement example; one sentence explicit PS mapping.
2. **EXORCIST concept:** execution-boundary diagram with role, task, history and data labels feeding allow/hold/deny.
3. **How it works:** clear 5-step scenario from supplier PDF → proposal → policy hold → explain/replay → benign work continues.
4. **Innovation:** three proof cards—source-associated replay, authenticated action–credential reconciliation, and purpose-bound selective containment with data labels. Mark MVP/P1 truthfully.
5. **Feasibility and evaluation:** exact stack, real proof spike, dataset plan, staged 24-hour build, one honest metrics table.
6. **Impact, viability and roadmap:** enterprise personas, security outcomes, expected saved analyst effort and decreased exfil opportunity (unquantified until measured), integration wedge and scaling limitations.

**Slide design rule:** For top-36 selection, judges should understand the security boundary, clear unique workflow, realistic implementation and real evidence in under 90 seconds. Do not use grand claims of unprecedented uniqueness, 100% prevention, universal framework support, or invented KPI numbers.

# 16. Open decisions before freezing slides

1. Are exact PPT rules fixed to six slides, and do they permit a prototype screenshot/video?
2. Can the team show an actual mock API hold before the PPT deadline?
3. Which LLM endpoint/GPU budget is genuinely available for replay tests?
4. Does the team have four working members? Adjust ownership otherwise.
5. Will the slide claim only P0 features, or distinguish P1 explicitly as "planned demo"?
6. Can benchmark names, licenses and numeric statistics be reverified using live sources before final submission?

# 17. Source-to-revision audit trail

**Study guide (26 pages):** PS coverage and judge rubric interpretation, agent/IAM basics, three named vectors, cold-start and continuity constraints. **Original PRD:** Role Contract, Drift Risk Score, gateway, Ghost Replay, Thought-Bound Credentials, D3COY Mesh, 24-hour plan and seven scenario suite. **v2 proposal:** four-plane gateway, sanitized replay, data echo, role floor, agent-lineage, token matching, change approval and realistic data strategy. **New review corrections introduced here:** separate proposed model tool call from authenticated execution, avoid overclaiming LLM thoughts/zero-code coverage, treat replay as suggestive, reduce MVP and dependencies, declare policy precedence and actual proof gates, distinguish output metrics from goals and separate existing research concepts from novel composition.

**Sources provided in project material; link/status not live verified:** [AgentDojo](https://github.com/ethz-spylab/agentdojo), [MELON](https://proceedings.mlr.press/v267/zhu25z.html), [CaMeL](https://arxiv.org/abs/2503.18813), [Task Shield](https://arxiv.org/abs/2412.16682), [Progent](https://arxiv.org/abs/2504.11703), [InjecAgent](https://github.com/uiuc-kang-lab/InjecAgent), [LLMail-Inject](https://huggingface.co/datasets/microsoft/llmail-inject-challenge), [tau2-bench](https://github.com/sierra-research/tau2-bench), [OWASP](https://genai.owasp.org/llm-top-10/), [OPA](https://www.openpolicyagent.org/), [OpenTelemetry](https://opentelemetry.io/).
