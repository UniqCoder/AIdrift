// Uses an isolated Chrome profile on port 9223; never connect to a personal browser session.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.DRIFTVEIL_TEST_URL || 'http://127.0.0.1:5173';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function main() {
  const targets = await fetch('http://127.0.0.1:9223/json').then(r => r.json());
  const target = targets.find(t => t.type === 'page');
  assert.ok(target, 'Start an isolated browser on port 9223');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0; let stage = 'initial navigation'; const pending = new Map(); const errors = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) { const entry = pending.get(message.id); pending.delete(message.id); if (message.error) entry.reject(Error(message.error.message)); else entry.resolve(message.result); }
    else if (message.method === 'Runtime.exceptionThrown') errors.push(stage + ': ' + (message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text));
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const waitFor = async expression => {
    for (let attempt = 0; attempt < 150; attempt++) { if (await evaluate(`Boolean(${expression})`)) return; await pause(100); }
    throw Error(`Timed out: ${expression}`);
  };
  const click = async text => {
    stage = text;
    await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)}); if (!b) throw Error('Missing button: ' + ${JSON.stringify(text)}); b.click(); })()`);
    await pause(180);
  };
  const field = async (label, value) => {
    await evaluate(`(() => { const label = [...document.querySelectorAll('.operations label')].find(l => l.querySelector('span')?.textContent === ${JSON.stringify(label)}); const el = label?.querySelector('input,select'); if (!el) throw Error('Missing field'); Object.getOwnPropertyDescriptor(el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', {bubbles:true})); })()`);
    await pause(100);
  };
  const checkbox = async text => {
    await evaluate(`(() => { const l = [...document.querySelectorAll('.operations label')].find(l => l.textContent.includes(${JSON.stringify(text)})); if (!l) throw Error('Missing checkbox'); l.querySelector('input[type=checkbox]').click(); })()`);
    await pause(100);
  };
  const disclose = async text => {
    await evaluate(`(() => { const summary = [...document.querySelectorAll('summary')].find(s => s.textContent.trim() === ${JSON.stringify(text)}); if (!summary) throw Error('Missing disclosure'); if (!summary.parentElement.open) summary.click(); })()`);
    await pause(100);
  };
  const state = () => evaluate("JSON.parse(localStorage.getItem('driftveil-demo-v2')).state");
  const run = async button => {
    const before = (await state()).proofRuns.length;
    await click(button);
    await waitFor(`JSON.parse(localStorage.getItem('driftveil-demo-v2')).state.proofRuns.length > ${before}`);
    await waitFor("document.querySelector('.operations').getAttribute('aria-busy') === 'false'");
    return (await state()).proofRuns[0];
  };
  const output = path.resolve('.browser-test/operations-review'); fs.mkdirSync(output, { recursive: true });
  const screenshot = async name => {
    await evaluate('window.scrollTo(0, 0)'); await pause(100);
    const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(output, name + '.png'), Buffer.from(result.data, 'base64'));
  };
  try {
    await send('Page.enable'); await send('Page.navigate', { url: 'about:blank' }); await pause(200); await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1150, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: new URL('/operations', base).href });
    await waitFor("location.pathname === '/operations' && document.querySelector('.operations h1')");
    await evaluate("localStorage.removeItem('driftveil-demo-v2')"); await send('Page.reload'); await pause(600);
    await waitFor("document.querySelector('.operations h1')");
    await click('New case');
    await waitFor("localStorage.getItem('driftveil-demo-v2')");
    assert.equal(await evaluate("document.querySelector('aside') !== null || document.body.innerText.includes('Explore illustrative workspace')"), false, 'No sidebar or illustrative workspace launcher');
    for (const route of ['/activity', '/incidents', '/reports', '/demo', '/lab', '/settings', '/operations']) {
      await evaluate(`document.querySelector('nav[aria-label="Primary"] a[href="${route}"]').click()`);
      await waitFor(`location.pathname === '${route}' && document.querySelector('main h1')`);
      await pause(150);
    }
    assert.ok(await evaluate("parseFloat(getComputedStyle(document.querySelector('.op-body') || document.querySelector('.op-activity p')).fontSize) >= 16"), 'Readable operational body text');
    assert.ok(await evaluate("document.querySelector('.op-control-grid').getBoundingClientRect().top < document.querySelector('.op-overview-grid').getBoundingClientRect().top"), 'Core controls precede the detailed topology');
    await evaluate("document.querySelector('button[aria-label=\"Search\"]').click()");
    await waitFor("document.querySelector('[role=\"dialog\"] input[aria-label=\"Search\"]')");
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await waitFor("!document.querySelector('[role=\"dialog\"]')");
    await waitFor("document.querySelector('.op-topology-wrap canvas') || document.querySelector('.op-flat-topology')");
    await pause(1000); await screenshot('overview-desktop');
    assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false);
    await click('Accessible list');
    await waitFor("document.querySelector('.op-flat-topology')");
    await click('3D topology');
    await waitFor("document.querySelector('.op-topology-wrap canvas')");
    await evaluate("document.querySelector('.op-topology-wrap canvas').dispatchEvent(new Event('webglcontextlost'))");
    await waitFor("document.querySelector('.op-flat-topology')");
    await click('OutcomeGuard');
    let result = await run('Evaluate & execute purchase');
    assert.equal(result.effects.at(-1).status, 'committed');
    await click('Cost deviation');
    await waitFor("document.body.innerText.includes('Draft changed.')");
    result = await run('Evaluate & execute purchase');
    assert.equal(result.effects.at(-1).status, 'held');
    await screenshot('outcome-desktop');
    await click('Urgent delivery'); result = await run('Evaluate & execute purchase');
    assert.equal(result.effects.at(-1).status, 'committed');
    await click('Gradual drift');
    for (let i = 0; i < 4; i++) result = await run('Evaluate & execute purchase');
    assert.equal(result.effects.at(-1).decision, 'restrict');
    await click('Lowest cost');
    await click('DriftGate'); result = await run('Evaluate change & actions');
    assert.deepEqual(result.effects.map(e => e.status), ['held', 'held']);
    await checkbox('Approval completed'); result = await run('Evaluate change & actions');
    assert.deepEqual(result.effects.map(e => e.status), ['committed', 'held']);
    await field('Actual scheduling destination', 'external.example'); result = await run('Evaluate change & actions');
    assert.deepEqual(result.effects.map(e => e.status), ['held', 'held']);
    await field('Actual scheduling destination', 'finance.internal');
    await disclose('Behavior reference & learning');
    await click('Collect & validate reference');
    await waitFor("JSON.parse(localStorage.getItem('driftveil-demo-v2')).state.demo.changeReference !== null");
    await screenshot('change-desktop');
    await click('ChainRestore'); result = await run('Recall & enforce holds');
    assert.equal(result.effects.find(e => e.actionId === 'payment-original').status, 'held');
    result = await run('Rebuild & verify');
    assert.equal(result.effects.find(e => e.actionId === 'payment-repaired').status, 'committed');
    assert.equal(result.effects.find(e => e.actionId === 'independent').status, 'committed');
    assert.equal(result.effects.at(-1).status, 'duplicate');
    await pause(700); await screenshot('recovery-desktop');
    await click('payment-rebuilt');
    assert.ok(await evaluate("document.querySelector('.op-node-inspector').innerText.includes('verified')"));
    await checkbox('Finance memory has incomplete provenance'); result = await run('Rebuild & verify');
    assert.equal(result.effects.some(e => e.actionId === 'payment-repaired' && e.status === 'committed'), false);
    assert.ok(await evaluate("document.querySelector('.op-node-buttons').innerText.includes('finance-memory')"));
    await click('OutcomeGuard'); await click('Lowest cost');
    assert.equal(await evaluate("[...document.querySelectorAll('summary')].find(s => s.textContent === 'Document misuse test').parentElement.open"), false);
    await disclose('Document misuse test');
    await checkbox('Include document-derived salary-read proposal');
    result = await run('Evaluate document proposal & purchase');
    assert.equal(result.effects.find(e => e.tool === 'hr.salary.read').status, 'held');
    assert.equal(result.effects.find(e => e.tool === 'hr.salary.read').data, undefined);
    assert.equal(result.effects.at(-1).status, 'committed');
    assert.ok(await evaluate("document.body.innerText.includes('Read HR salary records')"));
    await click('Evidence'); await click('Run evaluation suite');
    await waitFor("document.querySelector('.op-evaluation')");
    assert.deepEqual((await state()).evaluation.failures, []);
    assert.equal(await evaluate("[...document.querySelectorAll('summary')].find(s => s.textContent === 'Compare security controls').parentElement.open"), false);
    await disclose('Control coverage & limits');
    await disclose('Compare security controls');
    await disclose('Dependency workload measurements');
    assert.ok(await evaluate("document.body.innerText.includes('Security controls & evidence') && document.body.innerText.includes('Task rules + learned history') && document.body.innerText.includes('Bounded dependency workload')"));
    assert.equal((await state()).evaluation.graphWorkloads.every(row => row.correct), true);
    await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: output });
    await click('Export evidence'); await pause(500);
    const currentCase = (await state()).demo.id;
    const exported = fs.readdirSync(output).find(name => name === `driftveil-operations-${currentCase.slice(0, 8)}.json`);
    assert.ok(exported, 'Evidence download exists');
    const evidence = JSON.parse(fs.readFileSync(path.join(output, exported), 'utf8'));
    assert.equal(evidence.synthetic, true); assert.equal(evidence.workflowId, currentCase);
    assert.equal(evidence.runs.length, (await state()).proofRuns.filter(r => r.workflowId === currentCase).length);
    await screenshot('evidence-desktop');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    for (const tab of ['Overview', 'OutcomeGuard', 'DriftGate', 'ChainRestore', 'Evidence']) {
      await click(tab); await pause(200);
      assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false, `${tab}: mobile overflow`);
    }
    await click('Overview'); await screenshot('overview-mobile');
    await click('OutcomeGuard'); await screenshot('outcome-mobile');
    await evaluate("document.querySelector('[aria-label=\"Toggle theme\"]').click()");
    await waitFor("document.documentElement.dataset.theme === 'light'");
    assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false, 'Light theme overflow');
    await screenshot('outcome-light-mobile');
    await evaluate("document.querySelector('[aria-label=\"Toggle theme\"]').click()");
    await evaluate("document.querySelector('.op-tabs button').focus()");
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    assert.equal(await evaluate('document.activeElement.textContent.trim()'), 'OutcomeGuard', 'Workspace navigation supports keyboard focus');
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await click('Overview');
    assert.equal(await evaluate("document.querySelector('.op-graph-toolbar button').getAttribute('aria-pressed')"), 'false');
    const before = (await state()).proofRuns.length; const caseId = (await state()).demo.id;
    await click('New case'); assert.notEqual((await state()).demo.id, caseId);
    assert.equal((await state()).proofRuns.length, before, 'New case preserves historical executions');
    assert.deepEqual(errors, [], 'No uncaught browser exceptions');
    console.log('PASS operational purchase/urgency/drift, scoped changes/reference, recall/repair/uncertainty, topology/fallback, evidence export, mobile overflow, reduced motion and case preservation.');
    console.log('Screenshots and evidence: ' + output);
  } finally { socket.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
