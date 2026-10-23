import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { buildSeed, type SeedState } from "@/data/seed";
import type {
  AgentStatus,
  Decoy,
  Incident,
  IncidentStatus,
  RoleContract,
  SecurityEvent,
  Signals,
} from "@/data/types";
import { computeRisk, emptySignals, mergeSignals, type RiskBreakdown } from "@/lib/risk";
import { pick, rng } from "@/lib/utils";
import { PROOF_NAMES, type ProofRun } from "@/lib/simulation";
import type { EvaluationReport } from "@/lib/simulationEvaluation";
import { demoFixture, type DemoState } from "@/lib/demo";

export type Theme = "dark" | "light";

export interface Settings {
  theme: Theme;
  liveStream: boolean;
  thresholds: { stepUp: number; restrict: number; quarantine: number };
  autoContain: boolean;
  compactTables: boolean;
  analystName: string;
}

export interface AppState extends SeedState {
  demo: DemoState;
  updateDemo: (patch: Partial<DemoState>) => void;
  newDemo: () => void;
  proofRuns: ProofRun[];
  recordProofRun: (run: ProofRun) => void;
  evaluation: EvaluationReport | null;
  setEvaluation: (report: EvaluationReport) => void;
  epoch: number;
  settings: Settings;
  sidebarCollapsed: boolean;

  toggleSidebar: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setAgentStatus: (agentId: string, status: AgentStatus, reason?: string) => void;
  updateIncident: (id: string, patch: Partial<Pick<Incident, "status" | "assignee" | "containment">>) => void;
  addIncidentNote: (id: string, text: string) => void;
  approveChange: (id: string, approver: string) => void;
  rejectChange: (id: string) => void;
  saveContract: (c: RoleContract) => void;
  submitContract: (id: string) => void;
  approveContract: (id: string) => void;
  pushLiveEvent: () => void;
  simulateGhostCall: (agentId: string) => void;
  addDecoy: (d: Omit<Decoy, "id" | "triggers" | "lastTriggeredHoursAgo" | "status">) => void;
  triggerDecoy: (id: string) => void;
  toggleDecoy: (id: string) => void;

  resetDemo: () => void;
}

const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  liveStream: false,
  thresholds: { stepUp: 40, restrict: 60, quarantine: 80 },
  autoContain: true,
  compactTables: false,
  analystName: "Nikhil Rao",
};

function freshState() {
  const epoch = Math.floor(Date.now() / 60_000) * 60_000;
  return {
    ...buildSeed(epoch),
    epoch,
    proofRuns: [] as ProofRun[],
    evaluation: null as EvaluationReport | null,
    demo: demoFixture(),
  };
}

