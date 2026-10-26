import http from 'node:http';
import engine from './dist/simulation.cjs';
import evaluation from './dist/simulationEvaluation.cjs';
import runtime from './dist/runtime.cjs';
import runtimeEvaluation from './dist/runtimeEvaluation.cjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { llmEnabled, llmModel, llmPlan } from './llm.mjs';

// Runtime state persists as one JSON document per case. Each browser sends its own random X-Driftveil-Case key,
// so concurrent visitors never share or reset each other's case. Storage: Postgres when DATABASE_URL is set
// (Render Postgres in production, the local DRIFTviel container in development), otherwise atomic JSON files.
// ponytail: single-process, serialized requests; one row/file per case; newest MAX_CASES kept.
const dataDir = () => process.env.DRIFTVEIL_DATA_DIR || path.join(import.meta.dirname, 'data');
const MAX_CASES = 500;
export const storageKind = () => process.env.DATABASE_URL ? 'postgres' : 'file';
function caseKey(headers) {
  const key = headers['x-driftveil-case'];
  if (key === undefined) return 'default';
  if (typeof key !== 'string' || !/^[a-z0-9-]{16,64}$/.test(key)) throw invalid('Invalid case key.');
  return key;
}
const caseFile = key => key === 'default' ? path.join(dataDir(), 'runtime.json') : path.join(dataDir(), 'cases', `${key}.json`);
let pool;
async function db() {
  if (pool) return pool;
  const { default: pg } = await import('pg');
  const next = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
  // json (not jsonb) keeps key order exactly, which the evidence hash chain depends on.
  await next.query('CREATE TABLE IF NOT EXISTS runtime_cases (case_key text PRIMARY KEY, state json NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())');
  return (pool = next);
}
export async function closeStore() { await pool?.end(); pool = undefined; }
const adminToken = () => process.env.DRIFTVEIL_ADMIN_TOKEN || 'demo-admin';
async function loadState(key) {
  if (storageKind() === 'postgres') {
    const { rows } = await (await db()).query('SELECT state FROM runtime_cases WHERE case_key = $1', [key]);
    return rows[0]?.state ?? runtime.initialState(Date.now());
  }
  try { return JSON.parse(fs.readFileSync(caseFile(key), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return runtime.initialState(Date.now()); }
}
async function saveState(key, state) {
  if (storageKind() === 'postgres') {
    const client = await db();
    await client.query('INSERT INTO runtime_cases (case_key, state, updated_at) VALUES ($1, $2, now()) ON CONFLICT (case_key) DO UPDATE SET state = EXCLUDED.state, updated_at = now()', [key, JSON.stringify(state)]);
    await client.query("DELETE FROM runtime_cases WHERE case_key <> 'default' AND case_key NOT IN (SELECT case_key FROM runtime_cases ORDER BY updated_at DESC LIMIT $1)", [MAX_CASES]);
    return;
  }
  const file = caseFile(key);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state));
  fs.renameSync(tmp, file);
  const dir = path.dirname(file);
  if (path.basename(dir) !== 'cases') return;
  const cases = fs.readdirSync(dir).filter(n => n.endsWith('.json')).map(n => ({ n, t: fs.statSync(path.join(dir, n)).mtimeMs }));
  if (cases.length > MAX_CASES) cases.sort((a, b) => a.t - b.t).slice(0, cases.length - MAX_CASES).forEach(c => fs.rmSync(path.join(dir, c.n), { force: true }));
}
let queue = Promise.resolve();
const serialized = task => (queue = queue.then(task, task));
export function runtimeRequest(op, body, headers = {}) {
  return serialized(async () => {
    if (!object(body)) throw invalid('Request must be a JSON object.');
    if (op === 'evaluation') return runtimeEvaluation.evaluateRuntime(`Node ${process.version}, ${os.platform()} ${os.arch()}, ${os.cpus()[0]?.model ?? 'unknown CPU'}`);
    const admin = typeof headers['x-driftveil-admin'] === 'string' && headers['x-driftveil-admin'].length === adminToken().length &&
      crypto.timingSafeEqual(Buffer.from(headers['x-driftveil-admin']), Buffer.from(adminToken()));
    const key = caseKey(headers);
    const state = await loadState(key);
    const input = { ...body }; delete input.plan; delete input.text; delete input.sha256; // Never accepted from clients.
    let plan = null;
    if (op === 'document.ingest') {
      if (typeof body.base64 !== 'string' || body.base64.length > 700000) throw invalid('Upload a PDF as base64 (at most 512 KiB).');
      const bytes = Buffer.from(body.base64, 'base64');
      if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') throw invalid('File is not a PDF.');
      const { extractText, getDocumentProxy } = await import('unpdf');
      let extracted;
      try { extracted = await extractText(await getDocumentProxy(new Uint8Array(bytes)), { mergePages: true }); }
      catch { throw invalid('The PDF could not be parsed.'); }
      Object.assign(input, { text: extracted.text.slice(0, 200000), pages: extracted.totalPages, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
      delete input.base64;
    }
    if (op === 'workflow.run' && body.agentMode === 'llm') {
      if (!llmEnabled()) throw invalid('LLM planner is not configured on this server. Use the local deterministic agent.');
      const documents = (Array.isArray(body.documents) ? body.documents : []).map(id => state.sources.find(s => s.id === id)).filter(Boolean);
      plan = await llmPlan({ task: { ...runtime.defaultTask(), ...(object(body.task) ? body.task : {}) }, suppliers: body.suppliers ?? state.suppliers.records, documents, catalog: runtime.TOOL_CATALOG });
    }
    delete input.agentMode;
    const { state: next, result } = runtime.handleRuntime(state, op, input, { now: Date.now(), admin, plan });
    if (op !== 'state.get' && op !== 'evidence.export') await saveState(key, next);
    return result;
  });
}

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const shortString = value => typeof value === 'string' && value.length > 0 && value.length <= 200;
const invalid = message => Object.assign(new Error(message), { status: 400 });
function purchase(value) {
  if (!object(value) || !object(value.task) || !shortString(value.task.id) || !['standard', 'urgent'].includes(value.task.family) ||
      !['quantity', 'deadline', 'minQuality', 'tolerance', 'absoluteTolerance'].every(key => typeof value.task[key] === 'number') ||
      !shortString(value.selected) || !Array.isArray(value.suppliers) || value.suppliers.length > 100 ||
      !value.suppliers.every(s => object(s) && shortString(s.id) && shortString(s.name) && typeof s.eligible === 'boolean' &&
        ['price', 'days', 'quality', 'version'].every(key => typeof s[key] === 'number'))) throw invalid('Invalid task or supplier records. Supply complete numeric fields and at most 100 offers.');
  return value;
}
function approval(value) {
  if (!object(value) || !object(value.scope) || !shortString(value.id) || !shortString(value.agent) ||
      !['from', 'to'].every(key => Number.isSafeInteger(value[key])) ||
      !['approved', 'effective'].every(key => typeof value[key] === 'boolean') ||
      !['tool', 'resource', 'destination', 'taskFamily'].every(key => shortString(value.scope[key]))) throw invalid('Invalid scoped approval.');
  return value;
}
function controls(value = {}) {
  if (!object(value) || Object.keys(value).some(key => !['autoHold', 'reviewAt', 'coldStart', 'credentialMatch', 'toolVersion', 'documentAttack', 'useChangeReference'].includes(key)) ||
      ['autoHold', 'coldStart', 'credentialMatch', 'documentAttack', 'useChangeReference'].some(key => value[key] !== undefined && typeof value[key] !== 'boolean') ||
      (value.reviewAt !== undefined && (!Number.isFinite(value.reviewAt) || value.reviewAt < 0 || value.reviewAt > 100)) ||
      (value.toolVersion !== undefined && ![1, 2].includes(value.toolVersion))) throw invalid('Invalid simulation controls. Behavioral references and thresholds are computed by the server.');
  return value;
}
function samples(envelope, destination, options, input) {
  const runs = Array.from({ length: 4 }, () => engine.runChange(envelope, destination, options, input));
  return { runs, ...engine.learnChangeReference(envelope, runs) };
}
export function dispatch(path, body) {
  if (!object(body)) throw invalid('Request must be a JSON object.');
  if (path === '/api/evaluation') return evaluation.evaluateSynthetic();
  const input = purchase(body.input);
  const raw = controls(body.options);
  const options = { autoHold: raw.autoHold ?? true, reviewAt: raw.reviewAt ?? 40 };
  if (path === '/api/outcome') {
    const history = body.previousLosses ?? [];
    if (!Array.isArray(history) || history.length > 256 || history.some(n => n !== null && (!Number.isFinite(n) || n < 0))) throw invalid('Decision history must contain at most 256 nonnegative losses.');
    return engine.runOutcome(input, history, { ...options, credentialMatch: raw.credentialMatch ?? true, toolVersion: raw.toolVersion ?? 1, documentAttack: raw.documentAttack ?? false, ...(raw.coldStart ? { reference: null } : {}) });
  }
  if (path === '/api/change' || path === '/api/reference') {
    const envelope = approval(body.envelope);
    if (!shortString(body.destination)) throw invalid('Supply the actual scheduling destination.');
    if (path === '/api/reference') return samples(envelope, body.destination, options, input);
    const reference = raw.useChangeReference ? samples(envelope, body.destination, options, input).reference : null;
    return engine.runChange(envelope, body.destination, { ...options, changeReference: reference }, input);
  }
  if (path === '/api/recovery') {
    if (!['poisoned', 'trusted', 'unknown'].includes(body.branch) || typeof body.missingLineage !== 'boolean' || typeof body.repair !== 'boolean') throw invalid('Supply a supported source, provenance status and repair choice.');
    return engine.runRecovery(body.branch, body.missingLineage, body.repair, options, input);
  }
  throw Object.assign(new Error('Unknown API endpoint.'), { status: 404 });
}
function readJSON(req, limit = 131072) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) { reject(Object.assign(new Error(`Request exceeds ${limit / 1024} KiB.`), { status: 413 })); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(invalid('Malformed JSON.')); }
    });
    req.on('error', reject);
  });
}
export function createServer() {
  const frontendOrigin = process.env.FRONTEND_ORIGIN;
  return http.createServer({ requestTimeout: 15000, headersTimeout: 10000, maxHeaderSize: 16384 }, async (req, res) => {
    const origin = req.headers.origin;
    const cors = origin && origin === frontendOrigin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
    const send = (status, value) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...cors, ...(status === 413 ? { Connection: 'close' } : {}) });
      res.end(JSON.stringify(value));
    };
    try {
      if (req.method === 'OPTIONS') {
        if (!cors['Access-Control-Allow-Origin']) return send(403, { error: 'Origin is not allowed.' });
        res.writeHead(204, { ...cors, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Driftveil-Admin, X-Driftveil-Case' });
        return res.end();
      }
      const path = new URL(req.url, 'http://localhost').pathname;
      if (req.method === 'GET' && ['/health', '/api/health'].includes(path)) return send(200, { status: 'ok', service: 'driftveil-api', engine: engine.ENGINE_VERSION, runtime: runtime.RUNTIME_VERSION, synthetic: true, usps: engine.PROOF_NAMES,
        agent: llmEnabled() ? `llm:${llmModel()}` : runtime.LOCAL_AGENT, storage: storageKind(), adminAuth: process.env.DRIFTVEIL_ADMIN_TOKEN ? 'configured token' : 'demo token (not enterprise authentication)' });
      const runtimeOp = path.match(/^\/api\/runtime\/([a-z.]+)$/)?.[1];
      if (runtimeOp) {
        if (![...runtime.RUNTIME_OPS, 'evaluation'].includes(runtimeOp)) return send(404, { error: 'Unknown runtime operation.' });
        if (req.method !== 'POST') return send(405, { error: 'Use POST with a JSON request.' });
        if (!req.headers['content-type']?.startsWith('application/json')) return send(415, { error: 'Use Content-Type: application/json.' });
        return send(200, await runtimeRequest(runtimeOp, await readJSON(req, 1048576), req.headers));
      }
      if (!['/api/outcome', '/api/change', '/api/reference', '/api/recovery', '/api/evaluation'].includes(path)) return send(404, { error: 'Unknown API endpoint.' });
      if (req.method !== 'POST') return send(405, { error: 'Use POST with a JSON request.' });
      if (!req.headers['content-type']?.startsWith('application/json')) return send(415, { error: 'Use Content-Type: application/json.' });
      const result = dispatch(path, await readJSON(req));
      if (result.engine && result.id) result.execution = 'api';
      for (const run of result.runs ?? []) run.execution = 'api';
      send(200, result);
    } catch (error) {
      send(error.status ?? 500, { error: error.status ? error.message : 'The simulation could not complete. No result was recorded.' });
    }
  });
}
