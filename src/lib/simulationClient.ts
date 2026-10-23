import { useRef, useState } from "react";
import { runOutcome, runChange, runRecovery, learnChangeReference, outcomeFixture, type ProofRun } from "./simulation";
import { evaluateSynthetic } from "./simulationEvaluation";

declare const __DRIFTVEIL_API_BASE__: string;
const base = typeof __DRIFTVEIL_API_BASE__ === "string" ? __DRIFTVEIL_API_BASE__ : "";
export const executionLocation = base ? "Server API" : "Local browser";

async function post<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}/${path}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000),
    });
  } catch { throw new Error("The simulation API is unavailable or timed out."); }
  let result;
  try { result = await response.json(); }
  catch { throw new Error(`The simulation API did not return a usable result (${response.status}).`); }
  if (!response.ok) throw new Error(result.error || `The API returned ${response.status}. Retry the execution.`);
  return result;
}

export const simulationClient = {
  async outcome(...args: Parameters<typeof runOutcome>): Promise<ProofRun> {
    const [input, previousLosses = [], options = {}] = args;
    return base ? post("outcome", { input, previousLosses, options: { autoHold: options.autoHold, reviewAt: options.reviewAt, credentialMatch: options.credentialMatch, toolVersion: options.toolVersion, coldStart: options.reference === null } }) : runOutcome(...args);
  },
  async change(...args: Parameters<typeof runChange>): Promise<ProofRun> {
    const [envelope, destination = "finance.internal", options = {}, input = { ...outcomeFixture(), selected: "atlas" }] = args;
    return base ? post("change", { input, envelope, destination, options: { autoHold: options.autoHold, reviewAt: options.reviewAt, useChangeReference: !!options.changeReference } }) : runChange(...args);
  },
  async recovery(...args: Parameters<typeof runRecovery>): Promise<ProofRun> {
    const [branch, missingLineage, repair, options = {}, input = { ...outcomeFixture(), selected: "atlas" }] = args;
    return base ? post("recovery", { input, branch, missingLineage, repair, options }) : runRecovery(...args);
  },
  async reference(envelope: Parameters<typeof runChange>[0], destination: string, options: Parameters<typeof runChange>[2], input: Parameters<typeof runChange>[3]): Promise<ReturnType<typeof learnChangeReference> & { runs: ProofRun[] }> {
    if (base) return post("reference", { input, envelope, destination, options });
    const runs = Array.from({ length: 4 }, () => runChange(envelope, destination, options, input));
    return { runs, ...learnChangeReference(envelope, runs) };
  },
  async evaluation(): Promise<ReturnType<typeof evaluateSynthetic>> {
    return base ? post("evaluation", {}) : evaluateSynthetic();
  },
};

export function useSimulationAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const perform = async (action: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try { await action(); }
    catch (cause) { setError(cause instanceof Error ? `${cause.message} No new result was saved. Check the inputs and API connection, then retry.` : "Execution failed. Check the inputs and API connection, then retry."); }
    finally { inFlight.current = false; setBusy(false); }
  };
  return { busy, error, perform };
}