let liveCounter = 0;

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...freshState(),
      settings: DEFAULT_SETTINGS,
      sidebarCollapsed: false,
      updateDemo: (patch) => set(s => ({ demo: { ...s.demo, ...patch } })),
      newDemo: () => set({ demo: demoFixture() }),
      setEvaluation: (evaluation) => set({ evaluation }),

      recordProofRun: (input) => set((s) => {
        const run = structuredClone(input);
        const agentFor = (agent: string) => agent === "finance-agent" ? "agt-finance-02" : "agt-procure-01";
        const agentIds = [...new Set(run.effects.map(e => agentFor(e.agent)))];
        const findings = run.assessments.filter(a => a.decision !== "allow");
        const peak = Math.max(0, ...run.assessments.map(a => a.score));
        const incidentId = `DV-${run.id.slice(0, 8)}`;
        const signals = run.assessments.reduce((acc, a) => mergeSignals(acc, a.signals), emptySignals());
        const incident: Incident = {
          id: incidentId, computed: true, simulated: true, title: `${PROOF_NAMES[run.kind]}: evaluated finding`,
          severity: peak >= 80 ? "critical" : "medium", status: "contained", agentIds, scenarioId: `computed-${run.kind}`,
          createdAt: run.at, risk: peak, signals, assignee: s.settings.analystName, summary: run.summary,
          rootCause: [...new Set(findings.flatMap(a => a.reasons))].join(" "),
          timeline: run.effects.map((e, i) => ({ ts: run.at + i, label: `${e.tool}: ${e.status}`, actor: "Mock executor", tone: e.status === "held" ? "warning" : "healthy" })),
          evidence: [{ id: run.id, kind: "policy", title: "Computed run snapshot", detail: JSON.stringify(run, null, 2), hash: run.id }],
          replay: { runs: [], verdict: "No counterfactual replay performed. Inspect the computed run snapshot in Simulation Lab.", confidence: "inconclusive" },
          containment: "hold", affectedResources: [...new Set(run.effects.filter(e => e.status === "held").map(e => e.resource))], notes: [],
        };
        return {
          proofRuns: [run, ...s.proofRuns],
          incidents: findings.length ? [incident, ...s.incidents] : s.incidents,
          events: [...run.effects.map((e, i): SecurityEvent => ({ id: `${run.id}-${i}`, ts: run.at + i,
            agentId: agentFor(e.agent), sessionId: run.id, kind: "policy", action: e.tool, target: e.resource, decision: e.decision,
            risk: run.assessments[i].score, detail: `[Computed ${run.engine}] ${e.status}: ${e.reasons.join(" ")}`,
            simulated: true, computed: true, ...(findings.length ? { incidentId } : {}) })).reverse(), ...s.events].slice(0, 500),
        };
      }),

      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      setAgentStatus: (agentId, status, reason) =>
        set((s) => {
          const agent = s.agents.find((a) => a.id === agentId);
          if (!agent) return s;
          const released = status === "protected";
          const ev: SecurityEvent = {
            id: `evt-c-${Date.now().toString(36)}`,
            ts: Date.now(),
            agentId,
            sessionId: "analyst",
            kind: "policy",
            action: released ? "release" : `containment:${status}`,
            target: agent.credentialId,
            decision: released ? "allow" : status === "quarantined" ? "quarantine" : status === "restricted" ? "restrict" : "hold",
            risk: released ? agent.baselineRisk : agent.risk,
            detail: reason ?? `Analyst set ${agent.name} to ${status} (simulated)`,
            simulated: true,
          };
          return {
            agents: s.agents.map((a) =>
              a.id === agentId ? { ...a, status, risk: released ? a.baselineRisk : a.risk } : a,
            ),
            events: [ev, ...s.events].slice(0, 500),
          };
        }),

      updateIncident: (id, patch) =>
        set((s) => ({
          incidents: s.incidents.map((i) =>
            i.id === id
              ? {
                  ...i,
                  ...patch,
                  timeline: [
                    ...i.timeline,
                    ...(patch.status
                      ? [{ ts: Date.now(), label: `Status set to ${patch.status.replace("_", " ")}`, actor: s.settings.analystName, tone: "accent" as const }]
                      : []),
                    ...(patch.assignee ? [{ ts: Date.now(), label: `Assigned to ${patch.assignee}`, actor: s.settings.analystName, tone: "neutral" as const }] : []),
                  ],
                }
              : i,
          ),
        })),

      addIncidentNote: (id, text) =>
        set((s) => ({
          incidents: s.incidents.map((i) =>
            i.id === id ? { ...i, notes: [...i.notes, { ts: Date.now(), author: s.settings.analystName, text }] } : i,
          ),
        })),

      approveChange: (id, approver) =>
        set((s) => {
          const changes = s.changes.map((c) => {
            if (c.id !== id) return c;
            const approvals = c.approvals.map((a) => (a.name === approver && !a.at ? { ...a, at: Date.now() } : a));
            const count = approvals.filter((a) => a.at).length;
            return { ...c, approvals, status: count >= c.requiredApprovals ? ("applied" as const) : c.status };
          });
          const ch = changes.find((c) => c.id === id)!;
          const contracts =
            ch.status === "applied"
              ? s.contracts.map((c) => {
                  if (c.id === ch.contractId) return { ...c, status: "active" as const, updatedHoursAgo: 0 };
                  // retire the previous active version of the same role for the same agent
                  if (c.agentIds.includes(ch.agentId) && c.status === "active" && c.id !== ch.contractId && ch.contractId !== c.id && c.role === s.contracts.find((x) => x.id === ch.contractId)?.role)
                    return { ...c, status: "draft" as const };
                  return c;
                })
              : s.contracts;
          const agents =
            ch.status === "applied"
              ? s.agents.map((a) => (a.id === ch.agentId && contracts.some((c) => c.id === ch.contractId) ? { ...a, contractId: ch.contractId } : a))
              : s.agents;
          return { changes, contracts, agents };
        }),

      rejectChange: (id) => set((s) => ({ changes: s.changes.map((c) => (c.id === id ? { ...c, status: "rejected" as const } : c)) })),

      saveContract: (c) =>
        set((s) => ({
          contracts: s.contracts.some((x) => x.id === c.id) ? s.contracts.map((x) => (x.id === c.id ? { ...c, updatedHoursAgo: 0 } : x)) : [...s.contracts, c],
        })),
      submitContract: (id) => set((s) => ({ contracts: s.contracts.map((c) => (c.id === id ? { ...c, status: "pending_approval" as const } : c)) })),
      approveContract: (id) => set((s) => ({ contracts: s.contracts.map((c) => (c.id === id ? { ...c, status: "active" as const, updatedHoursAgo: 0 } : c)) })),

      pushLiveEvent: () =>
        set((s) => {
          const r = rng(Date.now() % 100000);
          const healthy = s.agents.filter((a) => !a.isCanary && a.status !== "quarantined" && a.baselineTools.length);
          if (!healthy.length) return s;
          const a = pick(r, healthy);
          const tool = pick(r, a.baselineTools).tool;
          const ev: SecurityEvent = {
            id: `evt-l-${Date.now().toString(36)}-${liveCounter++}`,
            ts: Date.now(),
            agentId: a.id,
            sessionId: `ses-live-${(Math.floor(Date.now() / 120000) % 1000).toString()}`,
            kind: tool.includes("post") || tool === "send_email" ? "egress" : tool === "delegate" ? "delegation" : "tool_call",
            action: tool,
            target: a.status === "restricted" ? "scope-limited token" : "acme.internal",
            decision: "allow",
            risk: Math.max(3, Math.round(a.baselineRisk * 0.7 + r() * 10)),
            detail: `${tool} matched role contract ${a.contractId} (simulated live)`,
            simulated: true,
          };
          return { events: [ev, ...s.events].slice(0, 500) };
        }),

      simulateGhostCall: (agentId) =>
        set((s) => {
          const a = s.agents.find((x) => x.id === agentId);
          if (!a) return s;
          const now = Date.now();
          const receipt = {
            id: `rcpt-sim-${now.toString(36)}`,
            ts: now,
            agentId,
            credentialId: a.credentialId,
            method: "GET",
            endpoint: `${a.baselineTools[0]?.tool ?? "api"}/export?limit=5000`,
            sourceIp: "203.0.113.77",
            spanId: null,
            matched: false,
            scenario: "Simulated replay",
          };
          const ev: SecurityEvent = {
            id: `evt-g-${now.toString(36)}`,
            ts: now,
            agentId,
            sessionId: "no-session",
            kind: "credential",
            action: "token.reconcile",
            target: receipt.endpoint,
            decision: "block",
            risk: 82,
            detail: "API call carried the agent token but no matching reasoning span within 2s. Request rejected (simulated).",
            simulated: true,
          };
          return { receipts: [receipt, ...s.receipts], events: [ev, ...s.events].slice(0, 500) };
        }),

      addDecoy: (d) =>
        set((s) => ({ decoys: [{ ...d, id: `dcy-${(s.decoys.length + 1).toString().padStart(2, "0")}-${Date.now().toString(36).slice(-3)}`, triggers: 0, lastTriggeredHoursAgo: null, status: "armed" }, ...s.decoys] })),
      triggerDecoy: (id) =>
        set((s) => {
          const d = s.decoys.find((x) => x.id === id);
          if (!d) return s;
          const ev: SecurityEvent = {
            id: `evt-d-${Date.now().toString(36)}`,
            ts: Date.now(),
            agentId: "agt-canary-99",
            sessionId: "decoy-test",
            kind: "decoy",
            action: `decoy.touch:${d.name}`,
            target: d.plantedIn,
            decision: "quarantine",
            risk: 85,
            detail: `Test trigger of ${d.kind} decoy. Canary floor 85 applied (simulated).`,
            simulated: true,
          };
          return {
            decoys: s.decoys.map((x) => (x.id === id ? { ...x, triggers: x.triggers + 1, lastTriggeredHoursAgo: 0, status: "triggered" as const } : x)),
            events: [ev, ...s.events].slice(0, 500),
          };
        }),
      toggleDecoy: (id) => set((s) => ({ decoys: s.decoys.map((x) => (x.id === id ? { ...x, status: x.status === "disabled" ? ("armed" as const) : ("disabled" as const) } : x)) })),

      resetDemo: () => {
        const { settings } = get();
        set({ ...freshState(), settings: { ...DEFAULT_SETTINGS, theme: settings.theme } });
      },
    }),
    {
      name: "driftveil-demo-v2",
      storage: createJSONStorage(() => localStorage),
      version: 2,

    },
  ),
);

export function useRisk(signals: Partial<Signals>): RiskBreakdown {
  return computeRisk(signals);
}

export const INCIDENT_STATUSES: IncidentStatus[] = ["open", "investigating", "contained", "resolved", "false_positive"];
