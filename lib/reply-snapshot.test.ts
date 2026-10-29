import { expect, test } from 'bun:test';
import { coveredReplyIds } from './reply-snapshot';

const pending = [
  { id: 'original-task', chat_id: 'owner' },
  { id: 'arrived-while-busy', chat_id: 'owner' },
  { id: 'other-chat', chat_id: 'other' },
];

test('an old task reply leaves the next task outstanding', () => {
  expect([...coveredReplyIds(pending, 'owner', ['original-task'])]).toEqual(['original-task']);
});
test('approval previews and progress can consume no messages', () => {
  expect([...coveredReplyIds(pending, 'owner', [])]).toEqual([]);
});
test('omitting the option preserves existing chat snapshot semantics', () => {
  expect([...coveredReplyIds(pending, 'owner')]).toEqual(['original-task', 'arrived-while-busy']);
});
test('explicit IDs cannot consume messages from another chat', () => {
  expect([...coveredReplyIds(pending, 'owner', ['other-chat', 'unknown'])]).toEqual([]);
});
