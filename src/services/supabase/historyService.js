import { isDemoMode } from '../../config/supabase.config.js';
import { publicApi } from '../publicApiClient.js';

const DEMO_HISTORY_KEY = 'viruflix_demo_history';

function readDemoHistory() {
  try { return JSON.parse(localStorage.getItem(DEMO_HISTORY_KEY) || '[]'); } catch { return []; }
}
function writeDemoHistory(items) { try { localStorage.setItem(DEMO_HISTORY_KEY, JSON.stringify(items)); } catch { /* storage disabled */ } }
function demoEntry(userId, contentId, contentType, progress, seasonNumber, episodeNumber, totalDuration) {
  return { id: `${contentType}-${contentId}-${seasonNumber || 0}-${episodeNumber || 0}`, user_id: userId, content_id: Number(contentId), content_type: contentType, progress: Number(progress) || 0, season_number: seasonNumber, episode_number: episodeNumber, total_duration: totalDuration, last_watched_at: new Date().toISOString() };
}

export async function flushQueuedWatchProgress() { return { success: true, flushed: 0 }; }

export async function saveWatchProgress(userId, contentId, contentType, progress, seasonNumber = null, episodeNumber = null, totalDuration = null) {
  const entry = demoEntry(userId, contentId, contentType, progress, seasonNumber, episodeNumber, totalDuration);
  if (isDemoMode()) {
    const history = readDemoHistory().filter((item) => item.id !== entry.id);
    writeDemoHistory([entry, ...history]);
    return { success: true, data: entry, error: null };
  }
  try { return { success: true, data: await publicApi.history.save({ content_id: entry.content_id, content_type: entry.content_type, progress: entry.progress, season_number: seasonNumber, episode_number: episodeNumber, total_duration: totalDuration }), error: null }; } catch (error) { return { success: false, data: null, error }; }
}

export async function getWatchProgressForContent(_userId, contentId, contentType) {
  const result = await getWatchHistory(_userId, 100);
  const item = result.data.find((entry) => String(entry.content_id) === String(contentId) && entry.content_type === contentType);
  return { success: result.success, data: item || null, error: result.error || null };
}

export async function getWatchHistory(_userId, limit = 50) {
  if (isDemoMode()) return { success: true, data: readDemoHistory().slice(0, limit), error: null };
  try { return { success: true, data: (await publicApi.history.list(limit)) || [], error: null }; } catch (error) { return { success: false, data: [], error }; }
}

export async function getContinueWatching(userId, limit = 10) {
  const result = await getWatchHistory(userId, 100);
  return { ...result, data: result.data.filter((item) => Number(item.progress) < 90).slice(0, limit) };
}

export async function markAsCompleted(userId, contentId, contentType) {
  return saveWatchProgress(userId, contentId, contentType, 100);
}

export async function removeFromHistory(_userId, contentId, contentType) {
  if (isDemoMode()) {
    writeDemoHistory(readDemoHistory().filter((item) => !(String(item.content_id) === String(contentId) && item.content_type === contentType)));
    return { success: true, error: null };
  }
  try {
    const item = (await publicApi.history.list(100)).find((entry) => String(entry.content_id) === String(contentId) && entry.content_type === contentType);
    if (item?.id) await publicApi.history.remove(item.id);
    return { success: true, error: null };
  } catch (error) { return { success: false, error }; }
}
