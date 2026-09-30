/** The public API currently uses short polling; this keeps the UI subscription contract. */
export function subscribeWatchHistoryChanges(_userId, _onChange) {
  return () => {};
}
