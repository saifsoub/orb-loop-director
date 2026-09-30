import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrbLoopState, reduceOrbLoop } from '../src/orbLoopDirector.ts';

test('steering supersedes queued and running work while preserving history', () => {
  let state = reduceOrbLoop(createOrbLoopState('session'), { type: 'USER_INPUT', input: 'Original goal' });
  for (const status of ['queued', 'running', 'cancelled', 'superseded']) {
    state = reduceOrbLoop(state, { type: 'AGENT_DISPATCHED', action: {
      id: status, owner: 'agent', description: status, startedAt: '2026-09-30T00:00:00Z', status
    }});
  }
  const previous = state;
  state = reduceOrbLoop(state, { type: 'STEER', instruction: 'Revised goal' });
  assert.deepEqual(state.actionsRunning.map(action => action.status), ['superseded', 'superseded', 'cancelled', 'superseded']);
  assert.equal(state.originalIntent, 'Original goal');
  assert.equal(state.activeGoal, 'Revised goal');
  assert.equal(state.revision, previous.revision + 1);
  assert.equal(previous.actionsRunning[0].status, 'queued');
  for (const actionId of ['queued', 'running']) {
    assert.equal(reduceOrbLoop(state, { type: 'ACTION_RESULT', actionId, result: 'obsolete' }), state);
    assert.equal(reduceOrbLoop(state, { type: 'ACTION_FAILED', actionId, error: 'obsolete' }), state);
  }
});

for (const type of ['USER_INPUT', 'VOICE_INPUT']) {
  test(type + ' replaces the active goal without accepting stale actions', () => {
    let state = reduceOrbLoop(createOrbLoopState('session'), { type: 'USER_INPUT', input: 'Original goal', context: { keep: true } });
    for (const status of ['queued', 'running']) {
      state = reduceOrbLoop(state, { type: 'AGENT_DISPATCHED', action: {
        id: status, owner: 'agent', description: status, startedAt: '2026-09-30T00:00:00Z', status
      }});
    }
    const item = { id: 'evidence', at: 'now', source: 'agent', kind: 'result', message: 'Completed work' };
    state = reduceOrbLoop(state, { type: 'EVIDENCE', item });
    const previous = state;
    const event = type === 'USER_INPUT'
      ? { type, input: 'Revised goal', context: { added: true } }
      : { type, transcript: 'Revised goal', context: { added: true } };
    state = reduceOrbLoop(state, event);
    assert.equal(state.originalIntent, 'Original goal');
    assert.equal(state.activeGoal, 'Revised goal');
    assert.equal(state.revision, previous.revision + 1);
    assert.deepEqual(state.currentContext, { keep: true, added: true });
    assert.deepEqual(state.evidence, [item]);
    assert.deepEqual(state.actionsRunning.map(action => action.status), ['superseded', 'superseded']);
    for (const actionId of ['queued', 'running']) {
      assert.equal(reduceOrbLoop(state, { type: 'ACTION_RESULT', actionId, result: 'obsolete' }), state);
      assert.equal(reduceOrbLoop(state, { type: 'ACTION_FAILED', actionId, error: 'obsolete' }), state);
    }
  });
}
