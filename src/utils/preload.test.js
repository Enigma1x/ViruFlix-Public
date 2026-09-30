import { describe, it, expect } from 'vitest';
import { inferRouteKeyFromPath } from './preload';

describe('inferRouteKeyFromPath', () => {
  it('mapea rutas principales correctamente', () => {
    expect(inferRouteKeyFromPath('/')).toBe('home');
    expect(inferRouteKeyFromPath('/search')).toBe('search');
    expect(inferRouteKeyFromPath('/movies')).toBe('movies');
    expect(inferRouteKeyFromPath('/series')).toBe('series');
    expect(inferRouteKeyFromPath('/live-tv')).toBe('liveTv');
  });

  it('mapea rutas dinámicas correctamente', () => {
    expect(inferRouteKeyFromPath('/movie/10')).toBe('movieDetails');
    expect(inferRouteKeyFromPath('/tv/10')).toBe('movieDetails');
    expect(inferRouteKeyFromPath('/watch/movie/10')).toBe('watch');
    expect(inferRouteKeyFromPath('/brand/disney')).toBe('brand');
    expect(inferRouteKeyFromPath('/anime/42')).toBe('animeDetails');
  });

  it('retorna null para rutas desconocidas', () => {
    expect(inferRouteKeyFromPath('/foo/bar')).toBe(null);
    expect(inferRouteKeyFromPath('')).toBe(null);
  });
});
