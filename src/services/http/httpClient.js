import { TMDB_CONFIG } from '../../config/api.config.js';
import { isDemoMode } from '../../config/supabase.config.js';
import { publicApi } from '../publicApiClient.js';
import { demoTmdbResponse } from '../../data/demoCatalog.js';
import { getCachedData, setCachedData } from '../../utils/tmdbCache.js';
import { RequestError, USER_MESSAGES, isRequestError, logRequestError, userMessageFromHttpStatus } from './requestErrors.js';
import { fetchWithPolicy, isAbortTimeoutError } from './retryPolicy.js';

class HttpClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || TMDB_CONFIG.BASE_URL;
    this.apiKey = config.apiKey || TMDB_CONFIG.API_KEY;
    this.accessToken = config.accessToken || TMDB_CONFIG.ACCESS_TOKEN;
    this.defaultLanguage = config.defaultLanguage || TMDB_CONFIG.DEFAULT_LANGUAGE;
  }

  usesBearer() { return Boolean(String(this.accessToken ?? '').trim()); }

  async get(endpoint, options = {}) {
    const { useCache = true, ...restOptions } = options;
    const params = { ...restOptions.params, language: this.defaultLanguage };
    if (useCache) {
      const cached = getCachedData(endpoint, params);
      if (cached) return cached;
    }

    try {
      let data;
      if (isDemoMode()) {
        data = demoTmdbResponse(endpoint, params);
      } else if (!this.usesBearer() && !String(this.apiKey ?? '').trim()) {
        data = await publicApi.catalog.tmdb(endpoint, params);
      } else {
        const urlParams = new URLSearchParams(params);
        if (!this.usesBearer()) urlParams.set('api_key', this.apiKey);
        const url = `${this.baseUrl}${endpoint}?${urlParams.toString()}`;
        const headers = { Accept: 'application/json' };
        if (this.usesBearer()) headers.Authorization = `Bearer ${String(this.accessToken).trim()}`;
        const response = await fetchWithPolicy(url, { method: 'GET', headers });
        const rawText = await response.text();
        if (!response.ok) {
          throw new RequestError(userMessageFromHttpStatus(response.status) || `Catalog request failed (${response.status}).`, { code: 'TMDB_HTTP', status: response.status, url, technical: rawText.slice(0, 500) });
        }
        try { data = JSON.parse(rawText); } catch (cause) { throw new RequestError(USER_MESSAGES.PARSE, { code: 'TMDB_JSON_PARSE', url, cause }); }
      }
      if (useCache) setCachedData(endpoint, params, data);
      return data;
    } catch (error) {
      if (isRequestError(error)) throw error;
      const wrapped = new RequestError(USER_MESSAGES.NETWORK, { code: isAbortTimeoutError(error) ? 'TMDB_TIMEOUT' : 'TMDB_NETWORK', technical: error?.message ?? String(error), cause: error });
      logRequestError('tmdb:get', wrapped, { endpoint });
      throw wrapped;
    }
  }
}

export const httpClient = new HttpClient();
export default HttpClient;
