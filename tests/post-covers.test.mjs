import assert from 'node:assert/strict';
import test from 'node:test';
import { assignPostCovers, readCoverAssignments, postCoverUrl, COVER_POOL_SIZE } from '../src/lib/post-covers.mjs';

test('损坏的会话和非法图片 ID 不会成为封面地址', () => {
  assert.equal(readCoverAssignments('{broken').size, 0);
  assert.equal(readCoverAssignments('{"url":"https://example.test"}').size, 0);
  const restored = readCoverAssignments(JSON.stringify([
    ['valid-post', 2], ['outside', COVER_POOL_SIZE + 1], ['zero', 0], ['decimal', 1.5], ['url', 'https://example.test'], ['../escape', 1], null,
  ]));
  assert.deepEqual([...restored], [['valid-post', 2]]);
  assert.throws(() => postCoverUrl(0), RangeError);
  assert.throws(() => postCoverUrl(COVER_POOL_SIZE + 1), RangeError);
});

test('新增文章不会抢占已有封面，正文与目录沿用同一分配', () => {
  const previous = new Map([['existing', 1]]);
  const directory = assignPostCovers(['new-post', 'existing'], previous, { poolSize: 5, random: () => 0 });
  assert.equal(directory.get('existing'), 1);
  assert.notEqual(directory.get('new-post'), 1);
  const restored = readCoverAssignments(JSON.stringify([...directory]));
  const article = assignPostCovers(['existing'], restored);
  assert.equal(article.get('existing'), directory.get('existing'));
  assert.equal(postCoverUrl(article.get('existing')), 'images/landscapes/alpine-drive-cover.webp');
});

test('刷新目录重新抽图，同一页尽量不重复且不复用原图', () => {
  const previous = new Map([['a', 1], ['b', 2], ['c', 3]]);
  const fresh = assignPostCovers(['a', 'b', 'c'], previous, { refresh: true, poolSize: 5, random: () => 0 });
  assert.equal(new Set(fresh.values()).size, 3);
  for (const [slug, id] of fresh) assert.notEqual(id, previous.get(slug));
  assert.deepEqual([...previous], [['a', 1], ['b', 2], ['c', 3]]);
});

test('文章多于图库时仍能分配有效图片，并修复重复的会话分配', () => {
  const fresh = assignPostCovers(['a', 'b', 'c'], new Map(), { poolSize: 2, random: () => 0 });
  assert.equal(fresh.size, 3);
  for (const id of fresh.values()) assert.ok(id >= 1 && id <= 2);
  const repaired = assignPostCovers(['a', 'b'], new Map([['a', 1], ['b', 1]]), { poolSize: 2, random: () => 0 });
  assert.equal(new Set(repaired.values()).size, 2);
});
