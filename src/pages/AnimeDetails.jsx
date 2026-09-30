/**
 * Página de detalles de un anime (MyAnimeList).
 * Si existe equivalente TMDB (AniList o búsqueda por título), redirige a /tv o /movie (misma ficha que en Buscar).
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAnimeDetails, getAnimeWatchPath, resolveTmdbPlaybackForMalAnime } from '../services/mal/malService';
import { FALLBACK_IMAGE } from '../utils/imageOptimizer';

function cleanMalOverview(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\s*\[Written by MAL Rewrite]\s*/gi, '')
    .replace(/\s*\(Source:\s*[^)]+\)\s*/gi, '')
    .trim();
}

function AnimeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id || isNaN(parseInt(id, 10))) {
      setError('ID de anime no válido');
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await getAnimeDetails(id);
        if (cancelled) return;

        const malNum = parseInt(id, 10);
        const tmdbPlayback =
          Number.isFinite(malNum) && malNum > 0
            ? await resolveTmdbPlaybackForMalAnime(malNum, data)
            : null;

        if (cancelled) return;

        if (tmdbPlayback?.tmdbType === 'tv') {
          navigate(`/tv/${tmdbPlayback.tmdbId}`, { replace: true });
          return;
        }
        if (tmdbPlayback?.tmdbType === 'movie') {
          navigate(`/movie/${tmdbPlayback.tmdbId}`, { replace: true });
          return;
        }

        setDetails({
          ...data,
          overview: cleanMalOverview(data.overview),
          tmdbPlayback: null,
        });
      } catch (err) {
        console.error('Error cargando anime:', err);
        if (!cancelled) {
          setError(err?.message || 'No se pudo cargar el anime.');
          setDetails(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0B0C10' }}>
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-600 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Buscando ficha en TMDB…</p>
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0B0C10' }}>
        <div className="text-center text-white">
          <p className="text-xl text-red-500 mb-4">{error || 'Anime no encontrado'}</p>
          <button onClick={() => navigate('/anime')} className="px-6 py-2 bg-red-600 rounded-sm hover:bg-red-700 transition-colors">
            Volver a Anime
          </button>
        </div>
      </div>
    );
  }

  const numEpisodes = details.numEpisodes || 0;
  const episodes = numEpisodes > 0 ? Array.from({ length: numEpisodes }, (_, i) => i + 1) : [];

  return (
    <div className="min-h-screen pb-12" style={{ backgroundColor: '#0B0C10' }}>
      <section className="relative pt-24 sm:pt-28 pb-8 px-4 sm:px-6 md:px-8">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
          style={{
            backgroundImage: details.backdropUrl
              ? `linear-gradient(to bottom, transparent, #0B0C10), url(${details.backdropUrl})`
              : 'none',
            backgroundSize: 'cover'
          }}
        />
        <div className="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          <div className="shrink-0 w-full max-w-xs mx-auto md:mx-0">
            <img
              src={details.posterUrl || FALLBACK_IMAGE}
              alt={details.title}
              className="w-full rounded-lg shadow-xl object-cover aspect-2/3"
              onError={(e) => { e.target.src = FALLBACK_IMAGE; }}
            />
          </div>
          <div className="flex-1 text-white">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 tracking-tight">{details.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-gray-300 mb-4">
              {details.rating && (
                <span className="px-3 py-1 rounded-sm text-sm font-semibold text-black" style={{ backgroundColor: 'var(--color-brand-secondary)' }}>
                  {details.rating}
                </span>
              )}
              {details.releaseYear && <span>{details.releaseYear}</span>}
              {details.genres?.length > 0 && (
                <span>{details.genres.map((g) => g.name).join(', ')}</span>
              )}
              {details.numEpisodes ? <span>• {details.numEpisodes} episodios</span> : null}
            </div>
            <p className="text-gray-200 text-base md:text-lg mb-4 max-w-2xl leading-relaxed">{details.overview}</p>
            <p className="text-xs text-gray-500 mb-4">
              Ficha solo en MyAnimeList: no hay equivalente verificado en TMDB (serie o película). La reproducción usa el reproductor por ID MAL / AniList.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate(getAnimeWatchPath(details, 1))}
                className="flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-sm transition-colors"
                style={{ backgroundColor: 'var(--color-brand-primary)' }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                VER AHORA
              </button>
              <button
                onClick={() => navigate('/anime')}
                className="px-6 py-3 bg-gray-700/80 hover:bg-gray-600 text-white font-semibold rounded-sm transition-colors"
              >
                Volver a Anime
              </button>
            </div>
          </div>
        </div>
      </section>

      {episodes.length > 0 && (
        <section className="px-4 sm:px-6 md:px-8 pt-8">
          <h2 className="text-xl font-bold text-white mb-4">Episodios</h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 sm:gap-3">
            {episodes.map((ep) => (
              <button
                key={ep}
                onClick={() => navigate(getAnimeWatchPath(details, ep))}
                className="aspect-video rounded-sm bg-gray-800 hover:bg-gray-700 text-white font-medium flex items-center justify-center transition-colors"
              >
                {ep}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default AnimeDetails;
