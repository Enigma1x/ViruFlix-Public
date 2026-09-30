/**
 * Página de TV en Vivo
 *
 * Experiencia tipo “cine”: reproductor 16:9 protagonista, lista lateral colapsable,
 * identidad Viruflix (banderas, EN VIVO, favoritos locales). Canales desde iptv-org.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import ProtectedRoute from '../components/ProtectedRoute';
import { FALLBACK_IMAGE } from '../utils/imageOptimizer';
import { getUserFacingMessage, logRequestError } from '../services/http/requestErrors.js';
import {
  getLiveChannels,
  getCategoriesFromChannels,
  getSourcesFromChannels,
  ALL_SOURCES_ID,
  DEFAULT_CHANNELS_LIMIT,
} from '../services/liveTv/liveTvService';
import { attachLiveStream } from '../services/liveTv/attachLiveStream';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile } from '../services/supabase/authService';
import PlayerState from '../components/player/PlayerState';
import LiveTvRegionFlag from '../components/liveTv/LiveTvRegionFlag.jsx';
import { ViruButton } from '../components/ui';

const MAX_AUTO_CHANNEL_FALLBACKS = 10;
// La lista local y las fuentes remotas pueden contener miles de canales. Un
// bloque inicial amplio reduce los clics sin renderizar el catálogo completo.
const INITIAL_VISIBLE_CHANNELS = 200;
const VISIBLE_CHANNELS_STEP = 200;
const ALL_CATEGORIES_ID = '__all__';
const FAVORITES_STORAGE_KEY = 'viruflix-live-tv-favorites';

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightChannelName(name, term) {
  const t = term.trim();
  if (!t) return name;
  const parts = name.split(new RegExp(`(${escapeRegExp(t)})`, 'gi'));
  return parts.map((part, i) => {
    if (part.toLowerCase() === t.toLowerCase()) {
      return (
        <mark
          key={`${i}-${part}`}
          className="bg-viru-cyan/25 text-white rounded-sm px-0.5 font-semibold"
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}

function readFavoriteIds() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeFavoriteIds(ids) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* noop */
  }
}

function LiveBadge() {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white ring-1 ring-white/15"
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-viru-red opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-viru-red" />
      </span>
      En vivo
    </div>
  );
}

