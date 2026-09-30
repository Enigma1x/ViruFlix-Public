import { isDemoMode } from '../../config/supabase.config.js';
import { publicApi } from '../publicApiClient.js';

const unavailable = () => new Error('Admin actions require a deployed public backend and an approved administrator account.');

export async function getAllUsers() {
  if (isDemoMode()) return { success: false, data: [], error: unavailable() };
  try { return { success: true, data: (await publicApi.admin.users()) || [], error: null }; } catch (error) { return { success: false, data: [], error }; }
}
export async function manageUserApproval(userId, approved) {
  if (isDemoMode()) return { success: false, data: null, error: unavailable() };
  try { return { success: true, data: await publicApi.admin.approval(userId, approved), error: null }; } catch (error) { return { success: false, data: null, error }; }
}
export async function changeUserRole(userId, role) {
  if (isDemoMode()) return { success: false, data: null, error: unavailable() };
  try { return { success: true, data: await publicApi.admin.role(userId, role), error: null }; } catch (error) { return { success: false, data: null, error }; }
}
export async function getAdminStats() {
  if (isDemoMode()) return { success: false, data: null, error: unavailable() };
  try { return { success: true, data: await publicApi.admin.stats(), error: null }; } catch (error) { return { success: false, data: null, error }; }
}
