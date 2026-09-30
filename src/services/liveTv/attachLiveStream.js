/**
 * Reproductor de streams en vivo: HLS (hls.js), DASH (dashjs) y progresivo nativo.
 * Reintentos ante fallos y callbacks para telemetría / fallback en UI.
 */

import Hls from 'hls.js';

const FULL_RETRY_MAX = 3;
const RETRY_DELAY_MS = [500, 1500, 2800];

/** @param {string} [url] */
export function isProgressiveVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /\.(mp4|webm|ogv|ogg)(\?|#|$)/i.test(url.trim());
}

/** @param {string} [url] */
export function isDashUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const u = url.trim().toLowerCase();
  return u.includes('.mpd') || /\/manifest\.mpd(\?|#|$)/i.test(u);
}

/** @param {string} [url] */
export function isLikelyHlsUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const u = url.trim().toLowerCase();
  if (isProgressiveVideoUrl(url) || isDashUrl(url)) return false;
  return (
    u.includes('.m3u8') ||
    u.includes('.m3u') ||
    u.includes('application/vnd.apple.mpegurl') ||
    u.includes('/playlist') ||
    /type=m3u/i.test(u)
  );
}

/**
 * @param {string} url
 * @returns {'dash'|'hls'|'native'}
 */
export function getStreamKind(url) {
  if (isDashUrl(url)) return 'dash';
  if (isProgressiveVideoUrl(url)) return 'native';
  if (isLikelyHlsUrl(url)) return 'hls';
  if (Hls.isSupported()) return 'hls';
  return 'native';
}

/**
 * @param {HTMLVideoElement} video
 * @param {string} streamUrl
 * @param {object} [options]
 * @param {(ev: { type: string, detail?: string, attempt?: number }) => void} [options.onStatus]
 * @param {(ev: { reason: string, attempt: number }) => void} [options.onFatal]
 * @returns {() => void}
 */
