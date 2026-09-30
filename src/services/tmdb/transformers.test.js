import { describe, it, expect } from 'vitest';
import { transformMovie, transformMovies, getGenreName } from './transformers.js';

describe('transformers', () => {
  it('transformMovie devuelve null si el input no es un objeto', () => {
    expect(transformMovie(null)).toBeNull();
    expect(transformMovie(undefined)).toBeNull();
  });

  it('transformMovie mapea una película TMDB al formato interno', () => {
    const movie = {
      id: 99,
      title: 'Test Movie',
      overview: 'Desc',
      poster_path: '/p.jpg',
      backdrop_path: '/b.jpg',
      release_date: '2020-01-15',
      genre_ids: [28],
      popularity: 10,
      vote_average: 8,
      vote_count: 100,
      adult: false,
    };

    const out = transformMovie(movie);
    expect(out).toMatchObject({
      id: 99,
      title: 'Test Movie',
      overview: 'Desc',
      mediaType: 'movie',
      rank: null,
    });
    expect(out.posterUrl).toContain('p.jpg');
    expect(out.releaseYear).toBe(2020);
  });

  it('transformMovies filtra entradas inválidas', () => {
    const rows = [{ id: 1, title: 'A' }, null, { id: 2, title: 'B' }];
    const out = transformMovies(rows);
    expect(out).toHaveLength(2);
    expect(out[0].title).toBe('A');
  });

  it('getGenreName usa fallback para id desconocido', () => {
    expect(getGenreName(999999)).toBe('Película');
  });
});
