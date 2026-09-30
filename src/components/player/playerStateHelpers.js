export const PLAYER_VARIANTS = Object.freeze({ LOADING: 'loading', RETRYING: 'retrying', ERROR: 'error', EMPTY: 'empty' });

export function normalizeActions(actions) {
  if (!Array.isArray(actions)) return [];
  let primarySeen = false;
  return actions.filter((action) => action && typeof action.label === 'string' && typeof action.onClick === 'function').map((action, index) => {
    const primary = action.variant === 'primary' && !primarySeen;
    if (primary) primarySeen = true;
    return { id: action.id || `action-${index}`, label: action.label, onClick: action.onClick, variant: primary ? 'primary' : (action.variant === 'primary' ? 'secondary' : action.variant || 'secondary'), disabled: Boolean(action.disabled) };
  });
}

export function deriveWatchMainState(context = {}) {
  const { loading = false, retrying = false, loadError = null, streamUrl = null, requiresProgress = false, progressLoaded = true, onRetryLoad, onBack } = context;
  if (retrying) return { variant: PLAYER_VARIANTS.RETRYING, title: 'Retrying…', message: 'Loading the title again.' };
  if (loading) return { variant: PLAYER_VARIANTS.LOADING, title: 'Loading…' };
  if (loadError) return { variant: PLAYER_VARIANTS.ERROR, title: 'Unable to load this title', message: loadError, actions: normalizeActions([{ id: 'retry', label: 'Retry', onClick: onRetryLoad, variant: 'primary' }, { id: 'back', label: 'Back', onClick: onBack }]) };
  if (requiresProgress && !progressLoaded) return { variant: PLAYER_VARIANTS.LOADING, title: 'Loading your position…' };
  if (!streamUrl) return { variant: PLAYER_VARIANTS.EMPTY, title: 'No playback source available', message: 'Configure a provider or use demo mode.', actions: normalizeActions([{ id: 'back', label: 'Back', onClick: onBack, variant: 'primary' }]) };
  return null;
}
