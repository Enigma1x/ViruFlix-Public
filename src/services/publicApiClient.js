import { PUBLIC_API_CONFIG, isDemoMode } from '../config/supabase.config.js';

export const PUBLIC_API_STORAGE = Object.freeze({
  ACCESS_TOKEN: 'viruflix_public_access_token',
  REFRESH_TOKEN: 'viruflix_public_refresh_token',
  USER: 'viruflix_public_user'
});

export class PublicApiError extends Error {
  constructor(message, code = 'PUBLIC_API_ERROR', status = 0) {
    super(message);
    this.name = 'PublicApiError';
    this.code = code;
    this.status = status;
  }
}

function storage() {
  return typeof window === 'undefined' ? null : window.localStorage;
}

export function getAccessToken() {
  return storage()?.getItem(PUBLIC_API_STORAGE.ACCESS_TOKEN) || '';
}

export function saveSession(session = {}) {
  const store = storage();
  if (!store) return;
  if (session.access_token) store.setItem(PUBLIC_API_STORAGE.ACCESS_TOKEN, session.access_token);
  if (session.refresh_token) store.setItem(PUBLIC_API_STORAGE.REFRESH_TOKEN, session.refresh_token);
  if (session.user) store.setItem(PUBLIC_API_STORAGE.USER, JSON.stringify(session.user));
}

export function clearSession() {
  const store = storage();
  if (!store) return;
  Object.values(PUBLIC_API_STORAGE).forEach((key) => store.removeItem(key));
}

export function getStoredUser() {
  try {
    const value = storage()?.getItem(PUBLIC_API_STORAGE.USER);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  if (isDemoMode() || !PUBLIC_API_CONFIG.BASE_URL) {
    throw new PublicApiError('The public API is not configured. Enable backend mode to use this action.', 'API_NOT_CONFIGURED');
  }
  const { auth = true, body, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers || {});
  headers.set('Accept', 'application/json');
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  if (auth && getAccessToken()) headers.set('Authorization', `Bearer ${getAccessToken()}`);
  const response = await fetch(`${PUBLIC_API_CONFIG.BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    const error = payload.error || {};
    throw new PublicApiError(error.message || `Request failed with status ${response.status}`, error.code || 'HTTP_ERROR', response.status);
  }
  return payload.data;
}

function query(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');
  return entries.length ? `?${new URLSearchParams(entries.map(([key, value]) => [key, String(value)]))}` : '';
}

export const publicApi = Object.freeze({
  request,
  auth: {
    async signIn(identifier, password) {
      const data = await request('/auth/sign-in', { method: 'POST', auth: false, body: { identifier, password } });
      saveSession(data?.session || data || {});
      return data;
    },
    async signUp(email, password, username) {
      const data = await request('/auth/sign-up', { method: 'POST', auth: false, body: { email, password, username } });
      saveSession(data?.session || {});
      return data;
    },
    async refresh() {
      const refreshToken = storage()?.getItem(PUBLIC_API_STORAGE.REFRESH_TOKEN);
      const data = await request('/auth/refresh', { method: 'POST', auth: false, body: { refresh_token: refreshToken } });
      saveSession(data?.session || data || {});
      return data;
    },
    me: () => request('/auth/me'),
    updatePassword: (password) => request('/auth/update-password', { method: 'POST', body: { password } }),
    forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', auth: false, body: { email } }),
    signOut: async () => { clearSession(); return { success: true }; }
  },
  profile: {
    get: () => request('/profile'),
    update: (updates) => request('/profile', { method: 'PATCH', body: updates })
  },
  history: {
    list: (limit = 50) => request(`/history${query({ limit })}`),
    save: (entry) => request('/history', { method: 'POST', body: entry }),
    update: (id, entry) => request(`/history/${encodeURIComponent(id)}`, { method: 'PATCH', body: entry }),
    remove: (id) => request(`/history/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
  recommendations: (limit = 20) => request(`/recommendations${query({ limit })}`),
  catalog: {
    tmdb: (path, params = {}) => request(`/catalog/tmdb${path}${query(params)}`),
    mal: (path, params = {}) => request(`/catalog/mal${path}${query(params)}`)
  },
  liveTv: {
    channels: (params = {}) => request(`/live-tv/channels${query(params)}`)
  },
  admin: {
    users: () => request('/admin/users'),
    approval: (userId, approved) => request('/admin/approval', { method: 'POST', body: { user_id: userId, approved } }),
    role: (userId, role) => request('/admin/role', { method: 'POST', body: { user_id: userId, role } }),
    stats: () => request('/admin/stats')
  }
});

export function onPublicAuthStateChange(callback) {
  const handler = () => callback?.('SIGNED_IN', { user: getStoredUser() });
  if (typeof window === 'undefined') return { data: { subscription: { unsubscribe() {} } } };
  window.addEventListener('viruflix:auth-change', handler);
  return { data: { subscription: { unsubscribe: () => window.removeEventListener('viruflix:auth-change', handler) } } };
}

export function emitAuthChange(event = 'SIGNED_IN') {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('viruflix:auth-change', { detail: event }));
}
