/**
 * Página de Detalles de Película/Serie
 * 
 * Muestra información completa de una película o serie estilo Disney+.
 * 
 * @component
 * @returns {JSX.Element} Página con detalles del contenido
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MovieRow from '../components/MovieRow';
import { 
  getMovieDetails, 
  getTVDetails, 
  getMovieRecommendations, 
  getTVRecommendations,
  getSimilarMovies,
  getSimilarTV,
  getTVSeasonDetails
} from '../services/tmdb/tmdbService';
import { buildAnimeSeasonPlan } from '../services/anime/seasonMapping';
import { getRecommendationsForContent } from '../services/supabase/recommendationService';
import { getWatchProgressForContent } from '../services/supabase/historyService';
import { FALLBACK_IMAGE, getOriginalQualityUrl } from '../utils/imageOptimizer';

function MovieDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  // Determinar el tipo desde la ruta actual
  const isTV = location.pathname.startsWith('/tv/');
  
  const [details, setDetails] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [personalizedRecs, setPersonalizedRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('sugerencias');
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [seasonData, setSeasonData] = useState(null);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [animeSeasonPlan, setAnimeSeasonPlan] = useState(null);
  const [animeSelectedIndex, setAnimeSelectedIndex] = useState(0);
  const [resumeProgress, setResumeProgress] = useState(null);

  useEffect(() => {
    async function loadDetails() {
      try {
        setLoading(true);
        setError(null);

        // Validar que el ID sea válido (número o contenido adulto)
        // Si el ID es "movies" o "series", redirigir a la página correspondiente
        if (id === 'movies' || id === 'series') {
          navigate(id === 'movies' ? '/movies' : '/series', { replace: true });
          return;
        }

        // Validar que el ID sea un número válido (si no es contenido adulto)
        if (!id || (id && !id.startsWith('adult-') && isNaN(parseInt(id)))) {
          setError('ID de contenido no válido');
          setLoading(false);
          return;
        }

        // Detectar si es contenido adulto (IDs que empiezan con "adult-" o están en localStorage)
        const isAdultContent = id.startsWith('adult-') || 
                               (typeof window !== 'undefined' && 
                                localStorage.getItem(`adult-content-${id}`) === 'true');

        if (isAdultContent) {
          // Para contenido adulto, obtener los datos del localStorage o del estado
          // Si no están disponibles, usar datos básicos
          const adultDataStr = localStorage.getItem(`adult-content-data-${id}`);
          if (adultDataStr) {
            try {
              const adultData = JSON.parse(adultDataStr);
              setDetails({
                ...adultData,
                id: id,
                mediaType: 'movie',
                rating: '18+',
                certification: '18+'
              });
              // Para contenido adulto, no hay recomendaciones de TMDB
              setRecommendations([]);
              setPersonalizedRecs([]);
              setSimilar([]);
            } catch (e) {
              console.error('Error parseando datos de contenido adulto:', e);
              setError('Error al cargar los detalles del contenido.');
            }
          } else {
            // Si no hay datos guardados, mostrar error pero permitir navegar al reproductor
            setDetails({
              id: id,
              title: 'Contenido +18',
              overview: 'Contenido para mayores de 18 años',
              posterUrl: '',
              backdropUrl: '',
              mediaType: 'movie',
              rating: '18+',
              certification: '18+'
            });
            setRecommendations([]);
            setPersonalizedRecs([]);
            setSimilar([]);
          }
          setLoading(false);
          return;
        }

        // Contenido normal de TMDB
        const [detailsData, recommendationsData, similarData] = await Promise.all([
          isTV ? getTVDetails(id) : getMovieDetails(id),
          isTV ? getTVRecommendations(id) : getMovieRecommendations(id),
          isTV ? getSimilarTV(id) : getSimilarMovies(id)
        ]);

        setDetails(detailsData);
        if (isTV && user?.id) {
          const { success: progressOk, data: progressData } = await getWatchProgressForContent(
            user.id,
            parseInt(id, 10),
            'tv'
          );
          if (progressOk && progressData) {
            setResumeProgress(progressData);
            const parsedSeason = Number(progressData.season_number);
            if (Number.isFinite(parsedSeason) && parsedSeason >= 1) {
              setSelectedSeason(parsedSeason);
            }
          } else {
            setResumeProgress(null);
          }
        } else {
          setResumeProgress(null);
        }
        
        // ID de la película/serie actual para excluirla de las recomendaciones
        const currentContentId = parseInt(id);
        
        // Filtrar duplicados entre recomendaciones y similares para que sean diferentes
        const recommendationsIds = new Set((recommendationsData || []).map(r => r.id));
        const similarIds = new Set((similarData || []).map(s => s.id));
        
        // "Recomendaciones" - usar recomendaciones de TMDB, excluyendo similares y la película actual
        const filteredRecommendations = (recommendationsData || []).filter(r => 
          !similarIds.has(r.id) && r.id !== currentContentId
        );
        setRecommendations(filteredRecommendations);
        
        // "Porque viste X" - usar contenido similar, excluyendo recomendaciones y la película actual
        // Solo mostrar si el usuario está logueado
        if (user) {
          const filteredSimilar = (similarData || []).filter(s => 
            !recommendationsIds.has(s.id) && s.id !== currentContentId
          );
          setPersonalizedRecs(filteredSimilar.slice(0, 10));
        } else {
          setPersonalizedRecs([]);
        }
        
        // Guardar similar completo para otras secciones si es necesario
        setSimilar(similarData);
        
        // Establecer tab de episodios para series una vez cargado
        if (isTV) {
          setActiveTab('episodios');
        }
      } catch (err) {
        console.error('Error cargando detalles:', err);
        setError('Error al cargar los detalles. Por favor, intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadDetails();
      window.scrollTo(0, 0);
    }
  }, [id, isTV, user, navigate]);

  // Cargar episodios de la temporada seleccionada (flujo TMDB estándar: sólo si NO hay plan anime)
  useEffect(() => {
    async function loadSeasonDetails() {
      if (!isTV || !details) return;
      if (animeSeasonPlan) return; // Cuando hay plan AniList usamos esa data, no la de TMDB directa.

      try {
        setLoadingEpisodes(true);
        const seasonDetails = await getTVSeasonDetails(id, selectedSeason);
        setSeasonData(seasonDetails);
      } catch (err) {
        console.error('Error cargando episodios:', err);
      } finally {
        setLoadingEpisodes(false);
      }
    }

    loadSeasonDetails();
  }, [id, selectedSeason, isTV, details, animeSeasonPlan]);

  // Intento de dividir temporadas anime consolidadas (JJK y similares) usando AniList + fechas.
  useEffect(() => {
    let cancelled = false;
    async function tryBuildAnimePlan() {
      if (!isTV || !details) {
        setAnimeSeasonPlan(null);
        setAnimeSelectedIndex(0);
        return;
      }
      try {
        setLoadingEpisodes(true);
        const plan = await buildAnimeSeasonPlan(details);
        if (cancelled) return;
        if (plan && Array.isArray(plan.seasons) && plan.seasons.length > 1) {
          setAnimeSeasonPlan(plan);
          const resumeEpisode = Number(resumeProgress?.episode_number);
          if (Number.isFinite(resumeEpisode) && resumeEpisode >= 1) {
            const resumeIdx = plan.seasons.findIndex((season) =>
              (season.episodes || []).some(
                (ep) => Number(ep.tmdbEpisodeNumber) === resumeEpisode
              )
            );
            setAnimeSelectedIndex(resumeIdx >= 0 ? resumeIdx : plan.seasons.length - 1);
          } else {
            setAnimeSelectedIndex(plan.seasons.length - 1);
          }
        } else {
          setAnimeSeasonPlan(null);
          setAnimeSelectedIndex(0);
        }
      } catch (err) {
        console.debug('[MovieDetails] plan anime omitido:', err);
        if (!cancelled) {
          setAnimeSeasonPlan(null);
          setAnimeSelectedIndex(0);
        }
      } finally {
        if (!cancelled) setLoadingEpisodes(false);
      }
    }
    tryBuildAnimePlan();
    return () => {
      cancelled = true;
    };
  }, [id, isTV, details, resumeProgress?.episode_number]);

  // Formatear duración
  const formatRuntime = (minutes) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours} h ${mins} min` : `${mins} min`;
  };

  // Obtener trailer de YouTube
  const getTrailer = () => {
    if (!details?.videos?.length) return null;
    const trailer = details.videos.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    return trailer || details.videos[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0B0C10' }}>
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0B0C10' }}>
        <div className="text-center text-white">
          <p className="text-xl mb-4" style={{ color: 'var(--color-brand-primary)' }}>{error || 'Contenido no encontrado'}</p>
          <button 
            onClick={() => navigate(-1)} 
            className="px-6 py-2 bg-white text-black rounded-sm hover:bg-gray-200 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const trailer = getTrailer();
  const seasonsCount = (animeSeasonPlan?.seasons?.length ?? details.numberOfSeasons) || 0;
  const resumeSeasonNumber = Number(resumeProgress?.season_number);
  const resumeEpisodeNumber = Number(resumeProgress?.episode_number);
  const resumePercent = Number(resumeProgress?.progress ?? 0);
  const hasResumeData =
    isTV &&
    Number.isFinite(resumeSeasonNumber) &&
    resumeSeasonNumber >= 1 &&
    Number.isFinite(resumeEpisodeNumber) &&
    resumeEpisodeNumber >= 1 &&
    resumePercent > 0 &&
    resumePercent < 90;
  const watchNowUrl = hasResumeData
    ? `/watch/tv/${id}?season=${resumeSeasonNumber}&episode=${resumeEpisodeNumber}&from=continue`
    : `/watch/${isTV ? 'tv' : 'movie'}/${id}`;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0B0C10' }}>
      {/* Hero Section */}
      <section className="relative min-h-[70vh] md:min-h-[80vh] flex items-end">
        {/* Imagen de fondo en calidad original */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${getOriginalQualityUrl(details.backdropUrl) || getOriginalQualityUrl(details.posterUrl) || details.backdropUrl || details.posterUrl})`,
          }}
        />
        
        {/* Gradientes */}
        <div className="absolute inset-0 bg-linear-to-r from-black via-black/70 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-t from-[#0B0C10] via-transparent to-transparent" />
        
        {/* Contenido */}
        <div className="relative z-10 w-full px-4 sm:px-6 md:px-8 pb-8 md:pb-12">
          <div className="max-w-2xl">
            {/* Título */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 drop-shadow-2xl"
                style={{ 
                  fontFamily: 'serif',
                  fontStyle: 'italic'
                }}>
              {details.title}
            </h1>
            
            {/* Badges */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {details.certification && (
                <span className="px-2 py-0.5 border border-gray-400 text-gray-300 text-xs rounded-sm">
                  {details.certification}
                </span>
              )}
              <span className="px-2 py-0.5 border border-gray-400 text-gray-300 text-xs rounded-sm">
                HD
              </span>
              <span className="px-2 py-0.5 border border-gray-400 text-gray-300 text-xs rounded-sm">
                CC
              </span>
            </div>
            
            {/* Metadata */}
            <div className="flex items-center gap-2 text-gray-300 text-sm mb-4 flex-wrap">
              {details.releaseYear && <span>{details.releaseYear}</span>}
              {details.runtime && (
                <>
                  <span>•</span>
                  <span>{formatRuntime(details.runtime)}</span>
                </>
              )}
              {isTV && seasonsCount > 0 && (
                <>
                  <span>•</span>
                  <span>{seasonsCount} temporada{seasonsCount > 1 ? 's' : ''}</span>
                </>
              )}
              {details.genres?.length > 0 && (
                <>
                  <span>•</span>
                  <span>{details.genres.map(g => g.name).join(', ')}</span>
                </>
              )}
            </div>
            
            {/* Descripción */}
            <p className="text-gray-200 text-base md:text-lg mb-6 max-w-xl line-clamp-3 md:line-clamp-none">
              {details.overview}
            </p>
            
            {/* Botones */}
            <div className="flex items-center gap-3 flex-wrap">
              <button 
                onClick={() => navigate(watchNowUrl)}
                className="flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-sm transition-colors"
                style={{ 
                  backgroundColor: 'var(--color-brand-primary)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#CC0026'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-brand-primary)'}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                {hasResumeData ? `REANUDAR T${resumeSeasonNumber}:E${resumeEpisodeNumber}` : 'VER AHORA'}
              </button>
              {trailer && (
                <button 
                  onClick={() => {
                    // Abrir trailer en nueva ventana (permitido por Electron)
                    window.open(`https://www.youtube.com/watch?v=${trailer.key}`, '_blank');
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-700/80 hover:bg-gray-600 text-white font-semibold rounded-sm transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  TRAILER
                </button>
              )}
              <button className="p-3 bg-gray-700/80 hover:bg-gray-600 rounded-full transition-colors">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="px-4 sm:px-6 md:px-8 pt-6 pb-4 border-b border-gray-700">
        <div className="flex gap-8">
          {isTV && (
            <button
              onClick={() => setActiveTab('episodios')}
              className={`text-sm font-semibold uppercase tracking-wider pb-2 transition-colors ${
                activeTab === 'episodios' 
                  ? 'text-white border-b-2 border-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Episodios
            </button>
          )}
          <button
            onClick={() => setActiveTab('sugerencias')}
            className={`text-sm font-semibold uppercase tracking-wider pb-2 transition-colors ${
              activeTab === 'sugerencias' 
                ? 'text-white border-b-2 border-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sugerencias
          </button>
          <button
            onClick={() => setActiveTab('detalles')}
            className={`text-sm font-semibold uppercase tracking-wider pb-2 transition-colors ${
              activeTab === 'detalles' 
                ? 'text-white border-b-2 border-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Detalles
          </button>
        </div>
      </section>

      {/* Contenido de tabs */}
      <div className="py-6">
        {activeTab === 'episodios' && isTV && (() => {
          const usingAnimePlan = Boolean(animeSeasonPlan && animeSeasonPlan.seasons?.length);
          const currentAnimeSeason = usingAnimePlan
            ? animeSeasonPlan.seasons[animeSelectedIndex] || animeSeasonPlan.seasons[0]
            : null;
          const episodesToRender = usingAnimePlan
            ? (currentAnimeSeason?.episodes || []).map((ep) => ({
                id: ep.id,
                displayEpisodeNumber: ep.displayEpisodeNumber,
                tmdbEpisodeNumber: ep.tmdbEpisodeNumber,
                name: ep.name,
                overview: ep.overview,
                airDate: ep.airDate,
                runtime: ep.runtime,
                stillUrl: ep.stillUrl,
              }))
            : (seasonData?.episodes || []).map((ep) => ({
                id: ep.id,
                displayEpisodeNumber: ep.episodeNumber,
                tmdbEpisodeNumber: ep.episodeNumber,
                name: ep.name,
                overview: ep.overview,
                airDate: ep.airDate,
                runtime: ep.runtime,
                stillUrl: ep.stillUrl,
              }));
          const tmdbSeasonForWatch = usingAnimePlan
            ? (animeSeasonPlan.tmdbSeasonNumber || 1)
            : selectedSeason;

          return (
            <div className="px-4 sm:px-6 md:px-8">
              {/* Selector de temporadas */}
              <div className="mb-6">
                {usingAnimePlan ? (
                  <select
                    value={animeSelectedIndex}
                    onChange={(e) => setAnimeSelectedIndex(Number(e.target.value))}
                    className="bg-gray-800 text-white px-4 py-2 rounded-sm border border-gray-600 focus:outline-hidden focus:border-white cursor-pointer"
                  >
                    {animeSeasonPlan.seasons.map((s, idx) => (
                      <option key={s.anilistId ?? idx} value={idx}>
                        {s.label} ({s.episodes.length} eps)
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(Number(e.target.value))}
                    className="bg-gray-800 text-white px-4 py-2 rounded-sm border border-gray-600 focus:outline-hidden focus:border-white cursor-pointer"
                  >
                    {details && Array.from({ length: details.numberOfSeasons }, (_, i) => i + 1).map(season => (
                      <option key={season} value={season}>
                        Temporada {season}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Grid de episodios */}
              {loadingEpisodes ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                </div>
              ) : episodesToRender.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {episodesToRender.map((episode) => (
                    <div
                      key={`${tmdbSeasonForWatch}-${episode.tmdbEpisodeNumber}-${episode.id}`} 
                      className={`group cursor-pointer ${
                        hasResumeData &&
                        tmdbSeasonForWatch === resumeSeasonNumber &&
                        Number(episode.tmdbEpisodeNumber) === resumeEpisodeNumber
                          ? 'rounded-sm ring-2 ring-viru-red/80 ring-offset-1 ring-offset-black'
                          : ''
                      }`}
                      onClick={() => navigate(`/watch/${isTV ? 'tv' : 'movie'}/${id}?season=${tmdbSeasonForWatch}&episode=${episode.tmdbEpisodeNumber}`)}
                    >
                      {/* Imagen del episodio */}
                      <div className="relative rounded-sm overflow-hidden mb-2 bg-gray-800">
                        <img
                          src={episode.stillUrl || details.posterUrl}
                          alt={episode.name}
                          className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.src = FALLBACK_IMAGE;
                          }}
                        />
                        {/* Overlay con play button en hover */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                        {hasResumeData &&
                          tmdbSeasonForWatch === resumeSeasonNumber &&
                          Number(episode.tmdbEpisodeNumber) === resumeEpisodeNumber && (
                            <>
                              <div className="absolute left-2 top-2 rounded-full bg-viru-red px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                                Continuar
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/50">
                                <div
                                  className="h-full bg-viru-red"
                                  style={{ width: `${Math.min(Math.max(resumePercent, 0), 100)}%` }}
                                />
                              </div>
                            </>
                          )}
                      </div>

                      {/* Info del episodio */}
                      <div>
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="text-white font-semibold text-sm line-clamp-1">
                            {episode.displayEpisodeNumber}. {episode.name}
                          </h3>
                          {episode.runtime && (
                            <span className="text-gray-400 text-xs ml-1 shrink-0">
                              {episode.runtime}m
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-xs line-clamp-2">
                          {episode.overview || 'Sin descripción disponible.'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-12">
                  <p>No hay episodios disponibles</p>
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === 'sugerencias' && (
          <div className="space-y-8">
            {user && personalizedRecs.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-white mb-4 px-4 sm:px-6 md:px-8">
                  Porque viste <span className="text-viru-red">{details?.title || details?.name}</span>, te recomendamos:
                </h3>
                <MovieRow title="" movies={personalizedRecs} />
              </div>
            )}
            {recommendations.length > 0 && (
              <MovieRow title="Recomendaciones" movies={recommendations} />
            )}
            {recommendations.length === 0 && personalizedRecs.length === 0 && (
              <div className="text-center text-gray-400 py-12">
                <p>No hay sugerencias disponibles</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'detalles' && (
          <div className="px-4 sm:px-6 md:px-8 max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Columna izquierda */}
              <div className="space-y-6">
                {/* Sinopsis completa */}
                <div>
                  <h3 className="text-white font-semibold mb-2">Sinopsis</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {details.overview || 'Sin descripción disponible.'}
                  </p>
                </div>

                {/* Géneros */}
                {details.genres?.length > 0 && (
                  <div>
                    <h3 className="text-white font-semibold mb-2">Géneros</h3>
                    <div className="flex flex-wrap gap-2">
                      {details.genres.map(genre => (
                        <span key={genre.id} className="px-3 py-1 bg-gray-700 text-gray-300 text-sm rounded-full">
                          {genre.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reparto */}
                {details.credits?.cast?.length > 0 && (
                  <div>
                    <h3 className="text-white font-semibold mb-2">Reparto</h3>
                    <p className="text-gray-300 text-sm">
                      {details.credits.cast.slice(0, 5).map(c => c.name).join(', ')}
                    </p>
                  </div>
                )}
              </div>

              {/* Columna derecha */}
              <div className="space-y-6">
                {/* Info técnica */}
                <div className="space-y-3">
                  {details.releaseYear && (
                    <div>
                      <h3 className="text-gray-400 text-sm">Año</h3>
                      <p className="text-white">{details.releaseYear}</p>
                    </div>
                  )}
                  
                  {details.runtime && (
                    <div>
                      <h3 className="text-gray-400 text-sm">Duración</h3>
                      <p className="text-white">{formatRuntime(details.runtime)}</p>
                    </div>
                  )}

                  {isTV && seasonsCount > 0 && (
                    <div>
                      <h3 className="text-gray-400 text-sm">Temporadas</h3>
                      <p className="text-white">{seasonsCount}</p>
                    </div>
                  )}

                  {isTV && details.numberOfEpisodes && (
                    <div>
                      <h3 className="text-gray-400 text-sm">Episodios</h3>
                      <p className="text-white">{details.numberOfEpisodes}</p>
                    </div>
                  )}

                  {details.rating && (
                    <div>
                      <h3 className="text-gray-400 text-sm">Calificación</h3>
                      <p className="text-white flex items-center gap-1">
                        <span className="text-yellow-400">★</span> {details.rating}
                      </p>
                    </div>
                  )}

                  {/* Director/Creador */}
                  {details.credits?.crew?.length > 0 && (
                    <div>
                      <h3 className="text-gray-400 text-sm">Director</h3>
                      <p className="text-white">
                        {details.credits.crew.find(c => c.job === 'Director')?.name || 'N/A'}
                      </p>
                    </div>
                  )}

                  {isTV && details.createdBy?.length > 0 && (
                    <div>
                      <h3 className="text-gray-400 text-sm">Creado por</h3>
                      <p className="text-white">
                        {details.createdBy.map(c => c.name).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MovieDetails;

