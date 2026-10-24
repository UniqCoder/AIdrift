const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, file);
const sim = require('../src/lib/simulation.ts');
const { evaluateSynthetic } = require('../src/lib/simulationEvaluation.ts');
let checks = 0;
const check = (name, fn) => { fn(); checks++; process.stdout.write(`PASS ${name}\n`); };
const normal = () => ({ ...sim.contextFixture(), outcome: { ...sim.outcomeFixture(), selected: 'atlas' } });

check('calibration: 1% acceptable choice remains below hard tolerance', () => {
  const ctx = normal(); ctx.outcome.suppliers[1].price = 10100; ctx.outcome.selected = 'beacon';
  assert.equal(sim.execute(sim.actionFixture({ args: 'beacon' }), ctx).effect.status, 'committed');
});
check('calibration: equal qualified costs have zero regret', () => {
  const input = sim.outcomeFixture(); input.suppliers[1].price = 10000;
  assert.equal(sim.validateOutcome(input).loss, 0);
});
check('calibration: benign loss does not accumulate past threshold', () => {
  assert.equal(sim.trackDrift(Array(16).fill(0.002), sim.learnReference()).some(p => p.alert), false);
});
check('calibration: stable learned transition is not anomalous', () => {
  assert.equal(sim.assess(sim.actionFixture(), normal()).signals.sequenceAnomaly, 0);
});
check('same credentials/tools: editing supplier price changes outcome', () => {
  const input = sim.outcomeFixture();
  assert.equal(sim.runOutcome(input).effects.at(-1).status, 'held');
  input.suppliers[1].price = 9000;
  assert.equal(sim.runOutcome(input).effects.at(-1).status, 'committed');
});
check('deadline makes the premium supplier the optimal valid choice', () => {
  const input = sim.outcomeFixture(); input.task.deadline = 2;
  assert.equal(sim.runOutcome(input).effects.at(-1).status, 'committed');
});
check('complete read/purchase workflow restricts at the same fourth window as the detector', () => {
  const input = sim.outcomeFixture(); input.suppliers[1].price = 10300;
  const history = [];
  for (let i = 0; i < 4; i++) {
    const run = sim.runOutcome(input, history);
    assert.equal(run.effects[0].status, 'committed');
    assert.equal(run.assessments.at(-1).decision, i < 3 ? 'allow' : 'restrict');
    history.push(run.assessments.at(-1).outcome.loss);
  }
});
check('invalid or overflowing money, duplicate IDs and missing criteria hold', () => {
  for (const price of [-1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER]) {
    const ctx = normal(); ctx.outcome.suppliers[0].price = price;
    const read = sim.execute(sim.actionFixture({ tool: 'suppliers.read', resource: 'suppliers' }), ctx);
    assert.equal(read.effect.status, 'held'); assert.equal(read.effect.data, undefined);
    assert.equal(sim.execute(sim.actionFixture(), ctx).effect.status, 'held');
  }
  const duplicate = normal(); duplicate.outcome.suppliers[1].id = 'atlas';
  assert.equal(sim.assess(sim.actionFixture(), duplicate).decision, 'hold');
  const missing = normal(); delete missing.outcome.task.minQuality;
  assert.equal(sim.assess(sim.actionFixture(), missing).decision, 'hold');
});
check('zero optimum uses absolute loss instead of dividing by zero', () => {
  const ctx = normal(); ctx.outcome.suppliers[0].price = 0; ctx.outcome.selected = 'beacon';
  assert.equal(sim.validateOutcome(ctx.outcome).loss, null);
  assert.equal(sim.execute(sim.actionFixture({ args: 'beacon' }), ctx).effect.status, 'held');
});
check('unknown resource and missing lineage return no data', () => {
  for (const patch of [{ resource: 'unregistered' }, { inputs: [] }, { inputs: ['missing-source'] }]) {
    const r = sim.execute(sim.actionFixture({ tool: 'suppliers.read', resource: 'suppliers', ...patch }), normal());
    assert.equal(r.effect.status, 'held'); assert.equal(r.effect.data, undefined); assert.equal(r.ledger.length, 0);
  }
});
check('hard policy is enforced with behavioral holds disabled', () => {
  const ctx = normal(); ctx.autoHold = false; ctx.reviewAt = 100;
  ctx.outcome.selected = 'beacon';
  assert.equal(sim.execute(sim.actionFixture({ args: 'beacon' }), ctx).effect.status, 'held');
  assert.equal(sim.runChange(sim.changeFixture(), 'finance.internal', { autoHold: false }).effects[1].status, 'held');
});
check('cold start keeps task gates, without inventing learned confidence', () => {
  const ctx = normal(); ctx.reference = null;
  assert.equal(sim.assess(sim.actionFixture(), ctx).referenceId, null);
  ctx.outcome.selected = 'beacon';
  assert.equal(sim.execute(sim.actionFixture({ args: 'beacon' }), ctx).effect.status, 'held');
});
check('approved envelope accepts exact delta, holds pending or wrong scope', () => {
  const envelope = sim.changeFixture();
  assert.deepEqual(sim.runChange(envelope).effects.map(e => e.status), ['committed', 'held']);
  assert.equal(sim.runChange({ ...envelope, approved: false }).effects[0].status, 'held');
  assert.equal(sim.runChange({ ...envelope, effective: false }).effects[0].status, 'held');
  assert.equal(sim.runChange(envelope, 'other.internal').effects[0].status, 'held');
  envelope.scope = { tool: 'bank.export', resource: 'bank-records', destination: 'external.example', taskFamily: 'standard' };
  assert.equal(sim.runChange(envelope).effects[1].status, 'held');
});
check('receipt binds actual arguments and current authority', () => {
  const ctx = normal(); const action = sim.actionFixture();
  action.args = 'beacon';
  assert.equal(sim.execute(action, ctx).effect.status, 'held');
  assert.equal(sim.execute({ ...sim.actionFixture(), receipt: undefined }, ctx).effect.status, 'held');
  assert.equal(sim.execute(sim.actionFixture({}, 2), ctx).effect.status, 'held');
});
check('role and registered manifest checks cannot be bypassed by a matching mock receipt', () => {
  const ctx = normal();
  assert.equal(sim.execute(sim.actionFixture({ agent: 'unknown-agent' }), ctx).effect.status, 'held');
  assert.equal(sim.execute(sim.actionFixture({ tool: 'payment.commit', resource: 'payments', destination: 'finance.internal' }), ctx).effect.status, 'held');
  ctx.policyVersion = 2; ctx.envelope.scope.tool = 'unknown.tool'; ctx.envelope.scope.resource = 'purchases'; ctx.envelope.scope.destination = 'procurement.internal';
  assert.equal(sim.execute(sim.actionFixture({ tool: 'unknown.tool' }, 2), ctx).effect.status, 'held');
});
check('assessment cannot survive source, task or price changes', () => {
  const ctx = normal(); const action = sim.actionFixture(); const prior = sim.assess(action, ctx);
  ctx.outcome.suppliers[0].price = 12000;
  assert.equal(sim.execute(action, ctx, [], prior).effect.status, 'held');
});
check('unrelated source recall does not stale an independently supported effect', () => {
  const ctx = normal(); const action = sim.actionFixture(); const prior = sim.assess(action, ctx);
  ctx.artifacts.find(a => a.id === 'supplier-pdf').state = 'invalidated';
  assert.equal(sim.execute(action, ctx, [], prior).effect.status, 'committed');
  const trusted = sim.runRecovery('trusted', false, false);
  assert.equal(trusted.effects.find(e => e.actionId === 'payment-original').status, 'committed');
  const redundantRepair = sim.runRecovery('trusted', false, true);
  assert.equal(redundantRepair.ledger.filter(e => e.tool === 'payment.commit').length, 1);
  assert.equal(redundantRepair.effects.some(e => e.actionId === 'payment-repaired'), false);
});
check('idempotent retry adds no effect and changed binding is held', () => {
  const ctx = normal(); const action = sim.actionFixture();
  const first = sim.execute(action, ctx); const second = sim.execute(action, ctx, first.ledger);
  assert.equal(first.effect.status, 'committed'); assert.equal(second.effect.status, 'duplicate'); assert.equal(second.ledger.length, 1);
  const changed = sim.actionFixture({ args: 'beacon' });
  assert.equal(sim.execute(changed, ctx, second.ledger).effect.status, 'held');
});
check('recall traverses descendants, preserves independent work and repairs a fresh path', () => {
  const run = sim.runRecovery('poisoned', false, true);
  assert.equal(run.effects.filter(e => e.actionId === 'payment-original').every(e => e.status === 'held'), true);
  assert.equal(run.effects.find(e => e.actionId === 'independent').status, 'committed');
  assert.equal(run.ledger.filter(e => e.actionId === 'payment-repaired').length, 1);
  assert.equal(run.effects.at(-1).status, 'duplicate');
  assert.equal(run.artifacts.find(a => a.id === 'procurement-summary').parents[0], 'supplier-pdf');
  assert.equal(run.artifacts.find(a => a.id === 'procurement-summary').state, 'invalidated');
});
check('missing or cyclic lineage is unresolved, not clean', () => {
  const graph = sim.recoveryFixture(); graph.find(a => a.id === 'procurement-summary').parents = ['pending-payment'];
  assert.ok(sim.traceExposure(graph).unresolved.includes('pending-payment'));
  const run = sim.runRecovery('poisoned', true, true);
  assert.equal(run.effects.some(e => e.actionId === 'payment-repaired'), false);
});
check('topology edits fork the fixture, not historical contamination', () => {
  const old = sim.runRecovery('poisoned', false, false);
  const fresh = sim.recoveryFixture('trusted');
  assert.ok(!sim.traceExposure(fresh).affected.includes('pending-payment'));
  assert.ok(sim.traceExposure(old.artifacts).affected.includes('pending-payment'));
});
check('reference is learned only from the frozen benign split', () => {
  const before = sim.learnReference();
  assert.equal(before.samples, 12); assert.equal(before.transitionSamples, 24); assert.ok(before.mean > 0);
  sim.runOutcome(sim.outcomeFixture());
  assert.deepEqual(sim.learnReference(), before);
});
check('guided credential and tool controls reach the shared executor', () => {
  const input = normal().outcome;
  for (const options of [{ credentialMatch: false }, { toolVersion: 2 }]) {
    const run = sim.runOutcome(input, [], options);
    assert.equal(run.effects[0].status, 'committed');
    assert.equal(run.effects.at(-1).status, 'held');
    assert.equal(run.ledger.some(e => e.tool === 'vendor.purchase'), false);
  }
});
check('behavioral references are specific to the agent role and approved scope', () => {
  const before = sim.learnReference();
  const run = sim.runChange(sim.changeFixture());
  assert.equal(run.assessments[0].referenceId, null);
  const wrongAgent = { ...sim.changeFixture(), agent: 'procurement-agent' };
  assert.equal(sim.runChange(wrongAgent).effects[0].status, 'held');
  assert.deepEqual(sim.learnReference(), before);
});
check('reference promotion needs clean learning and separate validation, preserves prohibitions', () => {
  const envelope = sim.changeFixture();
  const samples = Array.from({ length: 4 }, () => sim.runChange(envelope));
  assert.equal(sim.learnChangeReference(envelope, samples.slice(0, 3)).reference, null);
  assert.equal(sim.learnChangeReference(envelope, Array(4).fill(samples[0])).reference, null);
  const candidate = sim.learnChangeReference(envelope, samples);
  assert.ok(candidate.reference);
  assert.equal(candidate.reference.samples, 3);
  const promoted = sim.runChange(envelope, 'finance.internal', { changeReference: candidate.reference });
  assert.equal(promoted.assessments[0].referenceId, candidate.reference.id);
  assert.deepEqual(promoted.effects.map(e => e.status), ['committed', 'held']);
  const input = normal().outcome; input.suppliers[1].price = 10300; input.selected = 'beacon';
  const highValidation = sim.runChange(envelope, 'finance.internal', {}, input);
  assert.equal(sim.learnChangeReference(envelope, [...samples.slice(0, 3), highValidation]).reference, null);
  const denied = sim.runChange({ ...envelope, approved: false });
  assert.equal(sim.learnChangeReference(envelope, [denied, denied, denied, denied]).reference, null);
});
check('one edited task flows through scheduling and recovery, independent work stays separate', () => {
  const input = normal().outcome;
  input.task.id = 'journey-custom'; input.task.quantity = 7; input.task.family = 'urgent'; input.task.deadline = 2; input.selected = 'beacon';
  const envelope = sim.changeFixture(); envelope.scope.taskFamily = 'urgent';
  const schedule = sim.runChange(envelope, 'finance.internal', {}, input);
  assert.deepEqual(schedule.effects.map(e => e.status), ['committed', 'held']);
  const recovered = sim.runRecovery('poisoned', false, true, {}, input);
  assert.equal(recovered.effects.find(e => e.actionId === 'independent').status, 'committed');
  assert.equal(recovered.effects.find(e => e.actionId === 'payment-repaired').status, 'committed');
  assert.equal(recovered.effects.at(-1).status, 'duplicate');
  assert.equal(recovered.input.input.task.quantity, 7);
  input.suppliers[1].eligible = false;
  assert.equal(sim.runChange(envelope, 'finance.internal', {}, input).effects[0].status, 'held');
  assert.equal(sim.runRecovery('poisoned', false, true, {}, input).effects.some(e => e.actionId === 'payment-repaired'), false);
});
check('workflow completion requires actual saved effects and a reviewed finding', () => {
  const { demoFixture, demoProgress } = require('../src/lib/demo.ts');
  const demo = demoFixture();
  assert.deepEqual(demoProgress([], null), [true, false, false, false, false]);
  const permitted = sim.runOutcome(demo.input);
  const held = sim.runOutcome(sim.outcomeFixture());
  const changed = sim.runChange(sim.changeFixture());
  const repaired = sim.runRecovery('poisoned', false, true);
  assert.deepEqual(demoProgress([permitted, held, changed, repaired], null), [true, true, false, true, true]);
  assert.deepEqual(demoProgress([permitted, held, changed, repaired], held.id), [true, true, true, true, true]);
});
check('document-derived salary proposal returns no salary data and preserves valid procurement', () => {
  const input = { ...sim.outcomeFixture(), selected: 'atlas' };
  const run = sim.runOutcome(input, [], { documentAttack: true, autoHold: false });
  const salary = run.effects.find(e => e.tool === 'hr.salary.read');
  assert.equal(salary.status, 'held'); assert.equal(salary.data, undefined);
  assert.equal(run.ledger.some(e => e.tool === 'hr.salary.read'), false);
  assert.equal(run.effects.at(-1).status, 'committed');
  assert.match(salary.reasons.join(' '), /Salary data is explicitly prohibited/);
  assert.match(salary.binding, /supplier-document/);
  assert.equal(sim.runOutcome(input).effects.some(e => e.tool === 'hr.salary.read'), false);
  const invalidInput = structuredClone(input); invalidInput.suppliers[0].price = -1;
  const invalid = sim.runOutcome(invalidInput, [], { documentAttack: true });
  assert.equal(invalid.effects.at(-1).status, 'held');
  assert.equal(invalid.effects.some(e => e.tool === 'hr.salary.read'), false, 'A blocked supplier read cannot produce the document-derived action');
  const costly = sim.runOutcome(sim.outcomeFixture(), [], { documentAttack: true });
  assert.equal(costly.effects.at(-1).status, 'held', 'Continuation cannot bypass an outcome violation');
});
check('comparisons execute matched controls and workload counts agree with independent ancestry', () => {
  const { compareControls, measureGraphWorkloads } = require('../src/lib/simulationEvaluation.ts');
  const report = compareControls();
  assert.deepEqual(report.outcome.map(r => r.hardChoiceHeld), [false, true, true]);
  assert.deepEqual(report.outcome.map(r => r.driftAlertWindow), [null, null, 4]);
  assert.equal(report.outcome.every(r => r.stableAlertWindow === null), true);
  assert.deepEqual(report.change.map(r => [r.schedulingAllowed, r.unrelatedExportHeld]), [[false, true], [true, true]]);
  assert.deepEqual(report.recovery.map(r => [r.affectedPaymentHeld, r.independentCompleted, r.repairedPaymentCompleted]), [[true, true, false], [true, true, true]]);
  for (const row of measureGraphWorkloads()) {
    assert.equal(row.correct, true); assert.equal(row.edges, row.nodes - 2);
    assert.equal(row.samples, 5); assert.ok(Number.isFinite(row.p50Ms) && row.p50Ms >= 0 && row.p95Ms >= row.p50Ms);
  }
});
check('measured held-out suite and recovery assertions pass', () => {
  const report = evaluateSynthetic();
  assert.equal(report.benign, 20); assert.equal(report.attacks, 12); assert.deepEqual(report.failures, []);
  assert.equal(report.detected, 12); assert.equal(report.falseHolds, 0); assert.equal(report.benignCompleted, 20); assert.equal(report.prohibitedEffects, 0);
  assert.equal(report.stream.alertWindow, 4); assert.equal(report.stream.benignAlertWindow, null);
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/synthetic-evaluation.json', JSON.stringify(report, null, 2));
});
check('operations snapshots invalidate on relevant draft and policy changes', () => {
  const { demoFixture } = require('../src/lib/demo.ts');
  const { matchesOperation } = require('../src/lib/operations.ts');
  const draft = demoFixture();
  const options = { autoHold: true, reviewAt: 40 };
  const run = sim.runOutcome(draft.input, [], { ...options, credentialMatch: draft.credentialMatch, toolVersion: draft.toolVersion });
  assert.equal(matchesOperation(run, draft, options), true);
  assert.equal(matchesOperation(run, { ...draft, history: [0, 0] }, options), true, 'Appending history does not alter saved purchase configuration');
  assert.equal(matchesOperation(run, { ...draft, coldStart: true }, options), false);
  assert.equal(matchesOperation(run, { ...draft, documentAttack: true }, options), false);
  assert.equal(matchesOperation(run, draft, { ...options, autoHold: false }), false);
  const original = JSON.stringify(run);
  draft.input.suppliers[0].price += 100;
  assert.equal(matchesOperation(run, draft, options), false);
  assert.equal(JSON.stringify(run), original, 'Draft edits must not rewrite saved evidence');
  const change = sim.runChange(draft.envelope, draft.destination, { ...options, changeReference: null }, draft.input);
  assert.equal(matchesOperation(change, draft, options), true);
  assert.equal(matchesOperation(change, { ...draft, destination: 'external.example' }, options), false);
  const recovery = sim.runRecovery(draft.branch, draft.missingLineage, true, options, draft.input);
  assert.equal(matchesOperation(recovery, draft, options), true);
  assert.equal(matchesOperation(recovery, { ...draft, missingLineage: true }, options), false);
});
check('operations topology preserves contamination, uncertainty and verified replacement paths', () => {
  const { topology, draftArtifacts } = require('../src/lib/operations.ts');
  const { demoFixture } = require('../src/lib/demo.ts');
  const input = { ...sim.outcomeFixture(), selected: 'atlas' };
  const repaired = sim.runRecovery('poisoned', false, true, {}, input);
  const nodes = topology(repaired.artifacts, repaired);
  assert.equal(nodes.find(n => n.id === 'pending-payment').status, 'affected');
  assert.equal(nodes.find(n => n.id === 'payment-rebuilt').status, 'verified');
  assert.equal(nodes.find(n => n.id === 'independent-order').status, 'clean');
  const draft = { ...demoFixture(), missingLineage: true };
  assert.equal(topology(draftArtifacts(draft)).find(n => n.id === 'pending-payment').status, 'unresolved');
  assert.equal(topology(sim.recoveryFixture('unknown')).find(n => n.id === 'procurement-summary').status, 'unresolved');
  assert.equal(nodes.find(n => n.id === 'procurement-summary').parents[0], 'supplier-pdf');
});
check('guided screens, computed reports and persisted case state stay connected', require('./test-workflow.cjs'));
process.stdout.write(`\n${checks} focused checks passed. Synthetic results: artifacts/synthetic-evaluation.json\n`);
