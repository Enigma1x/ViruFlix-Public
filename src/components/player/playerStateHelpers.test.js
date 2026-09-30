import { describe, expect, it, vi } from 'vitest';
import { deriveWatchMainState, normalizeActions } from './playerStateHelpers';

describe('player state helpers', () => {
  it('returns loading and empty states', () => {
    expect(deriveWatchMainState({ loading: true }).variant).toBe('loading');
    expect(deriveWatchMainState({ streamUrl: null, onBack: vi.fn() }).variant).toBe('empty');
  });
  it('normalizes only valid actions', () => {
    const action = vi.fn();
    expect(normalizeActions([{ label: 'Retry', onClick: action, variant: 'primary' }, null])).toHaveLength(1);
  });
});
