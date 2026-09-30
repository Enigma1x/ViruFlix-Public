import { isDemoMode, isSupabaseConfigured } from '../../config/supabase.config.js';
import { publicApi, getStoredUser, clearSession, emitAuthChange, onPublicAuthStateChange, PUBLIC_API_STORAGE } from '../publicApiClient.js';

export const REMEMBER_ME_KEY = 'viruflix_remember_me';

export function looksLikeEmail(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.includes('@') && trimmed.indexOf('@') > 0 && trimmed.indexOf('@') < trimmed.length - 1;
}

export async function resolveLoginIdentifierToEmail(identifier) {
  // Resolution is performed by the backend so the renderer never receives a
  // profile table or a service credential.
  return looksLikeEmail(identifier) ? identifier.trim() : null;
}

function unavailableError() {
  return new Error('Public backend is not configured. Set VITE_PUBLIC_API_BASE_URL and VITE_DEMO_MODE=false.');
}

export async function signIn(identifier, password, options = {}) {
  if (!isSupabaseConfigured() || isDemoMode()) return { user: null, error: unavailableError() };
  if (!String(identifier || '').trim()) return { user: null, error: new Error('Enter your username, ID, or email.') };
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(REMEMBER_ME_KEY, options.rememberMe === false ? 'false' : 'true');
    const data = await publicApi.auth.signIn(String(identifier).trim(), password);
    emitAuthChange('SIGNED_IN');
    return { user: data?.user || getStoredUser(), error: null };
  } catch (error) {
    return { user: null, error };
  }
}

export async function signUp(email, password, username) {
  if (!isSupabaseConfigured() || isDemoMode()) return { user: null, error: unavailableError() };
  try {
    const data = await publicApi.auth.signUp(email, password, username);
    return { user: data?.user || null, error: null };
  } catch (error) {
    return { user: null, error };
  }
}

export async function signOut() {
  clearSession();
  emitAuthChange('SIGNED_OUT');
  return { error: null };
}

export async function forgotPassword(email) {
  if (!email || !looksLikeEmail(email)) return { success: false, error: new Error('Invalid email.') };
  if (!isSupabaseConfigured() || isDemoMode()) return { success: false, error: unavailableError() };
  try { await publicApi.auth.forgotPassword(email); return { success: true, error: null }; } catch (error) { return { success: false, error }; }
}

export async function updatePassword(newPassword) {
  if (!isSupabaseConfigured() || isDemoMode()) return { success: false, error: unavailableError() };
  try { await publicApi.auth.updatePassword(newPassword); return { success: true, error: null }; } catch (error) { return { success: false, error }; }
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured() || isDemoMode()) return { user: null, error: null };
  try { const data = await publicApi.auth.me(); return { user: data?.user || data || null, error: null }; } catch { return { user: null, error: null }; }
}

export async function getUserProfile() {
  if (!isSupabaseConfigured() || isDemoMode()) return { profile: null, error: null };
  try { const profile = await publicApi.profile.get(); return { profile: profile?.profile || profile || null, error: null }; } catch (error) { return { profile: null, error }; }
}

export async function createProfileIfMissing() { return getUserProfile(); }
export async function checkUserIdExists() { return { exists: false, error: null }; }

export async function updateUserProfile(_userId, updates) {
  if (!isSupabaseConfigured() || isDemoMode()) return { profile: null, error: unavailableError() };
  try { const profile = await publicApi.profile.update(updates); return { profile: profile?.profile || profile, error: null }; } catch (error) { return { profile: null, error }; }
}

export function onAuthStateChange(callback) {
  return onPublicAuthStateChange(callback);
}

export { PUBLIC_API_STORAGE };
