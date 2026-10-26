// Browser end-to-end check of the three runtime demonstrations (local mode). Drives the UI, then asserts on the
// recorded runtime state (ledger, queue, evidence chain), not on badges. Uses an isolated browser on port 9223.
const assert = require('node:assert/strict');
const base = process.env.DRIFTVEIL_TEST_URL || 'http://127.0.0.1:5173';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function main() {
  const target = (await fetch('http://127.0.0.1:9223/json').then(r => r.json())).find(t => t.type === 'page');
  assert.ok(target, 'Start an isolated browser with --remote-debugging-port=9223');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0; const pending = new Map(); const errors = [];
  socket.onmessage = e => { const m = JSON.parse(e.data); if (m.id) { pending.get(m.id)[m.error ? 'reject' : 'resolve'](m.error ? Error(m.error.message) : m.result); pending.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text); };
  const send = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
  const waitFor = async expression => { for (let i = 0; i < 100; i++) { if (await evaluate(`Boolean(${expression})`)) return; await pause(100); } throw Error(`Timed out: ${expression}`); };
  const idle = () => waitFor("!document.querySelector('.rt-busy')");
  const click = async text => { await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(${JSON.stringify(text)}) || b.querySelector('b')?.textContent === ${JSON.stringify(text)}); if (!b) throw Error('Missing button: ' + ${JSON.stringify(text)}); b.click(); })()`); await pause(150); await idle(); };
  const go = async view => { await send('Page.navigate', { url: new URL(`/runtime${view ? `?view=${view}` : ''}`, base).href }); await waitFor("document.querySelector('.rt h1')"); await idle(); };
  const state = () => evaluate("JSON.parse(localStorage.getItem('driftveil-runtime-v1'))");
  const committed = (s, tool) => s.ledger.filter(e => e.status === 'committed' && e.tool === tool);
  await send('Page.enable'); await send('Runtime.enable');
  await go(''); await evaluate("localStorage.removeItem('driftveil-runtime-v1')"); await go('');

  await go('outcome');
  await click('Hidden harmful choice'); await click('Run agent');
  let s = await state();
  assert.equal(committed(s, 'vendor.purchase').length, 0, 'B: harmful purchase produced no effect');
  assert.equal(s.records.filter(r => r.type === 'gateway').at(-1).data.decision.outcome.loss, 0.3);
  await click('Justified exception'); await click('Run agent');
  s = await state(); assert.equal(committed(s, 'vendor.purchase').length, 1, 'C: urgent exception committed');
  await click('Run 8 windows');
  assert.ok(await evaluate("[...document.querySelectorAll('.dv-drift-label')].some(t => t.textContent === 'drift detected · window 4')"), 'D: drift restricts at window 4');

  await go('change');
  await click('Grant approval'); await click('Run workflow');
  s = await state();
  assert.equal(committed(s, 'payment.schedule').length, 1, 'E: approved scheduling committed');
  assert.equal(committed(s, 'bank.export').length, 0, 'E: bank export held');
  await click('Revoke'); await click('Run workflow');
  s = await state(); assert.equal(committed(s, 'payment.schedule').length, 1, 'F: revoked approval schedules nothing new');

  await go('recovery');
  await click('Load sample PDF');
  await waitFor("document.body.innerText.includes('poisoned-quote.pdf')");
  await click('Run with PDF'); await click('Run independent');
  s = await state();
  assert.equal(s.ledger.some(e => e.tool === 'hr.salary.read'), false, 'L: no salary effect');
  await click('Recall source'); await click('Commit queue');
  s = await state();
  assert.equal(s.queue.filter(q => q.status === 'held').length, 1, 'G: contaminated payment held');
  assert.equal(s.queue.filter(q => q.status === 'committed').length, 1, 'H: independent payment committed');
  const before = committed(s, 'payment.commit').length;
  await click('Recover'); await click('Retry recovery');
  s = await state();
  assert.equal(committed(s, 'payment.commit').length, before + 1, 'I/J: one recovered payment, retry adds nothing');

  await go('evidence');
  assert.equal(await evaluate("document.querySelector('.rt-proof h2').textContent"), 'Intact', 'N: evidence chain intact');
  assert.deepEqual(errors, [], 'no uncaught exceptions');
  socket.close();
  process.stdout.write('Runtime browser smoke passed: B, C, D, E, F, G, H, I, J, L, N against recorded state.\n');
}
main().catch(error => { console.error(error); process.exit(1); });
