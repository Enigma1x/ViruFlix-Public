import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('anilistService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getAnilistMediaIdFromMalId devuelve id cuando AniList responde', async () => {
    const { getAnilistMediaIdFromMalId } = await import('./anilistService.js');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({ data: { Media: { id: 154587 } } }),
    });

    const id = await getAnilistMediaIdFromMalId(9969);
    expect(id).toBe(154587);
  });

  it('getAnilistMediaIdFromMalId devuelve null si no hay Media', async () => {
    const { getAnilistMediaIdFromMalId } = await import('./anilistService.js');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ data: { Media: null } }),
    });

    expect(await getAnilistMediaIdFromMalId(1)).toBeNull();
  });

  it('parseTmdbPlaybackFromAnilistLinks detecta /tv/ y /movie/', async () => {
    const { parseTmdbPlaybackFromAnilistLinks } = await import('./anilistService.js');
    expect(
      parseTmdbPlaybackFromAnilistLinks([{ url: 'https://www.themoviedb.org/tv/63174-something' }])
    ).toEqual({ tmdbType: 'tv', tmdbId: 63174 });
    expect(
      parseTmdbPlaybackFromAnilistLinks([{ url: 'https://themoviedb.org/movie/3933' }])
    ).toEqual({ tmdbType: 'movie', tmdbId: 3933 });
    expect(parseTmdbPlaybackFromAnilistLinks([{ url: 'https://crunchyroll.com/x' }])).toBeNull();
  });
});
