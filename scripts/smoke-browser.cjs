// Run against a dedicated Chrome/Edge debug session on port 9223, never a personal profile.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.DRIFTVEIL_TEST_URL || 'http://127.0.0.1:5173';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function main() {
  const targets = await fetch('http://127.0.0.1:9223/json').then(r => r.json());
  const target = targets.find(t => t.type === 'page');
  assert.ok(target, 'Start a dedicated headless browser with remote debugging port 9223');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0; const pending = new Map(); const errors = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const entry = pending.get(message.id); pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message)); else entry.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); socket.send(JSON.stringify({ id: key, method, params })); });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const waitFor = async (expression, message = expression) => {
    for (let attempt = 0; attempt < 100; attempt++) { if (await evaluate(expression)) return; await pause(100); }
    throw new Error(`Timed out: ${message}`);
  };
  const click = async text => {
    await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)}); if (!b) throw Error('Missing button: ' + ${JSON.stringify(text)}); b.click(); })()`);
    await pause(100);
  };
  const checkbox = async text => {
    await evaluate(`(() => { const label = [...document.querySelectorAll('label')].find(l => l.textContent.includes(${JSON.stringify(text)})); if (!label) throw Error('Missing checkbox'); label.querySelector('input').click(); })()`);
    await pause(100);
  };
  const follow = async text => {
    await evaluate(`(() => { const a = [...document.querySelectorAll('a')].find(a => a.textContent.trim() === ${JSON.stringify(text)}); if (!a) throw Error('Missing link: ' + ${JSON.stringify(text)}); a.click(); })()`);
    await pause(150);
  };
  const disclosure = async (text, open = true) => {
    await evaluate(`(() => { const s = [...document.querySelectorAll('summary')].find(s => s.textContent.trim() === ${JSON.stringify(text)}); if (!s) throw Error('Missing disclosure: ' + ${JSON.stringify(text)}); if (s.parentElement.open !== ${open}) s.click(); })()`);
    await pause(100);
  };
  const state = () => evaluate("JSON.parse(localStorage.getItem('driftveil-demo-v2')).state");
  const run = async (button, count) => { await click(button); await waitFor(`JSON.parse(localStorage.getItem('driftveil-demo-v2'))?.state.proofRuns.length === ${count}`); return (await state()).proofRuns[0]; };
  const navigate = async path => { await send('Page.navigate', { url: base + path }); await pause(400); await waitFor("document.querySelector('main h1') !== null"); };
  try {
    await send('Runtime.enable'); await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1100, deviceScaleFactor: 1, mobile: false });
    await navigate('/');
    await waitFor("location.pathname === '/operations'");
    await navigate('/demo');
    await evaluate("localStorage.removeItem('driftveil-demo-v2')");
    await send('Page.reload'); await pause(500);
    await waitFor("document.body.innerText.includes('Give the agent a clear business task')");
    assert.equal(await evaluate("[...document.querySelectorAll('main input[type=number]')].filter(el => el.checkVisibility()).length"), 2, 'Only quantity and deadline should be expanded by default');
    assert.ok(await evaluate("[...document.querySelectorAll('a')].find(a => a.textContent.trim() === 'Run the purchase').getBoundingClientRect().bottom <= innerHeight"), 'The first action should fit in the desktop viewport');
    await disclosure('Quality & cost limits');
    assert.equal(await evaluate("[...document.querySelectorAll('main input[type=number]')].filter(el => el.checkVisibility()).length"), 4);
    await follow('Run the purchase');
    assert.ok(await evaluate("!document.querySelector('[aria-label=\"Beacon Supply unit price in paise\"]').checkVisibility()"), 'Offer editor should start collapsed');
    await disclosure('Edit supplier offers');
    assert.ok(await evaluate("document.querySelector('[aria-label=\"Beacon Supply unit price in paise\"]').checkVisibility()"));
    await disclosure('Edit supplier offers', false);
    await run('Run purchase', 1);
    assert.equal((await state()).proofRuns[0].effects.at(-1).status, 'committed');
    await evaluate(`(() => { const select = [...document.querySelectorAll('label')].find(l => l.textContent.includes("Agent's proposed supplier")).querySelector('select'); select.value = 'beacon'; select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await run('Run purchase', 2);
    assert.equal((await state()).proofRuns[0].effects.at(-1).status, 'held');
    await follow('Investigate the finding');
    await click('Record evidence review');
    assert.ok((await state()).demo.reviewedRunId);
    await follow('Review a legitimate change');
    await click('Use the best qualified supplier');
    let journey = await run('Check scheduling & bank export', 3);
    assert.deepEqual(journey.effects.map(e => e.status), ['held', 'held']);
    await checkbox('Approve payment scheduling');
    journey = await run('Check scheduling & bank export', 4);
    assert.deepEqual(journey.effects.map(e => e.status), ['committed', 'held']);
    await disclosure('Review approval scope');
    await disclosure('Advanced: validate a new baseline');
    await click('Collect & validate scheduling reference');
    await waitFor("JSON.parse(localStorage.getItem('driftveil-demo-v2')).state.demo.changeReference !== null");
    assert.equal((await state()).proofRuns.length, 8);
    await follow('Trace & recover affected work');
    journey = await run('Recall & check pending effects', 9);
    assert.equal(journey.effects.find(e => e.actionId === 'payment-original').status, 'held');
    journey = await run('Rebuild & verify recovery', 10);
    assert.equal(journey.effects.find(e => e.actionId === 'independent').status, 'committed');
    assert.equal(journey.effects.find(e => e.actionId === 'payment-repaired').status, 'committed');
    assert.equal(journey.effects.at(-1).status, 'duplicate');
    await disclosure('Source & recovery tests');
    await checkbox('Finance memory has incomplete provenance');
    journey = await run('Rebuild & verify recovery', 11);
    assert.equal(journey.effects.some(e => e.actionId === 'payment-repaired'), false);
    await follow('Review & export the evidence');
    await disclosure('Optional: run the synthetic evaluation');
    await click('Run evaluation checks');
    await evaluate("window.__createObjectURL = URL.createObjectURL; URL.createObjectURL = blob => { window.__evidenceBlob = blob; return window.__createObjectURL(blob); }");
    await click('Export this workflow evidence');
    const exported = await evaluate('window.__evidenceBlob.text().then(JSON.parse)');
    assert.equal(exported.runs.length, 11);
    assert.equal(exported.completedChecks.every(Boolean), true);
    assert.equal(exported.workflowId, (await state()).demo.id);
    await navigate('/reports');
    await waitFor("document.body.innerText.includes('Your saved runs, decisions and evidence in one place')");
    await navigate('/activity');
    assert.ok(await evaluate("!document.body.innerText.includes('Seeded history')"));
    await navigate('/demo?step=5');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    for (let step = 0; step < 6; step++) {
      await navigate('/demo?step=' + step);
      assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'Guided mobile step ' + step + ' must not overflow');
      assert.ok(await evaluate("document.querySelector('[aria-label=\"Workflow step\"]').checkVisibility()"), 'Mobile navigation should use a compact step selector');
    }
    await evaluate("(() => { const select = document.querySelector('[aria-label=\"Workflow step\"]'); select.value = '0'; select.dispatchEvent(new Event('change', { bubbles: true })); })()");
    await waitFor("location.search.includes('step=0')");
    await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1100, deviceScaleFactor: 1, mobile: false });
    await navigate('/demo?step=5');
    await click('Start another case');
    assert.equal((await state()).proofRuns.length, 11);
    assert.notEqual((await state()).demo.id, exported.workflowId);
    await follow('Run the purchase');
    await disclosure('Advanced security checks');
    await checkbox('Valid token used without');
    await waitFor("document.body.innerText.includes('A custom security check is active')");
    const mismatch = await run('Run purchase', 12);
    assert.equal(mismatch.effects.at(-1).status, 'held');
    process.stdout.write('PASS guided task, investigation, scoped approval, reference promotion, recovery, evidence export and non-destructive new case\n');

    await navigate('/lab');
    await evaluate("localStorage.removeItem('driftveil-demo-v2')");
    await send('Page.reload');
    await pause(500);
    await waitFor("document.body.innerText.includes('Live policy preview')");
    let result = await run('Execute next decision window', 1);
    assert.equal(result.effects.at(-1).status, 'held');
    const firstRun = result.id;
    await evaluate(`(() => { const input = document.querySelector('[aria-label="Beacon Supply price in paise"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '9000'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    result = await run('Execute next decision window', 2);
    assert.equal(result.effects.at(-1).status, 'committed');
    assert.equal(result.input.input.suppliers[1].price, 9000);
    await click('Load valid urgent purchase');
    result = await run('Execute next decision window', 3);
    assert.equal(result.effects.at(-1).status, 'committed');
    assert.equal(result.assessments.at(-1).referenceId, null);
    await click('Load slow drift (3% loss)');
    for (let i = 4; i <= 7; i++) result = await run('Execute next decision window', i);
    assert.equal(result.assessments.at(-1).decision, 'restrict');
    assert.equal(result.assessments.at(-1).drift.find(p => p.alert).window, 4);
    process.stdout.write('PASS outcome edits, urgent control and cumulative drift in browser\n');

    await click('DriftGate');
    result = await run('Execute both proposed actions', 8);
    assert.deepEqual(result.effects.map(e => e.status), ['committed', 'held']);
    await checkbox('Change approved');
    result = await run('Execute both proposed actions', 9);
    assert.deepEqual(result.effects.map(e => e.status), ['held', 'held']);
    process.stdout.write('PASS exact approved delta and pending-change holds in browser\n');

    await click('ChainRestore');
    await checkbox('Recompute affected workflow');
    result = await run('Execute recovery sandbox', 10);
    assert.equal(result.effects.find(e => e.actionId === 'independent').status, 'committed');
    assert.equal(result.effects.find(e => e.actionId === 'payment-original').status, 'held');
    assert.equal(result.ledger.filter(e => e.actionId === 'payment-repaired').length, 1);
    assert.equal(result.effects.at(-1).status, 'duplicate');
    fs.mkdirSync('artifacts', { recursive: true });
    const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync('artifacts/recovery-browser.png', Buffer.from(image.data, 'base64'));
    await checkbox('Finance memory has incomplete provenance');
    result = await run('Execute recovery sandbox', 11);
    assert.equal(result.effects.some(e => e.actionId === 'payment-repaired'), false);
    assert.ok(result.summary.includes('unresolved'));
    process.stdout.write('PASS recovery, independent completion, unresolved lineage and idempotency in browser\n');

    await click('Measured evaluation'); await click('Run held-out evaluation');
    const report = (await state()).evaluation;
    assert.equal(report.detected, 12); assert.equal(report.benignCompleted, 20); assert.deepEqual(report.failures, []);
    const count = (await state()).proofRuns.length;
    await navigate('/dashboard');
    await waitFor("document.body.innerText.includes('12/12 attack cases held')");
    const incident = (await state()).incidents.find(i => i.computed);
    await navigate('/incidents/' + incident.id);
    await waitFor("document.body.innerText.toLowerCase().includes('computed synthetic finding')");
    await navigate('/reports?incident=' + incident.id);
    await waitFor("document.body.innerText.includes('Incident report:')");
    await navigate('/lab?tab=outcome&run=' + firstRun);
    await waitFor("document.body.innerText.includes('Saved evidence:')");
    assert.equal((await state()).proofRuns.length, count);
    assert.equal((await state()).proofRuns.find(r => r.id === firstRun).input.input.suppliers[1].price, 14000);
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await pause(200);
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'Mobile viewport must not overflow');
    assert.deepEqual(errors, []);
    process.stdout.write('PASS persisted evidence, dashboard/report consistency, mobile layout; no uncaught browser exceptions\n');
    await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1100, deviceScaleFactor: 1, mobile: false });
  } finally { socket.close(); }
}
main().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
