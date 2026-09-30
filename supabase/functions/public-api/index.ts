import { createClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.86.0';

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const corsOrigins = (Deno.env.get('CORS_ALLOWED_ORIGINS') ?? '*').split(',').map((value) => value.trim()).filter(Boolean);

const sources = [
  ['https://iptv-org.github.io/iptv/countries/mx.m3u', 0, 'LATAM', 'Mexico'],
  ['https://iptv-org.github.io/iptv/countries/ar.m3u', 0, 'LATAM', 'Argentina'],
  ['https://iptv-org.github.io/iptv/countries/co.m3u', 0, 'LATAM', 'Colombia'],
  ['https://iptv-org.github.io/iptv/countries/cl.m3u', 0, 'LATAM', 'Chile'],
  ['https://iptv-org.github.io/iptv/countries/pe.m3u', 0, 'LATAM', 'Peru'],
  ['https://iptv-org.github.io/iptv/countries/ve.m3u', 0, 'LATAM', 'Venezuela'],
  ['https://iptv-org.github.io/iptv/countries/cr.m3u', 0, 'LATAM', 'Costa Rica'],
  ['https://iptv-org.github.io/iptv/countries/es.m3u', 2, 'ES', 'Spain'],
  ['https://iptv-org.github.io/iptv/languages/spa.m3u', 3, 'SPA', 'Spanish'],
  ['https://iptv-org.github.io/iptv/languages/eng.m3u', 4, 'ENG', 'English'],
  ['https://iptv-org.github.io/iptv/countries/int.m3u', 5, 'INT', 'International'],
  ['https://iptv-org.github.io/iptv/index.m3u', 6, 'GLOBAL', 'Global index']
] as const;

function json(data: Json, status = 200, request?: Request) {
  const origin = request?.headers.get('origin') ?? '';
  const allowOrigin = corsOrigins.includes('*') || corsOrigins.includes(origin) ? (corsOrigins.includes('*') ? '*' : origin) : corsOrigins[0] ?? '*';
  return new Response(status === 204 ? null : JSON.stringify({ data }), { status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': allowOrigin, 'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS', vary: 'Origin' } });
}

function failure(code: string, message: string, status: number, request: Request) {
  return new Response(JSON.stringify({ error: { code, message } }), { status, headers: json(null, status, request).headers });
}

async function body(request: Request) { try { return await request.json(); } catch { return {}; } }
function token(request: Request) { const header = request.headers.get('authorization') ?? ''; return header.startsWith('Bearer ') ? header.slice(7).trim() : ''; }

async function requireUser(request: Request): Promise<User> {
  const accessToken = token(request);
  if (!accessToken) throw new Error('AUTH_REQUIRED');
  const { data, error } = await admin.auth.getUser(accessToken);
  if (error || !data.user) throw new Error('AUTH_INVALID');
  return data.user;
}

async function profileFor(userId: string) {
  const { data, error } = await admin.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

async function requireAdmin(request: Request) {
  const user = await requireUser(request);
  const profile = await profileFor(user.id);
  if (profile?.role !== 'admin') throw new Error('ADMIN_REQUIRED');
  return user;
}

async function emailForIdentifier(identifier: string) {
  if (identifier.includes('@')) return identifier;
  const { data } = await admin.from('profiles').select('id,email').or(`username.eq.${identifier},user_id.eq.${identifier}`).maybeSingle();
  if (data?.email) return data.email;
  if (data?.id) {
    const result = await admin.auth.admin.getUserById(data.id);
    return result.data.user?.email ?? null;
  }
  return null;
}

function authData(data: { session?: unknown; user?: unknown }) { return { session: data.session ?? null, user: data.user ?? null }; }

async function proxyCatalog(kind: 'tmdb' | 'mal', path: string, query: URLSearchParams, request: Request) {
  const base = kind === 'tmdb' ? 'https://api.themoviedb.org/3' : 'https://api.myanimelist.net/v2';
  const remote = new URL(`${base}${path}`);
  query.forEach((value, key) => remote.searchParams.set(key, value));
  const headers: HeadersInit = { accept: 'application/json' };
  if (kind === 'tmdb') {
    const accessToken = Deno.env.get('TMDB_ACCESS_TOKEN');
    const apiKey = Deno.env.get('TMDB_API_KEY');
    if (accessToken) headers.authorization = `Bearer ${accessToken}`;
    else if (apiKey) remote.searchParams.set('api_key', apiKey);
  } else {
    const clientId = Deno.env.get('MAL_CLIENT_ID');
    if (clientId) headers['X-MAL-CLIENT-ID'] = clientId;
  }
  const response = await fetch(remote, { headers });
  if (!response.ok) return failure('CATALOG_UPSTREAM', `Catalog provider returned ${response.status}.`, response.status, request);
  return json(await response.json(), 200, request);
}

function parsePlaylist(raw: string, source: readonly [string, number, string, string]) {
  const result: Record<string, unknown>[] = [];
  let meta: Record<string, string> | null = null;
  for (const line of raw.split(/\r?\n/).map((item) => item.trim())) {
    if (line.startsWith('#EXTINF')) {
      const name = line.slice(line.indexOf(',') + 1).trim() || 'Unnamed channel';
      const logo = line.match(/tvg-logo="([^"]*)"/)?.[1] || null;
      const category = line.match(/group-title="([^"]*)"/)?.[1] || 'General';
      meta = { name, logo: logo ?? '', category };
    } else if (meta && line && !line.startsWith('#')) {
      result.push({ id: `${source[2]}-${result.length}-${meta.name}`, name: meta.name, logo: meta.logo || null, categoryId: String(meta.category).toLowerCase().replace(/[^a-z0-9]+/g, '-'), category: meta.category, categoryColor: 'bg-gray-700', description: `Live channel (${meta.category})`, streamUrl: line, priority: source[1], region: source[2], source: source[3], countryCode: null, isNsfw: /xxx|adult|18\+/i.test(`${meta.category} ${meta.name}`) });
      meta = null;
    }
    if (result.length >= 5000) break;
  }
  return result;
}

async function liveChannels(request: Request, includeAdult: boolean) {
  const responses = await Promise.allSettled(sources.map(async (source) => parsePlaylist(await (await fetch(source[0])).text(), source)));
  const seen = new Set<string>();
  const channels = responses.flatMap((result) => result.status === 'fulfilled' ? result.value : []).filter((channel) => { if (!includeAdult && channel.isNsfw) return false; if (seen.has(String(channel.streamUrl))) return false; seen.add(String(channel.streamUrl)); return true; });
  if (!channels.length) return failure('LIVE_TV_UNAVAILABLE', 'No authorized live channels are currently available.', 503, request);
  return json(channels, 200, request);
}

async function route(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^.*\/public-api/, '') || '/';
  if (request.method === 'OPTIONS') return json(null, 204, request);
  try {
    if (path === '/auth/sign-in' && request.method === 'POST') {
      const input = await body(request); const email = await emailForIdentifier(String(input.identifier ?? '').trim());
      if (!email) return failure('AUTH_INVALID', 'Invalid credentials.', 401, request);
      const result = await admin.auth.signInWithPassword({ email, password: String(input.password ?? '') });
      if (result.error) return failure('AUTH_INVALID', 'Invalid credentials.', 401, request);
      return json(authData(result.data), 200, request);
    }
    if (path === '/auth/sign-up' && request.method === 'POST') {
      const input = await body(request); const result = await admin.auth.signUp({ email: String(input.email ?? ''), password: String(input.password ?? ''), options: { data: { username: String(input.username ?? '') } } });
      if (result.error) return failure('AUTH_SIGN_UP_FAILED', result.error.message, 400, request);
      return json(authData(result.data), 201, request);
    }
    if (path === '/auth/refresh' && request.method === 'POST') {
      const input = await body(request); const result = await admin.auth.refreshSession({ refresh_token: String(input.refresh_token ?? '') });
      if (result.error) return failure('AUTH_REFRESH_FAILED', 'The session could not be refreshed.', 401, request);
      return json(authData(result.data), 200, request);
    }
    if (path === '/auth/forgot-password' && request.method === 'POST') {
      const input = await body(request); const result = await admin.auth.resetPasswordForEmail(String(input.email ?? ''));
      if (result.error) return failure('AUTH_RESET_FAILED', 'The password reset request could not be completed.', 400, request);
      return json({ accepted: true }, 202, request);
    }

    // Catalog proxy endpoints are public; provider credentials stay server-side.
    if (path.startsWith('/catalog/tmdb/')) return proxyCatalog('tmdb', path.replace('/catalog/tmdb', ''), url.searchParams, request);
    if (path.startsWith('/catalog/mal/')) return proxyCatalog('mal', path.replace('/catalog/mal', ''), url.searchParams, request);

    const user = await requireUser(request);
    if (path === '/auth/me' && request.method === 'GET') return json({ user, profile: await profileFor(user.id) }, 200, request);
    if (path === '/auth/update-password' && request.method === 'POST') { const input = await body(request); const result = await admin.auth.admin.updateUserById(user.id, { password: String(input.password ?? '') }); return result.error ? failure('AUTH_PASSWORD_UPDATE_FAILED', 'The password could not be updated.', 400, request) : json({ updated: true }, 200, request); }
    if (path === '/profile' && request.method === 'GET') return json(await profileFor(user.id), 200, request);
    if (path === '/profile' && request.method === 'PATCH') { const input = await body(request); const allowed = { username: input.username, show_adult_content: input.show_adult_content }; const result = await admin.from('profiles').update(allowed).eq('id', user.id).select().single(); return result.error ? failure('PROFILE_UPDATE_FAILED', result.error.message, 400, request) : json(result.data, 200, request); }
    if (path === '/history' && request.method === 'GET') { const result = await admin.from('watch_history').select('*').eq('user_id', user.id).order('last_watched_at', { ascending: false }).limit(Number(url.searchParams.get('limit') ?? 50)); return result.error ? failure('HISTORY_READ_FAILED', result.error.message, 400, request) : json(result.data ?? [], 200, request); }
    if (path === '/history' && request.method === 'POST') { const input = await body(request); const row = { user_id: user.id, content_id: Number(input.content_id), content_type: String(input.content_type ?? 'movie'), progress: Number(input.progress ?? 0), season_number: input.season_number ?? null, episode_number: input.episode_number ?? null, total_duration: input.total_duration ?? null, last_watched_at: new Date().toISOString() }; const result = await admin.from('watch_history').upsert(row, { onConflict: 'user_id,content_id,content_type,season_number,episode_number' }).select().single(); return result.error ? failure('HISTORY_WRITE_FAILED', result.error.message, 400, request) : json(result.data, 200, request); }
    if (path.startsWith('/history/') && request.method === 'PATCH') { const input = await body(request); const id = path.split('/').pop(); const result = await admin.from('watch_history').update({ progress: input.progress, total_duration: input.total_duration, completed_at: input.progress >= 100 ? new Date().toISOString() : null, last_watched_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id).select().single(); return result.error ? failure('HISTORY_UPDATE_FAILED', result.error.message, 400, request) : json(result.data, 200, request); }
    if (path.startsWith('/history/') && request.method === 'DELETE') { const id = path.split('/').pop(); const result = await admin.from('watch_history').delete().eq('id', id).eq('user_id', user.id); return result.error ? failure('HISTORY_DELETE_FAILED', result.error.message, 400, request) : json({ deleted: true }, 200, request); }
    if (path === '/recommendations' && request.method === 'GET') return json([], 200, request);
    if (path === '/live-tv/channels' && request.method === 'GET') { const profile = await profileFor(user.id); if (!profile?.is_approved) return failure('LIVE_TV_NOT_APPROVED', 'Your account is awaiting manual approval.', 403, request); return liveChannels(request, Boolean(profile.show_adult_content && url.searchParams.get('include_nsfw') === 'true')); }

    await requireAdmin(request);
    if (path === '/admin/users' && request.method === 'GET') { const result = await admin.from('profiles').select('*').order('created_at', { ascending: false }); return result.error ? failure('ADMIN_READ_FAILED', result.error.message, 400, request) : json(result.data ?? [], 200, request); }
    if (path === '/admin/approval' && request.method === 'POST') { const input = await body(request); const result = await admin.from('profiles').update({ is_approved: Boolean(input.approved) }).eq('id', String(input.user_id)).select().single(); return result.error ? failure('ADMIN_APPROVAL_FAILED', result.error.message, 400, request) : json(result.data, 200, request); }
    if (path === '/admin/role' && request.method === 'POST') { const input = await body(request); const role = input.role === 'admin' ? 'admin' : 'user'; const result = await admin.from('profiles').update({ role }).eq('id', String(input.user_id)).select().single(); return result.error ? failure('ADMIN_ROLE_FAILED', result.error.message, 400, request) : json(result.data, 200, request); }
    if (path === '/admin/stats' && request.method === 'GET') { const [users, pending, history] = await Promise.all([admin.from('profiles').select('id', { count: 'exact', head: true }), admin.from('profiles').select('id', { count: 'exact', head: true }).eq('is_approved', false), admin.from('watch_history').select('id', { count: 'exact', head: true })]); return json({ users: users.count ?? 0, pending: pending.count ?? 0, history: history.count ?? 0 }, 200, request); }
    return failure('NOT_FOUND', 'Endpoint not found.', 404, request);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'INTERNAL_ERROR';
    if (code === 'AUTH_REQUIRED') return failure(code, 'Authentication is required.', 401, request);
    if (code === 'AUTH_INVALID') return failure(code, 'Invalid or expired session.', 401, request);
    if (code === 'ADMIN_REQUIRED') return failure(code, 'Administrator access is required.', 403, request);
    console.error(error);
    return failure('INTERNAL_ERROR', 'Unexpected server error.', 500, request);
  }
}

Deno.serve(route);
