import './build-api.cjs';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
const { createServer } = await import('../server/app.mjs');
const { default: engine } = await import('../server/dist/simulation.cjs');

let server; let base;
const os = await import('node:os');
before(async () => {
  process.env.FRONTEND_ORIGIN = 'https://judge.example';
  process.env.DRIFTVEIL_DATA_DIR = fs.mkdtempSync(os.tmpdir() + '/driftveil-api-');
  process.env.DRIFTVEIL_ADMIN_TOKEN = 'test-admin-token';
  server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
const input = () => ({ ...engine.outcomeFixture(), selected: 'atlas' });
const post = async (path, body) => {
  const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
};

test('health identifies the service and updated USP names', async () => {
  const response = await fetch(base + '/health');
  const health = await response.json();
  assert.equal(response.status, 200); assert.equal(health.service, 'driftveil-api');
  assert.deepEqual(Object.values(health.usps), ['OutcomeGuard', 'DriftGate', 'ChainRestore']);
});
test('browser API access is limited to the configured frontend origin', async () => {
  const allowed = await fetch(base + '/api/outcome', { method: 'OPTIONS', headers: { Origin: 'https://judge.example', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://judge.example');
  const denied = await fetch(base + '/api/outcome', { method: 'OPTIONS', headers: { Origin: 'https://other.example', 'Access-Control-Request-Method': 'POST' } });
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
});
test('API executes the same valid, invalid and credential-bound purchase decisions', async () => {
  for (const [body, expected] of [
    [{ input: input() }, 'committed'], [{ input: engine.outcomeFixture() }, 'held'],
    [{ input: input(), options: { credentialMatch: false } }, 'held'],
    [{ input: input(), options: { toolVersion: 2 } }, 'held'],
  ]) {
    const { status, data } = await post('/api/outcome', body);
    assert.equal(status, 200); assert.equal(data.effects.at(-1).status, expected); assert.equal(data.execution, 'api');
  }
});
test('untrusted request shapes and client-authored baselines cannot reach the engine', async () => {
  for (const body of [null, {}, { input: { suppliers: [null] } }, { input: input(), options: { reference: { threshold: 999 } } },
    { input: input(), previousLosses: Array(257).fill(0) }]) {
    assert.equal((await post('/api/outcome', body)).status, 400);
  }
  const response = await fetch(base + '/api/outcome', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(response.status, 400);
  assert.equal((await fetch(base + '/api/outcome')).status, 405);
  assert.equal((await fetch(base + '/missing')).status, 404);
  const large = await post('/api/outcome', { input: input(), padding: 'x'.repeat(140000) });
  assert.equal(large.status, 413);
});
test('scoped approval and server-derived reference preserve the export prohibition', async () => {
  const body = { input: input(), envelope: engine.changeFixture(), destination: 'finance.internal' };
  const candidate = await post('/api/reference', body);
  assert.equal(candidate.status, 200); assert.equal(candidate.data.runs.length, 4); assert.ok(candidate.data.reference);
  const result = await post('/api/change', { ...body, options: { useChangeReference: true } });
  assert.deepEqual(result.data.effects.map(e => e.status), ['committed', 'held']);
  assert.equal(result.data.assessments[0].referenceId, candidate.data.reference.id);
  assert.equal((await post('/api/change', { ...body, destination: 'external.example' })).data.effects[0].status, 'held');
});
test('document salary boundary and unknown provenance match local policy', async () => {
  const { status, data } = await post('/api/outcome', { input: input(), options: { documentAttack: true } });
  assert.equal(status, 200);
  assert.equal(data.effects.find(e => e.tool === 'hr.salary.read').status, 'held');
  assert.equal(data.effects.find(e => e.tool === 'hr.salary.read').data, undefined);
  assert.equal(data.effects.at(-1).status, 'committed');
  const unresolved = await post('/api/recovery', { input: input(), branch: 'unknown', missingLineage: false, repair: true });
  assert.equal(unresolved.status, 200);
  assert.equal(unresolved.data.effects.some(e => e.actionId === 'payment-repaired'), false);
  assert.equal((await post('/api/outcome', { input: input(), options: { documentAttack: 'yes' } })).status, 400);
});
test('recovery holds inherited contamination, verifies new work and refuses unresolved provenance', async () => {
  const body = { input: input(), branch: 'poisoned', missingLineage: false, repair: true };
  const { data } = await post('/api/recovery', body);
  assert.equal(data.effects.find(e => e.actionId === 'payment-original').status, 'held');
  assert.equal(data.effects.find(e => e.actionId === 'independent').status, 'committed');
  assert.equal(data.effects.find(e => e.actionId === 'payment-repaired').status, 'committed');
  assert.equal(data.effects.at(-1).status, 'duplicate');
  const missing = await post('/api/recovery', { ...body, missingLineage: true });
  assert.equal(missing.data.effects.some(e => e.actionId === 'payment-repaired'), false);
});
test('evaluation stays repeatable and separate requests retain isolated ledgers', async () => {
  const report = await post('/api/evaluation', {});
  assert.equal(report.data.detected, 12); assert.equal(report.data.benignCompleted, 20); assert.deepEqual(report.data.failures, []);
  const results = await Promise.all([post('/api/outcome', { input: input() }), post('/api/outcome', { input: input() })]);
  assert.notEqual(results[0].data.id, results[1].data.id);
  assert.equal(results.every(r => r.data.ledger.length === 2), true);
});
test('frontend API client executes every workflow and surfaces server errors without a local fallback', async () => {
  const source = fs.readFileSync('src/lib/simulationClient.ts', 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    .replaceAll('__DRIFTVEIL_API_BASE__', JSON.stringify(base + '/api'))
    .replace(/require\("\.\/(simulation|simulationEvaluation)"\)/g, 'require("./$1.cjs")');
  fs.writeFileSync('server/dist/client-test.cjs', compiled);
  const { simulationClient: client, executionLocation } = (await import('../server/dist/client-test.cjs')).default;
  assert.equal(executionLocation, 'Server API');
  assert.equal((await client.outcome(input())).effects.at(-1).status, 'committed');
  assert.equal((await client.change(engine.changeFixture())).effects[1].status, 'held');
  assert.equal((await client.recovery('poisoned', false, true)).effects.at(-1).status, 'duplicate');
  assert.ok((await client.reference(engine.changeFixture(), 'finance.internal', {}, input())).reference);
  assert.equal((await client.evaluation()).detected, 12);
  await assert.rejects(client.outcome({ task: {} }), /Invalid task or supplier/);
});

const rt = (op, body = {}, headers = {}) => fetch(`${base}/api/runtime/${op}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })
  .then(async r => ({ status: r.status, data: await r.json() }));
test('runtime API: real PDF upload, persisted cross-agent state, admin-only approvals and recorded effects', async () => {
  await rt('case.reset');
  const pdf = fs.readFileSync('public/samples/poisoned-quote.pdf');
  const doc = await rt('document.ingest', { name: 'poisoned-quote.pdf', base64: pdf.toString('base64'), text: 'client text is ignored', sha256: 'f'.repeat(64) });
  assert.equal(doc.status, 200);
  assert.equal(doc.data.trust, 'untrusted');
  assert.match(doc.data.text, /hr\.salary\.read/, 'text is extracted on the server from the PDF bytes');
  assert.equal(doc.data.sha256, (await import('node:crypto')).createHash('sha256').update(pdf).digest('hex'));
  assert.equal((await rt('document.ingest', { name: 'x.pdf', base64: Buffer.from('not a pdf').toString('base64') })).status, 400);

  const injected = await rt('workflow.run', { documents: [doc.data.id], procurement: { followDocumentDirectives: true }, finance: { action: 'prepare' }, plan: { model: 'forged', proposals: [] } });
  assert.equal(injected.data.workflow.proposedBy, 'local-deterministic-agent', 'clients cannot inject model plans');
  assert.equal(injected.data.steps.find(s => s.proposal.tool === 'hr.salary.read').effect.status, 'held');
  assert.equal((await rt('workflow.run', { agentMode: 'llm' })).status, 400, 'LLM mode reports unavailable instead of pretending');

  assert.equal((await rt('admin.approve', { agent: 'finance-agent', tool: 'payment.schedule', destination: 'finance.internal', taskFamily: 'standard', approvedBy: 'agent' })).status, 403);
  assert.equal((await rt('admin.approve', { agent: 'finance-agent', tool: 'payment.schedule', destination: 'finance.internal', taskFamily: 'standard', approvedBy: 'demo-admin' }, { 'X-Driftveil-Admin': 'wrong-token-value' })).status, 403);
  const approval = await rt('admin.approve', { agent: 'finance-agent', tool: 'payment.schedule', destination: 'finance.internal', taskFamily: 'standard', approvedBy: 'demo-admin' }, { 'X-Driftveil-Admin': 'test-admin-token' });
  assert.equal(approval.status, 200);

  const recall = await rt('source.recall', { sourceId: doc.data.id });
  assert.deepEqual(recall.data.contained, [injected.data.workflow.finance.paymentActionId]);
  const recovery = await rt('recovery.run', { runId: injected.data.workflow.runId });
  assert.equal(recovery.data.status, 'verified');
  const again = await rt('recovery.run', { runId: injected.data.workflow.runId });
  assert.equal(again.data.status, 'verified-duplicate');

  const state = await rt('state.get');
  assert.equal(state.data.verified.valid, true);
  assert.equal(state.data.ledger.filter(e => e.tool === 'payment.commit').length, 1);
  assert.equal(state.data.ledger.some(e => e.tool === 'hr.salary.read'), false);
  const onDisk = JSON.parse(fs.readFileSync(process.env.DRIFTVEIL_DATA_DIR + '/runtime.json', 'utf8'));
  assert.deepEqual(onDisk.records.map(r => r.hash), state.data.records.map(r => r.hash), 'state persists between requests');
  const exported = await rt('evidence.export');
  assert.deepEqual(exported.data.records, state.data.records);
  assert.equal((await rt('no.such.op')).status, 404);
});
