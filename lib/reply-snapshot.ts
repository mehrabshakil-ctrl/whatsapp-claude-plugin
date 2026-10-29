/** Capture only messages covered by a reply, without consuming newer work. */
export function coveredReplyIds(
  entries: readonly { id: string; chat_id: string }[],
  chatId: string,
  explicitIds?: readonly string[],
): Set<string> {
  const selected = explicitIds === undefined ? undefined : new Set(explicitIds);
  return new Set(entries
    .filter(entry => entry.chat_id === chatId && (selected === undefined || selected.has(entry.id)))
    .map(entry => entry.id));
}
