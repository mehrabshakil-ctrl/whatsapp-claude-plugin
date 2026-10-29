import test from 'node:test';
import assert from 'node:assert/strict';
import { ApprovalRelay } from './codex-approvals.mjs';

const rpc = id => ({ id, method: 'item/commandExecution/requestApproval', params: { threadId: 'thread-a', turnId: 'turn-a', command: 'git status' } });

test('approval answers the exact RPC once and ignores stale or unknown reactions', async () => {
  const answers = [];
  const relay = new ApprovalRelay({ notify: async () => {}, respond: (...args) => answers.push(args) });
  const first = await relay.request(rpc(10));
  const second = await relay.request(rpc(11));
  assert.match(first, /^[a-km-z]{5}$/);
  assert.notEqual(first, second);
  assert.equal(relay.decide('xxxxx', 'allow'), false);
  assert.equal(relay.decide(first, 'allow'), true);
  assert.equal(relay.decide(first, 'deny'), false);
  assert.equal(relay.decide(second, 'deny'), true);
  assert.deepEqual(answers, [[10, { decision: 'accept' }], [11, { decision: 'decline' }]]);
  relay.close();
});

test('silence expires to decline rather than approval', async () => {
  const answers = [];
  const relay = new ApprovalRelay({ notify: async () => {}, respond: (...args) => answers.push(args), timeoutMs: 10 });
  const code = await relay.request(rpc(20));
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.deepEqual(answers, [[20, { decision: 'decline' }]]);
  assert.equal(relay.decide(code, 'allow'), false);
});

test('failed WhatsApp delivery declines immediately', async () => {
  const answers = [];
  const relay = new ApprovalRelay({ notify: async () => { throw new Error('offline'); }, respond: (...args) => answers.push(args) });
  await assert.rejects(relay.request(rpc(30)), /offline/);
  assert.deepEqual(answers, [[30, { decision: 'decline' }]]);
  assert.equal(relay.pending.size, 0);
});

test('server-resolved requests cannot be approved later', async () => {
  const answers = [];
  const relay = new ApprovalRelay({ notify: async () => {}, respond: (...args) => answers.push(args) });
  const code = await relay.request(rpc('server-id'));
  relay.forget('server-id');
  assert.equal(relay.decide(code, 'allow'), false);
  relay.close();
  assert.deepEqual(answers, []);
});

test('file changes support single-use approval; restricted decisions stay denied', async () => {
  const answers = [];
  const relay = new ApprovalRelay({ notify: async () => {}, respond: (...args) => answers.push(args) });
  const file = { ...rpc(40), method: 'item/fileChange/requestApproval' };
  relay.decide(await relay.request(file), 'allow');
  const restricted = rpc(41);
  restricted.params.availableDecisions = ['decline', 'cancel'];
  relay.decide(await relay.request(restricted), 'allow');
  assert.deepEqual(answers, [[40, { decision: 'accept' }], [41, { decision: 'decline' }]]);
});

test('shutdown declines every pending request without granting session-wide access', async () => {
  const answers = [];
  const relay = new ApprovalRelay({ notify: async () => {}, respond: (...args) => answers.push(args) });
  await relay.request(rpc(50));
  await relay.request(rpc(51));
  relay.close();
  assert.deepEqual(answers, [[50, { decision: 'decline' }], [51, { decision: 'decline' }]]);
});
