import { beforeEach, describe, expect, it } from 'vitest';
import { getFallbackProviders, getPreferredStreamProvider, savePreferredStreamProvider } from './providerManager';

describe('public playback providers', () => {
  beforeEach(() => {
    const values = new Map();
    Object.defineProperty(window, 'localStorage', { configurable: true, value: { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, String(value)) } });
  });
  it('uses Videasy by default and stores a valid provider', () => {
    expect(getPreferredStreamProvider()).toBe('tmdb');
    savePreferredStreamProvider('demo');
    expect(getPreferredStreamProvider()).toBe('demo');
  });
  it('falls back to the local demo player', () => {
    expect(getFallbackProviders({ current: 'tmdb' })).toEqual(['demo']);
  });
});
