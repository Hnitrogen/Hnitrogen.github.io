import assert from 'node:assert/strict';
import test from 'node:test';
import {
  continuation, emptyWorkspace, makeSnapshot, parseLines,
  readWorkspace, replaceWorkspace, toggleLine,
} from '../src/lib/time-slice.ts';

test('pasted outlines retain hierarchy, notes, and independent child status', () => {
  const text = '- 周会\n        - [X] 整理数据\n                - 保留原始数据\n\n[时间片停止前留档]\n- 另一件事';
  const lines = parseLines(text);
  assert.deepEqual(lines.map(({ depth, task, done }) => ({ depth, task, done })), [
    { depth: 0, task: true, done: false },
    { depth: 1, task: true, done: true },
    { depth: 2, task: true, done: false },
    { depth: 0, task: false, done: false },
    { depth: 0, task: true, done: false },
  ]);
  const checked = toggleLine(text, 0);
  assert.equal(checked, text.replace('- 周会', '- [x] 周会'));
  assert.equal(toggleLine(text, 4), text, 'plain notes must not become tasks');
  assert.equal(toggleLine(text, 90), text);
  assert.equal(toggleLine(text, 1), text.replace('[X]', '[ ]'));
});

test('empty and mixed outlines handle tabs and display untrusted text as text', () => {
  assert.deepEqual(parseLines(' \n\n'), []);
  const lines = parseLines('- parent\n\t- child\n\t\t- <img src=x onerror=alert(1)>');
  assert.deepEqual(lines.map((line) => line.depth), [0, 1, 2]);
  assert.equal(lines[2].text, '<img src=x onerror=alert(1)>');
  assert.equal(continuation('  - [x] done'), '  - [ ] ');
  assert.equal(continuation('\t* note'), '\t* ');
  assert.equal(continuation('plain text'), null);
});

test('JSON backup round-trips the full workspace and rejects damaged versions', () => {
  const state = { ...emptyWorkspace(), document: '- [ ] 清单', focus: '专注', note: '下一步', updatedAt: '2026-10-29T10:00:00.000Z' };
  state.snapshots.push(makeSnapshot(state));
  assert.deepEqual(readWorkspace(JSON.stringify(state)), state);
  for (const data of [
    null, {}, { ...state, version: 2 }, { ...state, document: 42 },
    { ...state, snapshots: [null] }, { ...state, updatedAt: 'bad-date' },
    { ...state, snapshots: [{ ...state.snapshots[0], note: null }] },
    { ...state, snapshots: [{ ...state.snapshots[0], createdAt: 'bad-date' }] },
    { ...state, snapshots: [state.snapshots[0], state.snapshots[0]] },
  ]) assert.throws(() => readWorkspace(JSON.stringify(data)));
});

test('restoring and importing preserve current work and merge existing history', () => {
  const current = { ...emptyWorkspace(), document: '- 新进展', note: '不能丢' };
  const old = makeSnapshot({ ...emptyWorkspace(), document: '- 旧进展' }, new Date('2026-10-28T00:00:00Z'));
  current.snapshots = [old];
  const incoming = { ...emptyWorkspace(), document: '- 导入内容', snapshots: [old] };
  const restored = replaceWorkspace(current, incoming);
  assert.equal(restored.document, incoming.document);
  assert.equal(restored.snapshots.length, 2);
  assert.equal(restored.snapshots[0].document, current.document);
  assert.equal(restored.snapshots[0].note, current.note);
  assert.equal(restored.snapshots[1].id, old.id);
  assert.equal(current.document, '- 新进展');
  assert.equal(replaceWorkspace(emptyWorkspace(), incoming).snapshots.length, 1);
});
