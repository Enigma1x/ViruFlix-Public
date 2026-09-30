import { HTTP_RETRY_CONFIG } from '../../config/api.config.js';

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function shouldRetryHttpStatus(status) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export function isAbortTimeoutError(error) {
  return error?.name === 'AbortError' || /aborted|timeout/i.test(String(error?.message ?? ''));
}

export async function fetchWithPolicy(url, options = {}, policy = {}) {
  const maxAttempts = policy.maxAttempts ?? HTTP_RETRY_CONFIG.MAX_ATTEMPTS;
  const timeoutMs = policy.timeoutMs ?? HTTP_RETRY_CONFIG.TIMEOUT_MS;
  const backoffMs = policy.backoffMs ?? HTTP_RETRY_CONFIG.BACKOFF_MS;

  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      if (!response.ok && shouldRetryHttpStatus(response.status) && attempt < maxAttempts) {
        await delay(backoffMs * attempt);
        continue;
      }
      return response;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (attempt < maxAttempts) {
        await delay(backoffMs * attempt);
        continue;
      }
      throw error;
    }
  }
  throw lastError ?? new Error('request failed');
}
