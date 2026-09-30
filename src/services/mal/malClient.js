import { isDemoMode } from '../../config/supabase.config.js';
import { publicApi } from '../publicApiClient.js';
import { DEMO_ANIME } from '../../data/demoCatalog.js';
import { RequestError, USER_MESSAGES, isRequestError, logRequestError } from '../http/requestErrors.js';

export async function malGet(path, params = {}) {
  try {
    if (isDemoMode()) {
      if (/^\/anime\/\d+$/.test(path)) {
        const id = Number(path.split('/')[2]);
        return DEMO_ANIME.find(({ node }) => node.id === id)?.node || DEMO_ANIME[0].node;
      }
      return { data: DEMO_ANIME };
    }
    return await publicApi.catalog.mal(path, params);
  } catch (error) {
    if (isRequestError(error)) throw error;
    const wrapped = new RequestError(USER_MESSAGES.NETWORK, { code: error?.code || 'MAL_NETWORK', technical: error?.message ?? String(error), cause: error });
    logRequestError('mal:get', wrapped, { path });
    throw wrapped;
  }
}
