import { beforeEach, describe, expect, it } from 'vitest';
import { clearSession, getStoredUser, saveSession } from './publicApiClient';

describe('public API session boundary', () => {
  beforeEach(() => {
    const values = new Map();
    Object.defineProperty(window, 'localStorage', { configurable: true, value: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) } });
  });
  it('stores only session metadata supplied by the API', () => {
    saveSession({ access_token: 'access', refresh_token: 'refresh', user: { id: 'user-1' } });
    expect(getStoredUser()).toEqual({ id: 'user-1' });
    clearSession();
    expect(getStoredUser()).toBeNull();
  });
});
