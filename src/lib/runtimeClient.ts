import { handleRuntime, initialState, type RuntimeState } from "./runtime";

declare const __DRIFTVEIL_API_BASE__: string;
const base = typeof __DRIFTVEIL_API_BASE__ === "string" ? __DRIFTVEIL_API_BASE__ : "";
const KEY = "driftveil-runtime-v1";
export const runtimeMode = base ? "api" : "local";
export const runtimeLocation = base ? "Server API · persistent JSON store" : "Local browser · this browser's storage";

function loadLocal(): RuntimeState {
  try { const s = JSON.parse(localStorage.getItem(KEY) ?? "null"); if (s?.version && Array.isArray(s.records)) return s; } catch { /* fall through to a fresh case */ }
  return initialState(Date.now());
}
function saveLocal(state: RuntimeState) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked: the in-memory result is still shown */ }
}
async function post<T>(op: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}/runtime/${op}`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) });
  } catch { throw new Error("The DRIFTVEIL API is unavailable or timed out. Nothing was recorded."); }
  const result = await response.json().catch(() => ({ error: `The API returned ${response.status}.` }));
  if (!response.ok) throw new Error(result.error || `The API returned ${response.status}.`);
  return result;
}

export async function runtimeCall<T = unknown>(op: string, body: Record<string, unknown> = {}, adminToken?: string): Promise<{ result: T; state: RuntimeState }> {
  if (base) {
    const result = await post<T>(op, body, op.startsWith("admin.") && adminToken ? { "X-Driftveil-Admin": adminToken } : {});
    return { result, state: await post<RuntimeState>("state.get", {}) };
  }
  // Local mode: the same handler runs in the browser. Approvals here are a labeled demo control, not protected authority.
  const out = handleRuntime(structuredClone(loadLocal()), op, body, { now: Date.now(), admin: op.startsWith("admin.") || op === "case.reset" });
  saveLocal(out.state);
  return { result: out.result as T, state: out.state };
}

export async function ingestPdf(buffer: ArrayBuffer, name: string) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length > 512 * 1024) throw new Error("PDF exceeds the 512 KiB demo limit.");
  if (base) {
    let binary = ""; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return runtimeCall("document.ingest", { name, base64: btoa(binary) });
  }
  const sha256 = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(b => b.toString(16).padStart(2, "0")).join("");
  const { extractPdf } = await import("./pdf");
  const { text, pages } = await extractPdf(bytes.slice()); // pdf.js may transfer the buffer it receives.
  return runtimeCall("document.ingest", { name, text, sha256, pages, bytes: bytes.length });
}

export async function runRuntimeEvaluation(): Promise<ReturnType<typeof import("./runtimeEvaluation").evaluateRuntime>> {
  if (base) return post("evaluation", {});
  const { evaluateRuntime } = await import("./runtimeEvaluation");
  return evaluateRuntime(`Browser: ${navigator.userAgent}`);
}
