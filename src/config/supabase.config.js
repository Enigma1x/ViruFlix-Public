/** Public runtime configuration. No Supabase credentials belong in the renderer. */
export const PUBLIC_API_CONFIG = Object.freeze({
  BASE_URL: String(import.meta.env.VITE_PUBLIC_API_BASE_URL ?? '').trim().replace(/\/$/, ''),
  DEMO_MODE: String(import.meta.env.VITE_DEMO_MODE ?? 'true').toLowerCase() === 'true'
});

export function isPublicApiConfigured() {
  return Boolean(PUBLIC_API_CONFIG.BASE_URL);
}

export function isDemoMode() {
  // Demo data is the offline fallback. An API URL takes precedence even when
  // the public build flag remains true, so one build can be configured for a
  // deployed backend without exposing any secret.
  return !isPublicApiConfigured();
}

// Compatibility exports for legacy UI modules. They deliberately contain no
// project URL or key.
export const SUPABASE_CONFIG = Object.freeze({ URL: '', ANON_KEY: '' });
export function isSupabaseConfigured() {
  return isPublicApiConfigured();
}
