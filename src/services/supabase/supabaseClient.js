// Legacy import boundary. Public builds communicate only with the HTTPS API.
import { isSupabaseConfigured } from '../../config/supabase.config.js';
export const REMEMBER_ME_KEY = 'viruflix_remember_me';
export { isSupabaseConfigured };
export const supabase = Object.freeze({
  auth: Object.freeze({}),
  from: () => { throw new Error('Direct database access is disabled in the public client.'); },
  rpc: () => { throw new Error('Direct RPC access is disabled in the public client.'); }
});