function LiveTV() {
  const toast = useToast();
  const prefersReducedMotion = useReducedMotion();
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadKey, setLoadKey] = useState(0);
  const [playbackHint, setPlaybackHint] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES_ID);
  const [selectedSource, setSelectedSource] = useState(ALL_SOURCES_ID);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_CHANNELS);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [favoriteIds, setFavoriteIds] = useState(() => readFavoriteIds());
  const { profile, refreshProfile } = useAuth();
  const showNsfwFromProfile = profile?.show_adult_content ?? false;
  const [showNsfw, setShowNsfw] = useState(showNsfwFromProfile);

  const videoRef = useRef(null);
  const autoFallbackCountRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    async function loadChannels() {
      try {
        setLoadError('');
        setLoading(true);
        const liveChannels = await getLiveChannels(DEFAULT_CHANNELS_LIMIT, { includeNsfw: showNsfw });

        if (!isMounted) return;
        setChannels(liveChannels);
        setSelectedChannel((prev) => {
          if (prev && liveChannels.some((c) => c.id === prev.id)) return prev;
          return liveChannels[0] || null;
        });
      } catch (error) {
        logRequestError('liveTv:loadChannels', error);
        if (!isMounted) return;
        const message = getUserFacingMessage(error, 'No se pudieron cargar los canales en vivo');
        setLoadError(message);
        toast.error(message, 3500);
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    }

    loadChannels();

    return () => {
      isMounted = false;
    };
  }, [loadKey, showNsfw]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !selectedChannel?.streamUrl) {
      setPlaybackHint('');
      return undefined;
    }

    setPlaybackHint('Conectando al stream…');

    const cleanup = attachLiveStream(video, selectedChannel.streamUrl, {
      onStatus: ({ type, detail }) => {
        if (type === 'playing') {
          setPlaybackHint('');
          return;
        }
        if (type === 'failed') {
          setPlaybackHint(detail || 'Error de reproducción');
          toast.warning(detail || 'Error de reproducción en el canal actual', 2500);
          return;
        }
        if (detail) {
          setPlaybackHint(detail);
        } else if (type === 'loading' || type === 'mode') {
          setPlaybackHint('Cargando…');
        }
      },
      onFatal: () => {
        logRequestError('liveTv:streamFatal', new Error('fatal stream error'), {
          channelId: selectedChannel?.id,
          channelName: selectedChannel?.name,
        });
        if (channels.length <= 1) {
          setPlaybackHint('No se pudo reproducir este canal. Prueba otro más tarde.');
          toast.error('No se pudo reproducir este canal. Prueba otro más tarde.', 3000);
          return;
        }
        if (autoFallbackCountRef.current >= MAX_AUTO_CHANNEL_FALLBACKS) {
          setPlaybackHint('Varios canales fallaron seguidos. Elige otro manualmente.');
          return;
        }
        const idx = channels.findIndex((c) => c.id === selectedChannel.id);
        const next = channels[(idx + 1) % channels.length];
        if (next && next.id !== selectedChannel.id) {
          autoFallbackCountRef.current += 1;
          setPlaybackHint(`Stream no disponible. Probando: ${next.name}…`);
          setSelectedChannel(next);
        } else {
          setPlaybackHint('No se pudo cambiar de canal automáticamente.');
        }
      },
    });

    return cleanup;
  }, [selectedChannel, channels]);

  const categories = useMemo(() => getCategoriesFromChannels(channels), [channels]);
  const sources = useMemo(() => getSourcesFromChannels(channels), [channels]);

  const filteredChannels = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return channels.filter((channel) => {
      if (selectedCategory !== ALL_CATEGORIES_ID && channel.categoryId !== selectedCategory) {
        return false;
      }
      if (selectedSource !== ALL_SOURCES_ID && channel.source !== selectedSource) {
        return false;
      }
      if (!term) return true;
      return channel.name.toLowerCase().includes(term);
    });
  }, [channels, selectedCategory, selectedSource, searchTerm]);

  const searchSuggestions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (term.length < 2) return [];
    return channels
      .filter((c) => c.name.toLowerCase().includes(term))
      .slice(0, 12);
  }, [channels, searchTerm]);

  const favoriteChannels = useMemo(() => {
    const set = new Set(favoriteIds);
    return channels.filter((c) => set.has(c.id)).slice(0, 16);
  }, [channels, favoriteIds]);

  useEffect(() => {
    if (selectedCategory !== ALL_CATEGORIES_ID) {
      setVisibleCount(filteredChannels.length);
    } else {
      setVisibleCount(INITIAL_VISIBLE_CHANNELS);
    }
  }, [selectedCategory, selectedSource, searchTerm, filteredChannels]);

  const visibleChannels = useMemo(
    () => filteredChannels.slice(0, visibleCount),
    [filteredChannels, visibleCount]
  );

  const handleChannelSelect = useCallback((channel) => {
    autoFallbackCountRef.current = 0;
    setPlaybackHint('');
    setSelectedChannel(channel);
  }, []);

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + VISIBLE_CHANNELS_STEP);
  }, []);

  const toggleFavorite = useCallback((channelId) => {
    setFavoriteIds((prev) => {
      const next = prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId];
      writeFavoriteIds(next);
      return next;
    });
  }, []);

  const handleRetryLoad = useCallback(() => {
    setLoadError('');
    setLoadKey((k) => k + 1);
  }, []);

  const handleShare = useCallback(async () => {
    if (!selectedChannel) return;
    const title = selectedChannel.name;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `Viendo ${title} en Viruflix`, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success('Enlace copiado al portapapeles', 2000);
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
      toast.warning('No se pudo compartir. Intenta copiar el enlace manualmente.', 2500);
    }
  }, [selectedChannel, toast]);

  const handleReport = useCallback(() => {
    toast.info('Gracias. Hemos registrado tu comentario sobre este canal.', 2800);
  }, [toast]);

  const remainingCount = Math.max(filteredChannels.length - visibleChannels.length, 0);

  const listItemMotion = prefersReducedMotion
    ? {}
    : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 } };

  const renderChannelButton = (channel, opts = {}) => {
    const { featured = false, keyPrefix = '' } = opts;
    const isSelected = selectedChannel?.id === channel.id;
    const isFav = favoriteIds.includes(channel.id);
    const baseCard = featured
      ? 'ring-2 ring-viru-cyan/40 bg-linear-to-br from-gray-800/90 to-gray-900/95'
      : isSelected
        ? 'ring-2 ring-viru-red bg-linear-to-br from-viru-red/25 to-gray-900/90'
        : 'bg-linear-to-br from-gray-800/80 to-gray-900/90 ring-1 ring-white/5 hover:ring-viru-cyan/30';

    if (viewMode === 'grid') {
      return (
        <motion.button
          key={`${keyPrefix}g-${channel.id}`}
          type="button"
          layout={!prefersReducedMotion}
          {...listItemMotion}
          transition={{ duration: 0.2 }}
          onClick={() => handleChannelSelect(channel)}
          className={`relative aspect-square rounded-xl overflow-hidden text-left group ${baseCard}`}
        >
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
          <img
            src={channel.logo || FALLBACK_IMAGE}
            alt=""
            className="absolute inset-2 object-contain drop-shadow-lg"
            loading="lazy"
            onError={(e) => {
              e.target.src = FALLBACK_IMAGE;
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 p-2">
            <p className="text-[11px] font-semibold text-white line-clamp-2 leading-tight">
              {highlightChannelName(channel.name, searchTerm)}
            </p>
          </div>
          {isSelected && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-viru-red shadow-sm shadow-viru-glow-red" />
          )}
        </motion.button>
      );
    }

    return (
      <motion.button
        key={`${keyPrefix}l-${channel.id}`}
        type="button"
        layout={!prefersReducedMotion}
        {...listItemMotion}
        transition={{ duration: 0.2 }}
        onClick={() => handleChannelSelect(channel)}
        className={`w-full rounded-lg px-2.5 py-2 text-left transition-shadow ${baseCard}`}
      >
        <div className="flex items-center gap-2">
          <div className="relative shrink-0">
            <img
              src={channel.logo || FALLBACK_IMAGE}
              alt=""
              loading="lazy"
              className={`rounded-md bg-black/50 object-contain p-1 ring-1 ring-white/10 ${featured ? 'h-12 w-12' : 'h-9 w-9'}`}
              onError={(e) => {
                e.target.src = FALLBACK_IMAGE;
              }}
            />
            {isFav && (
              <span className="absolute -top-1 -right-1 text-xs" aria-hidden>
                ⭐
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="truncate text-sm font-semibold text-white">
              {highlightChannelName(channel.name, searchTerm)}
            </h3>
            <p className="truncate text-xs text-gray-400">{channel.category}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <LiveTvRegionFlag
                countryCode={channel.countryCode}
                region={channel.region}
                label={channel.source || ''}
              />
            </div>
          </div>
        </div>
      </motion.button>
    );
  };

  return (
    <ProtectedRoute requireAuth={true} requireApproval={true}>
      <div className="min-h-screen bg-viru-dark text-white">
        {channels.length === 0 && !loadError ? (
          <div className="mx-auto w-full max-w-[1760px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
            <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-(--viru-border-subtle) pb-5">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h1 className="font-heading text-4xl tracking-wide text-white sm:text-5xl">TV en vivo</h1>
                </div>
                <div className="mt-3 h-4 w-64 rounded-sm bg-gray-800 animate-pulse" />
              </div>
            </header>
            <div className="grid gap-6 lg:grid-cols-[1fr_22rem] xl:grid-cols-[1fr_24rem]">
              <div>
                <div className="aspect-video w-full rounded-2xl bg-gray-900 animate-pulse" />
                <div className="mt-4 h-6 w-48 rounded-sm bg-gray-800 animate-pulse" />
                <div className="mt-2 h-4 w-32 rounded-sm bg-gray-800 animate-pulse" />
              </div>
              <div className="space-y-4">
                <div className="h-10 rounded-xl bg-gray-800 animate-pulse" />
                <div className="h-10 rounded-xl bg-gray-800 animate-pulse" />
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-video rounded-xl bg-gray-800 animate-pulse" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : loadError ? (
          <div className="mx-auto max-w-5xl px-4 py-16 md:py-24">
            <PlayerState
              variant="error"
              title="No se pudieron cargar los canales"
              message={loadError}
              actions={[
                { id: 'retry', label: 'Reintentar', onClick: handleRetryLoad, variant: 'primary' },
              ]}
            />
          </div>
        ) : (
            <div className="mx-auto w-full max-w-[1760px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
            {/* ── Header de página ───────────────────────────────── */}
            <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-(--viru-border-subtle) pb-5">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h1 className="font-heading text-4xl tracking-wide text-white sm:text-5xl">
                    TV en vivo
                  </h1>
                  <span className="hidden rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-gray-300 ring-1 ring-white/10 sm:inline-flex">
                    {channels.length.toLocaleString('es')} canales
                  </span>
                </div>
                <p className="mt-2 max-w-2xl text-sm text-gray-400">
                  Latinoamérica (primero), España, español global e inglés. Listas públicas (iptv-org),
                  pueden cambiar.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div
                  role="group"
                  aria-label="Cambiar vista"
                  className="inline-flex rounded-lg border border-white/10 bg-white/5 p-1"
                >
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    aria-pressed={viewMode === 'list'}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-viru-red ${
                      viewMode === 'list' ? 'bg-viru-red text-white shadow-viru-glow-red' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    Lista
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    aria-pressed={viewMode === 'grid'}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-viru-red ${
                      viewMode === 'grid' ? 'bg-viru-red text-white shadow-viru-glow-red' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h6v6H4zM14 6h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
                    </svg>
                    Mosaico
                  </button>
                </div>
              </div>
            </header>

            {/* ── Breadcrumb / contexto ──────────────────────────── */}
            <nav
              className="mb-3 flex flex-wrap items-center gap-2 text-sm text-gray-400"
              aria-label="Contexto del canal"
            >
              <span className="text-gray-500">TV en vivo</span>
              <span aria-hidden className="text-gray-700">/</span>
              <span className="truncate text-gray-300">
                {selectedChannel?.category || '—'}
              </span>
              <span aria-hidden className="text-gray-700">/</span>
              {selectedChannel ? (
                <LiveTvRegionFlag
                  countryCode={selectedChannel.countryCode}
                  region={selectedChannel.region}
                  label={selectedChannel.source || ''}
                  size="md"
                />
              ) : (
                <span className="text-gray-500">—</span>
              )}
            </nav>

            {/* ── Grid principal: player + sidebar ─────────────── */}
            <div className="grid gap-6 lg:grid-cols-[1fr_22rem] xl:grid-cols-[1fr_24rem]">
              {/* ——— Columna izquierda: reproductor + info ——— */}
              <section className="flex min-w-0 flex-col gap-4">
                {/* Reproductor 16:9 */}
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-viru-card ring-1 ring-white/10">
                  {selectedChannel?.streamUrl ? (
                    <>
                      {/* Overlay superior izquierdo: EN VIVO + hint */}
                      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
                        <LiveBadge />
                        {playbackHint ? (
                          <span className="pointer-events-auto rounded-lg bg-black/75 px-3 py-1 text-xs text-amber-100 ring-1 ring-amber-500/30 backdrop-blur-xs">
                            {playbackHint}
                          </span>
                        ) : null}
                      </div>

                      {/* Overlay superior derecho: acciones */}
                      <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => selectedChannel && toggleFavorite(selectedChannel.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-base text-white ring-1 ring-white/15 backdrop-blur-xs transition hover:bg-black/80 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-viru-red"
                          aria-label={favoriteIds.includes(selectedChannel.id) ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                          title={favoriteIds.includes(selectedChannel.id) ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                        >
                          <span aria-hidden className={favoriteIds.includes(selectedChannel.id) ? 'text-yellow-300' : 'text-white'}>
                            {favoriteIds.includes(selectedChannel.id) ? '★' : '☆'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={handleShare}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/15 backdrop-blur-xs transition hover:bg-black/80 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-viru-red"
                          aria-label="Compartir"
                          title="Compartir"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={handleReport}
                          className="hidden sm:inline-flex h-9 items-center rounded-full bg-black/60 px-3 text-xs font-medium text-white ring-1 ring-white/15 backdrop-blur-xs transition hover:bg-black/80 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-viru-red"
                        >
                          Reportar
                        </button>
                      </div>

                      <video
                        ref={videoRef}
                        controls
                        autoPlay
                        playsInline
                        className="h-full w-full"
                        title={selectedChannel.name}
                      >
                        Tu navegador no soporta la reproducción de video.
                      </video>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <PlayerState
                        variant="empty"
                        title="Sin señal"
                        message="No hay URL de reproducción para el canal seleccionado."
                      />
                    </div>
                  )}
                </div>

                {/* Info del canal (fuera del aspect-video para no romper la proporción) */}
                {selectedChannel && (
                  <div className="rounded-2xl border border-white/5 bg-linear-to-br from-gray-900/90 to-gray-950/95 p-5 shadow-viru-card">
                    <div className="flex items-start gap-4">
                      <img
                        src={selectedChannel.logo || FALLBACK_IMAGE}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-xl bg-black/50 object-cover ring-1 ring-white/10"
                        loading="lazy"
                        onError={(e) => {
                          e.target.src = FALLBACK_IMAGE;
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <h2 className="font-heading text-2xl leading-tight tracking-wide text-white sm:text-3xl">
                          {selectedChannel.name}
                        </h2>
                        <p className="mt-1 line-clamp-2 text-sm text-gray-400">
                          {selectedChannel.description}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-viru-red/15 px-3 py-1 text-xs font-semibold text-[#ff6b6b] ring-1 ring-viru-red/30">
                            {selectedChannel.category}
                          </span>
                          {selectedChannel.source ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300 ring-1 ring-white/10">
                              <LiveTvRegionFlag
                                countryCode={selectedChannel.countryCode}
                                region={selectedChannel.region}
                                label={selectedChannel.source}
                              />
                            </span>
                          ) : null}
                          <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs text-gray-400 ring-1 ring-white/10">
                            HLS · stream en vivo
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Nota iptv-org */}
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-xs text-amber-100 sm:text-sm">
                  <strong className="font-semibold">Nota:</strong> Los canales provienen de listas públicas
                  (iptv-org) y pueden dejar de funcionar. Si uno falla, intentamos el siguiente automáticamente
                  hasta un límite.
                </div>
              </section>

              {/* ——— Columna derecha: sidebar de canales ——— */}
              <motion.aside
                layout={!prefersReducedMotion}
                className={`flex min-w-0 flex-col gap-3 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-hidden ${
                  sidebarCollapsed ? 'lg:w-14' : ''
                }`}
              >
                {/* Header sidebar */}
                <div className="flex items-center justify-between gap-2">
                  {!sidebarCollapsed && (
                    <div className="flex items-center gap-2 min-w-0">
                      <h2 className="font-heading text-2xl tracking-wide text-white">Canales</h2>
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-gray-400 ring-1 ring-white/10">
                        {filteredChannels.length.toLocaleString('es')}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setSidebarCollapsed((c) => !c)}
                    className="hidden shrink-0 rounded-lg border border-white/15 bg-white/5 p-2 text-gray-300 hover:bg-white/10 hover:text-white focus:outline-hidden focus-visible:ring-2 focus-visible:ring-viru-red lg:inline-flex"
                    aria-expanded={!sidebarCollapsed}
                    aria-label={sidebarCollapsed ? 'Expandir lista de canales' : 'Colapsar lista de canales'}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      {sidebarCollapsed ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      )}
                    </svg>
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {!sidebarCollapsed && (
                    <motion.div
                      key="sidebar-inner"
                      initial={prefersReducedMotion ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden"
                    >
                      {/* Buscador */}
                      <div className="relative">
                        <label htmlFor="live-tv-search" className="sr-only">
                          Buscar canal
                        </label>
                        <svg
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          aria-hidden
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          id="live-tv-search"
                          type="search"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Buscar canal…"
                          autoComplete="off"
                          list="live-tv-channel-suggestions"
                          className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-sm text-white placeholder-gray-500 backdrop-blur-xs focus:border-viru-cyan/60 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-viru-red"
                        />
                        <datalist id="live-tv-channel-suggestions">
                          {searchSuggestions.map((c) => (
                            <option key={c.id} value={c.name} />
                          ))}
                        </datalist>
                      </div>

                      {/* Favoritos (sólo si hay) */}
                      {favoriteChannels.length > 0 && (
                        <div>
                          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                            <span aria-hidden className="text-yellow-300">★</span>
                            Favoritos
                          </p>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {favoriteChannels.map((ch) => (
                              <button
                                key={ch.id}
                                type="button"
                                onClick={() => handleChannelSelect(ch)}
                                className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg ring-2 transition-transform hover:scale-105 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-viru-red ${
                                  selectedChannel?.id === ch.id ? 'ring-viru-red' : 'ring-white/10'
                                }`}
                                title={ch.name}
                              >
                                <img
                                  src={ch.logo || FALLBACK_IMAGE}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    e.target.src = FALLBACK_IMAGE;
                                  }}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Categoría (chips scroll horizontal) */}
                      <div>
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                          Categoría
                        </p>
                        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                          {categories.map((cat) => {
                            const isActive = selectedCategory === cat.id;
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-viru-red ${
                                  isActive
                                    ? 'border-viru-red bg-viru-red text-white'
                                    : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/25'
                                }`}
                              >
                                {cat.label}
                                <span className="ml-1 text-[10px] opacity-70">({cat.count})</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Toggle NSFW */}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                          Contenido adulto
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={showNsfw}
                          disabled={!profile}
                          onClick={async () => {
                            const newValue = !showNsfw;
                            setShowNsfw(newValue);
                            if (profile) {
                              await updateUserProfile(profile.id, { show_adult_content: newValue });
                              await refreshProfile();
                            }
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-viru-red disabled:opacity-50 ${
                            showNsfw ? 'bg-viru-red' : 'bg-white/10'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                              showNsfw ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Origen (select para no ocupar tanto espacio) */}
                      <div>
                        <label
                          htmlFor="live-tv-source"
                          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500"
                        >
                          Origen
                        </label>
                        <select
                          id="live-tv-source"
                          value={selectedSource}
                          onChange={(e) => setSelectedSource(e.target.value)}
                          className="w-full cursor-pointer rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white backdrop-blur-xs focus:border-viru-cyan/60 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-viru-red"
                        >
                          {sources.map((src) => (
                            <option key={src.id} value={src.id}>
                              {src.label} ({src.count})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Lista / Mosaico de canales */}
                      <div className="min-h-0 flex-1 overflow-hidden">
                        {filteredChannels.length === 0 ? (
                          <div className="py-6">
                            <PlayerState
                              variant="empty"
                              title="Sin canales en esta vista"
                              message="Prueba otro origen, categoría o limpia la búsqueda."
                              actions={[
                                {
                                  id: 'reset',
                                  label: 'Restablecer filtros',
                                  onClick: () => {
                                    setSearchTerm('');
                                    setSelectedCategory(ALL_CATEGORIES_ID);
                                    setSelectedSource(ALL_SOURCES_ID);
                                  },
                                  variant: 'primary',
                                },
                              ]}
                            />
                          </div>
                        ) : viewMode === 'grid' ? (
                          <div className="grid max-h-[68vh] grid-cols-2 gap-1.5 overflow-y-auto pr-1 lg:max-h-[calc(100vh-21rem)]">
                            {visibleChannels.map((ch) => renderChannelButton(ch))}
                          </div>
                        ) : (
                          <div className="flex max-h-[68vh] flex-col gap-1.5 overflow-y-auto pr-1 lg:max-h-[calc(100vh-21rem)]">
                            {visibleChannels.map((ch) => renderChannelButton(ch))}
                          </div>
                        )}

                        {remainingCount > 0 && (
                          <ViruButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            fullWidth
                            className="mt-3 border border-white/10"
                            onClick={handleLoadMore}
                          >
                            Ver {Math.min(remainingCount, VISIBLE_CHANNELS_STEP)} más · {remainingCount} restantes
                          </ViruButton>
                        )}
                      </div>

                      <p className="text-center text-[11px] text-gray-500">
                        {visibleChannels.length} mostrados · {filteredChannels.length} filtrados · {channels.length} totales
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {sidebarCollapsed && (
                  <p className="hidden rotate-180 text-center text-[10px] font-medium uppercase tracking-widest text-gray-500 lg:block [writing-mode:vertical-rl]">
                    Canales
                  </p>
                )}
              </motion.aside>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

export default LiveTV;
