import { describe, expect, it } from 'vitest';
import { buildMalAnimeSearchQueries } from './tmdbService.js';

describe('buildMalAnimeSearchQueries', () => {
  it('genera una variante sin sufijo de temporada', () => {
    const queries = buildMalAnimeSearchQueries('Dandadan 3rd Season');
    expect(queries).toContain('Dandadan');
    expect(queries).toContain('Dandadan 3rd Season');
  });

  it('genera variantes sin sufijo de temporada para sinonimos', () => {
    const queries = buildMalAnimeSearchQueries('Titulo base', {
      synonyms: ['Dan Da Dan Season 2'],
    });
    expect(queries).toContain('Dan Da Dan');
  });
});
