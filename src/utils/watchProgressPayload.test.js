import { describe, it, expect } from 'vitest';
import {
  VIDEASY_PLAYER_ORIGIN,
  parseVideasyPlayerMessage,
  videasyMessageMatchesRoute,
  getWatchProgressPayload,
} from './watchProgressPayload';

describe('parseVideasyPlayerMessage', () => {
  it('acepta JSON en string desde el origen Videasy', () => {
    const ev = {
      origin: VIDEASY_PLAYER_ORIGIN,
      data: JSON.stringify({
        id: 123,
        type: 'tv',
        progress: 50,
        timestamp: 600,
        duration: 2400,
        season: 1,
        episode: 3,
      }),
    };
    const p = parseVideasyPlayerMessage(ev);
    expect(p?.episode).toBe(3);
    expect(p?.progress).toBe(50);
  });

  it('rechaza otros orígenes', () => {
    const ev = { origin: 'https://evil.example', data: '{"id":1}' };
    expect(parseVideasyPlayerMessage(ev)).toBeNull();
  });
});

describe('videasyMessageMatchesRoute', () => {
  it('empata id y tipo', () => {
    expect(
      videasyMessageMatchesRoute(
        { id: 999, type: 'tv' },
        { type: 'tv', id: '999', details: null }
      )
    ).toBe(true);
    expect(
      videasyMessageMatchesRoute(
        { id: 1, type: 'tv' },
        { type: 'tv', id: '999', details: null }
      )
    ).toBe(false);
  });

  it('anime usa videasyPlaybackId si existe', () => {
    expect(
      videasyMessageMatchesRoute(
        { id: 21, type: 'anime' },
        { type: 'anime', id: 'mal-1', details: { videasyPlaybackId: 21 } }
      )
    ).toBe(true);
  });
});

describe('getWatchProgressPayload', () => {
  it('prioriza porcentaje y duración del embed', () => {
    const embedRef = {
      current: {
        progressPct: 95,
        durationSec: 1800,
        season: 1,
        episode: 7,
      },
    };
    const currentTimeRef = { current: 0 };
    const out = getWatchProgressPayload({
      type: 'tv',
      seasonParam: '1',
      episodeParam: '6',
      details: { episodeRunTime: [45] },
      embedRef,
      currentTimeRef,
    });
    expect(out.progress).toBe(95);
    expect(out.totalDuration).toBe(30);
    expect(out.seasonNumber).toBe(1);
    expect(out.episodeNumber).toBe(7);
  });

  it('sin embed calcula desde currentTime', () => {
    const embedRef = {
      current: { progressPct: null, durationSec: null, season: null, episode: null },
    };
    const currentTimeRef = { current: 600 };
    const out = getWatchProgressPayload({
      type: 'movie',
      seasonParam: '',
      episodeParam: '1',
      details: { runtime: 100 },
      embedRef,
      currentTimeRef,
    });
    expect(out.progress).toBe(10);
    expect(out.totalDuration).toBe(100);
  });
});