export function attachLiveStream(video, streamUrl, options = {}) {
  const { onStatus, onFatal } = options;
  let destroyed = false;
  let hlsInstance = null;
  let dashPlayer = null;
  let fullAttempt = 0;
  let retryTimer = null;
  /** @type {(() => void) | null} */
  let nativeErrorHandler = null;

  const emit = (type, detail, attempt) => {
    onStatus?.({ type, detail, attempt });
  };

  const clearTimers = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const detachPlayers = () => {
    clearTimers();
    if (nativeErrorHandler) {
      video.removeEventListener('error', nativeErrorHandler);
      nativeErrorHandler = null;
    }
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    if (dashPlayer) {
      try {
        dashPlayer.destroy();
      } catch {
        /* ignore */
      }
      dashPlayer = null;
    }
    video.removeAttribute('src');
    try {
      video.load();
    } catch {
      /* ignore */
    }
  };

  const runFatal = (reason) => {
    if (destroyed) return;
    onFatal?.({ reason, attempt: fullAttempt });
  };

  const resetAttemptsOnSuccess = () => {
    fullAttempt = 0;
  };

  const scheduleFullRetry = (reason) => {
    if (destroyed) return;
    fullAttempt += 1;
    if (fullAttempt > FULL_RETRY_MAX) {
      emit('failed', reason, fullAttempt);
      runFatal(reason);
      return;
    }
    const delay = RETRY_DELAY_MS[Math.min(fullAttempt - 1, RETRY_DELAY_MS.length - 1)];
    emit('retry', `${reason} (reintento ${fullAttempt}/${FULL_RETRY_MAX})`, fullAttempt);
    retryTimer = setTimeout(() => {
      if (destroyed) return;
      startPlayback();
    }, delay);
  };

  function attachHls() {
    emit('mode', 'hls', fullAttempt);
    hlsInstance = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      maxLoadingDelay: 8,
      manifestLoadingMaxRetry: 4,
      levelLoadingMaxRetry: 4,
      fragLoadingMaxRetry: 6,
    });

    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      if (destroyed) return;
      resetAttemptsOnSuccess();
      emit('playing', 'HLS listo', fullAttempt);
      video.play().catch(() => {});
    });

    hlsInstance.on(Hls.Events.ERROR, (_, data) => {
      if (destroyed || !hlsInstance) return;
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            emit('recovering', 'Red HLS, recuperando…', fullAttempt);
            try {
              hlsInstance.startLoad();
            } catch {
              detachPlayers();
              scheduleFullRetry('hls-network');
            }
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            emit('recovering', 'Medio HLS, recuperando…', fullAttempt);
            try {
              hlsInstance.recoverMediaError();
            } catch {
              detachPlayers();
              scheduleFullRetry('hls-media');
            }
            break;
          default:
            detachPlayers();
            scheduleFullRetry(`hls-fatal:${data.details || data.type}`);
        }
      }
    });

    try {
      hlsInstance.loadSource(streamUrl);
      hlsInstance.attachMedia(video);
    } catch {
      detachPlayers();
      scheduleFullRetry('hls-init');
    }
  }

  function attachDash() {
    emit('mode', 'dash', fullAttempt);
    import('dashjs')
      .then(({ MediaPlayer }) => {
        if (destroyed) return;

        const onError = () => {
          if (destroyed) return;
          detachPlayers();
          scheduleFullRetry('dash-error');
        };

        dashPlayer = MediaPlayer().create();
        dashPlayer.initialize(video, streamUrl, true);
        dashPlayer.on(MediaPlayer.events.ERROR, onError);
        dashPlayer.on(MediaPlayer.events.PLAYBACK_ERROR, onError);

        const onPlaying = () => {
          resetAttemptsOnSuccess();
          emit('playing', 'DASH en reproducción', fullAttempt);
          video.removeEventListener('playing', onPlaying);
        };
        video.addEventListener('playing', onPlaying, { once: true });

        video.play().catch(() => {});
        emit('loading', 'DASH iniciando…', fullAttempt);
      })
      .catch(() => {
        if (destroyed) return;
        detachPlayers();
        scheduleFullRetry('dash-import');
      });
  }

  function attachNative() {
    emit('mode', 'native', fullAttempt);
    nativeErrorHandler = () => {
      if (destroyed) return;
      detachPlayers();
      scheduleFullRetry('native-error');
    };
    video.addEventListener('error', nativeErrorHandler);

    video.src = streamUrl;
    const onPlaying = () => {
      resetAttemptsOnSuccess();
      emit('playing', 'Reproducción nativa', fullAttempt);
      video.removeEventListener('playing', onPlaying);
    };
    video.addEventListener('playing', onPlaying, { once: true });
    video.play().catch(() => {});
    emit('loading', 'Cargando stream…', fullAttempt);
  }

  function attachSafariHls() {
    emit('mode', 'hls-native', fullAttempt);
    nativeErrorHandler = () => {
      if (destroyed) return;
      detachPlayers();
      scheduleFullRetry('hls-safari-error');
    };
    video.addEventListener('error', nativeErrorHandler);
    video.src = streamUrl;
    const onPlaying = () => {
      resetAttemptsOnSuccess();
      emit('playing', 'HLS nativo (Safari)', fullAttempt);
      video.removeEventListener('playing', onPlaying);
    };
    video.addEventListener('playing', onPlaying, { once: true });
    video.play().catch(() => {});
  }

  function startPlayback() {
    if (destroyed) return;
    detachPlayers();
    emit('loading', streamUrl, fullAttempt);

    const kind = getStreamKind(streamUrl);

    if (kind === 'dash') {
      attachDash();
      return;
    }

    if (kind === 'hls' && Hls.isSupported()) {
      attachHls();
      return;
    }

    if (video.canPlayType('application/vnd.apple.mpegurl') && isLikelyHlsUrl(streamUrl)) {
      attachSafariHls();
      return;
    }

    attachNative();
  }

  startPlayback();

  return () => {
    destroyed = true;
    clearTimers();
    detachPlayers();
  };
}
