import { describe, expect, it } from 'vitest';
import { detectSeasonNumberFromAnimeTitle, getAnimeWatchPath } from './malService.js';

describe('detectSeasonNumberFromAnimeTitle', () => {
  it('detecta ordinal season', () => {
    expect(detectSeasonNumberFromAnimeTitle('Dandadan 3rd Season')).toBe(3);
  });

  it('detecta formato season N y temporada N', () => {
    expect(detectSeasonNumberFromAnimeTitle('Dan Da Dan Season 2')).toBe(2);
    expect(detectSeasonNumberFromAnimeTitle('Dan Da Dan Temporada 4')).toBe(4);
  });
});

describe('getAnimeWatchPath', () => {
  it('usa season detectada en título para tv playback', () => {
    const path = getAnimeWatchPath({
      title: 'Dandadan 3rd Season',
      tmdbPlayback: { tmdbType: 'tv', tmdbId: 12345 },
    }, 1);
    expect(path).toBe('/watch/tv/12345?season=3&episode=1');
  });
});
