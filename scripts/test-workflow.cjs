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
    assert.ok(navigation.includes('Guided workflow'));
    assert.equal(navigation.includes('Role Contracts'), false);
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
    useStore.getState().newDemo();
    assert.notEqual(useStore.getState().demo.id, id);
    assert.equal(JSON.stringify(useStore.getState().proofRuns), snapshot);
    assert.match(render(Demo, '/demo?step=5'), /Not yet demonstrated/);
  } finally {
    Module._resolveFilename = resolve;
    delete global.localStorage;
  }
};
