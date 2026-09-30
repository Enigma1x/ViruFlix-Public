/** Public playback providers: Videasy first, local demo video as fallback. */
export const STREAM_PROVIDER_STORAGE_KEY = 'viruflix:preferred-stream-provider';
export const STREAM_PROVIDERS = Object.freeze({
  tmdb: Object.freeze({ id: 'tmdb', label: 'Videasy', description: 'Primary playback provider' }),
  demo: Object.freeze({ id: 'demo', label: 'Demo player', description: 'Local public-build fallback' })
});
export function getStreamProvider(id) { return STREAM_PROVIDERS[id] || null; }
export function getPreferredStreamProvider() {
  if (typeof window === 'undefined') return 'tmdb';
  try { return getStreamProvider(window.localStorage.getItem(STREAM_PROVIDER_STORAGE_KEY))?.id || 'tmdb'; } catch { return 'tmdb'; }
}
export function savePreferredStreamProvider(id) {
  if (!getStreamProvider(id) || typeof window === 'undefined') return;
  try { window.localStorage.setItem(STREAM_PROVIDER_STORAGE_KEY, id); } catch { /* ignore */ }
}
export function getFallbackProviders({ current = 'tmdb' } = {}) {
  return ['tmdb', 'demo'].filter((id) => id !== current && getStreamProvider(id));
}
