import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isDemoMode } from '../config/supabase.config.js';
import { DEMO_VIDEO } from '../data/demoCatalog.js';
import { getMovieDetails, getTVDetails } from '../services/tmdb/tmdbService';
import { getAnimeDetails } from '../services/mal/malService';
import { saveWatchProgress } from '../services/supabase/historyService';
import QualitySelector from '../components/QualitySelector';
import PlayerState from '../components/player/PlayerState';
import { deriveWatchMainState } from '../components/player/playerStateHelpers';
import { getPreferredStreamProvider, savePreferredStreamProvider } from '../services/streaming/providerManager';

function Watch() {
  const { type = 'movie', id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(() => getPreferredStreamProvider());
  const [quality, setQuality] = useState('1080p');
  const [progress, setProgress] = useState(0);
  const season = searchParams.get('season') || '1';
  const episode = searchParams.get('episode') || '1';

  useEffect(() => {
    let active = true;
    setLoading(true);
    const load = type === 'anime' ? getAnimeDetails(id) : type === 'tv' ? getTVDetails(id) : getMovieDetails(id);
    load.then((value) => { if (active) setDetails(value); }).catch((reason) => { if (active) setError(reason?.message || 'Unable to load this title.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, type]);

  const title = details?.title || details?.name || `Title ${id}`;
  const streamUrl = useMemo(() => {
    if (source === 'demo' || isDemoMode()) return DEMO_VIDEO;
    const base = 'https://player.videasy.net';
    if (type === 'tv') return `${base}/tv/${id}/${season}/${episode}?lang=es&autoplay=true`;
    if (type === 'anime') return `${base}/anime/${details?.id || id}/${episode}?lang=es&autoplay=true`;
    return `${base}/movie/${id}?lang=es&autoplay=true`;
  }, [source, type, id, season, episode, details]);

  const state = deriveWatchMainState({ loading, loadError: error, streamUrl, onBack: () => navigate(-1) });
  const saveProgress = async (nextProgress) => {
    if (!user || !details) return;
    await saveWatchProgress(user.id, id, type === 'anime' ? 'anime' : type, nextProgress, type === 'tv' ? season : null, type === 'tv' || type === 'anime' ? episode : null, details.runtime || details.episodeRunTime?.[0] || 90);
  };

  if (state) return <div className="flex min-h-screen items-center justify-center bg-black"><PlayerState {...state} /></div>;

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 bg-black/80 px-4 py-3">
        <button type="button" onClick={() => navigate(-1)} className="rounded px-3 py-2 text-sm text-gray-300 hover:bg-white/10">Back</button>
        <h1 className="truncate text-center text-sm font-semibold sm:text-base">{title}</h1>
        <QualitySelector defaultSource={source} defaultQuality={quality} onSourceChange={(value) => { setSource(value); savePreferredStreamProvider(value); }} onQualityChange={setQuality} />
      </header>
      <section className="mx-auto flex min-h-[calc(100vh-76px)] max-w-7xl flex-col justify-center gap-4 p-4">
        <div className="aspect-video overflow-hidden rounded-xl bg-gray-950 shadow-2xl shadow-black">
          {source === 'demo' || isDemoMode() ? (
            <video className="h-full w-full" controls autoPlay playsInline src={DEMO_VIDEO} onTimeUpdate={(event) => { const next = event.currentTarget.duration ? (event.currentTarget.currentTime / event.currentTarget.duration) * 100 : 0; setProgress(next); }} onPause={() => saveProgress(progress).catch(() => {})} />
          ) : <iframe title={title} src={streamUrl} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-400">
          <span>{type === 'tv' || type === 'anime' ? `Season ${season} · Episode ${episode}` : 'Movie'}</span>
          <span>{isDemoMode() ? 'Public demo player' : `Videasy · ${quality}`}</span>
        </div>
      </section>
    </main>
  );
}

export default Watch;
