const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

module.exports = () => {
  const resolve = Module._resolveFilename;
  Module._resolveFilename = function (request, ...args) {
    return resolve.call(this, request.startsWith('@/') ? path.resolve(__dirname, '../src', request.slice(2)) : request, ...args);
  };
  require.extensions['.tsx'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, file);
  const storage = new Map();
  global.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  try {
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const { MemoryRouter } = require('react-router-dom');
    const { useStore } = require('../src/store/useStore.ts');
    const { TooltipProvider } = require('../src/components/ui/radix.tsx');
    const Demo = require('../src/pages/Demo.tsx').default;
    const Reports = require('../src/pages/Reports.tsx').default;
    const Activity = require('../src/pages/Activity.tsx').default;
    const Incidents = require('../src/pages/Incidents.tsx').default;
    const { AppShell } = require('../src/components/layout/AppShell.tsx');
    require.extensions['.css'] = () => {};
    const Operations = require('../src/pages/Operations.tsx').default;
    const { runOutcome, runChange, runRecovery, changeFixture, outcomeFixture } = require('../src/lib/simulation.ts');
    const render = (Page, entry) => {
      // Zustand's server renderer reads its initial snapshot; mirror the tested browser state.
      Object.assign(useStore.getInitialState(), useStore.getState());
      return renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [entry] }, React.createElement(TooltipProvider, null, React.createElement(Page))));
    };
    assert.match(render(Demo, '/demo'), /Give the agent a clear business task/);
    assert.match(render(Demo, '/demo?step=invalid'), /Give the agent a clear business task/);
    assert.match(render(Reports, '/reports'), /No computed evidence yet/);
    assert.match(render(Activity, '/activity'), /No saved executions yet/);
    assert.equal(render(Activity, '/activity').includes('Recent sessions'), false);
    assert.match(render(Incidents, '/incidents'), /No findings match/);
    const navigation = render(AppShell, '/demo');
    assert.ok(navigation.includes('>Runtime<') && navigation.includes('>Console<') && navigation.includes('>More<'));
    assert.equal(navigation.includes('Role Contracts'), false);
    assert.equal(navigation.includes('Explore illustrative workspace'), false);
    assert.equal(navigation.includes('<aside'), false);
    assert.match(navigation, /aria-label="Primary"/);
    for (const route of ['/runtime', '/operations', '/reports']) assert.ok(navigation.includes(`href="${route}"`));
    // Secondary routes (activity, findings, task workspace, lab, settings) live in the More menu, rendered on open.
    const id = useStore.getState().demo.id;
    const benign = runOutcome(useStore.getState().demo.input);
    const held = runOutcome(outcomeFixture());
    const change = runChange(changeFixture());
    const recovery = runRecovery('poisoned', false, true);
    for (const run of [benign, held, change, recovery]) useStore.getState().recordProofRun({ ...run, workflowId: id });
    useStore.getState().updateDemo({ reviewedRunId: held.id });
    for (let step = 0; step < 6; step++) assert.ok(render(Demo, `/demo?step=${step}`).includes('Protect an agent workflow'));
    const report = render(Demo, '/demo?step=5');
    assert.equal((report.match(/>Recorded</g) ?? []).length, 5);
    assert.equal(report.includes('Not yet demonstrated'), false);
    assert.match(render(Reports, '/reports'), /Inspect snapshot/);
    assert.match(render(Activity, '/activity'), /Saved executions/);
    assert.match(render(Reports, `/reports?incident=DV-${held.id.slice(0, 8)}`), /Incident report:/);
    const persisted = JSON.parse(storage.get('driftveil-demo-v2')).state;
    assert.equal(persisted.demo.reviewedRunId, held.id);
    assert.equal(persisted.proofRuns.length, 4);
    const snapshot = JSON.stringify(useStore.getState().proofRuns);
    const { evaluateSynthetic } = require('../src/lib/simulationEvaluation.ts');
    useStore.getState().setEvaluation(evaluateSynthetic());
    assert.match(render(Operations, '/operations?view=evidence'), /Security controls &amp; evidence/);
    const evidence = render(Operations, '/operations?view=evidence');
    for (const text of ['Task rules + learned history', 'Bounded dependency workload']) assert.ok(evidence.includes(text), text);
    useStore.getState().updateDemo({ documentAttack: true });
    const documentRun = runOutcome(useStore.getState().demo.input, [], { documentAttack: true, autoHold: true, reviewAt: 40, credentialMatch: true, toolVersion: 1 });
    useStore.getState().recordProofRun({ ...documentRun, workflowId: id });
    const outcomePage = render(Operations, '/operations?view=outcome');
    assert.match(outcomePage, /Read HR salary records/);
    assert.match(outcomePage, /Evaluate document proposal/);
    assert.match(render(Operations, '/operations?view=change'), /Reference governance/);
    assert.match(render(Operations, '/operations?view=recovery'), /Incomplete provenance|Historical lineage preserved/);
    const allSnapshots = JSON.stringify(useStore.getState().proofRuns);
    useStore.getState().newDemo();
    assert.notEqual(useStore.getState().demo.id, id);
    assert.equal(JSON.stringify(useStore.getState().proofRuns), allSnapshots);
    assert.ok(allSnapshots.includes(snapshot.slice(1, -1)), 'Existing evidence remains unchanged');
    assert.match(render(Demo, '/demo?step=5'), /Not yet demonstrated/);
  } finally {
    Module._resolveFilename = resolve;
    delete global.localStorage;
  }
};
