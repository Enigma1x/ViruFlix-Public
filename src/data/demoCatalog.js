const DEMO_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

const movies = [
  { id: 101, title: 'The Demo Signal', overview: 'A small public catalog entry used to demonstrate ViruFlix without credentials.', release_date: '2025-01-10', poster_path: null, backdrop_path: null, genre_ids: [878], vote_average: 8.2, vote_count: 1200, popularity: 90, media_type: 'movie', runtime: 96, videoUrl: DEMO_VIDEO },
  { id: 102, title: 'Midnight Archive', overview: 'An original portfolio demo title for browsing, details, search, and playback.', release_date: '2024-09-12', poster_path: null, backdrop_path: null, genre_ids: [9648], vote_average: 7.8, vote_count: 840, popularity: 78, media_type: 'movie', runtime: 104, videoUrl: DEMO_VIDEO },
  { id: 103, title: 'Open Skies', overview: 'A calm sample film included in the public build.', release_date: '2023-04-20', poster_path: null, backdrop_path: null, genre_ids: [18], vote_average: 7.4, vote_count: 510, popularity: 65, media_type: 'movie', runtime: 88, videoUrl: DEMO_VIDEO }
];

const tv = [
  { id: 201, name: 'Signal Station', overview: 'A demo series showing season and episode navigation.', first_air_date: '2025-02-01', poster_path: null, backdrop_path: null, genre_ids: [18], vote_average: 8.1, vote_count: 900, popularity: 82, media_type: 'tv', number_of_seasons: 1, number_of_episodes: 3, episode_run_time: [42] },
  { id: 202, name: 'The Public Library', overview: 'A small series used by the portfolio demo catalog.', first_air_date: '2024-06-01', poster_path: null, backdrop_path: null, genre_ids: [35], vote_average: 7.6, vote_count: 330, popularity: 58, media_type: 'tv', number_of_seasons: 1, number_of_episodes: 2, episode_run_time: [30] }
];

export const DEMO_ANIME = [
  { node: { id: 301, title: 'Skybound Notes', main_picture: null, synopsis: 'A demo anime record used when MAL is not configured.', mean: 8.3, num_episodes: 12, start_date: '2025-01-01', media_type: 'tv', videoUrl: DEMO_VIDEO } },
  { node: { id: 302, title: 'Paper Lanterns', main_picture: null, synopsis: 'A second public demo anime entry.', mean: 7.9, num_episodes: 10, start_date: '2024-04-01', media_type: 'tv', videoUrl: DEMO_VIDEO } }
];

export const DEMO_CHANNELS = [
  { id: 'demo-news', name: 'ViruFlix News Demo', categoryId: 'news', category: 'News', categoryColor: 'bg-blue-600', description: 'Demo channel for the protected Live TV route.', logo: null, streamUrl: DEMO_VIDEO, priority: -1, region: 'DEMO', source: 'Public demo', countryCode: null, isNsfw: false },
  { id: 'demo-culture', name: 'ViruFlix Culture Demo', categoryId: 'culture', category: 'Culture', categoryColor: 'bg-purple-600', description: 'Demo channel for local mode.', logo: null, streamUrl: DEMO_VIDEO, priority: -1, region: 'DEMO', source: 'Public demo', countryCode: null, isNsfw: false }
];

export function demoMovie(id) { return movies.find((item) => String(item.id) === String(id)) || movies[0]; }
export function demoTv(id) { return tv.find((item) => String(item.id) === String(id)) || tv[0]; }
export function demoMovies() { return movies; }
export function demoTvShows() { return tv; }
export function demoSearch(query = '') {
  const q = String(query).toLowerCase();
  return [...movies, ...tv].filter((item) => String(item.title || item.name).toLowerCase().includes(q));
}
export function demoTmdbResponse(endpoint, params = {}) {
  const match = endpoint.match(/^\/(movie|tv)\/(\d+)(?:\/(recommendations|similar|videos|season\/(\d+)))?$/);
  if (match) {
    const [, kind, id, action, season] = match;
    const item = kind === 'movie' ? demoMovie(id) : demoTv(id);
    if (action === 'videos') return { results: [] };
    if (action === 'recommendations' || action === 'similar') return { results: kind === 'movie' ? movies : tv };
    if (action?.startsWith('season')) return { id: Number(id), season_number: Number(season), episodes: [1, 2, 3].map((number) => ({ id: Number(`${id}${number}`), episode_number: number, name: `Demo episode ${number}`, overview: item.overview, still_path: null, runtime: 42 })) };
    return item;
  }
  if (endpoint === '/search/movie' || endpoint === '/search/tv' || endpoint === '/search/multi') return { page: 1, total_results: demoSearch(params.query).length, results: demoSearch(params.query) };
  if (endpoint.startsWith('/discover/tv') || endpoint.startsWith('/tv/')) return { page: 1, results: tv, total_pages: 1, total_results: tv.length };
  return { page: 1, results: movies, total_pages: 1, total_results: movies.length };
}

export { DEMO_VIDEO };
