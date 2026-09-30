/**
 * Página de contenido por marca
 *
 * Muestra películas y series filtradas por la marca/estudio seleccionado.
 *
 * @component
 * @returns {JSX.Element} Página con contenido de la marca seleccionada
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import MovieRow from '../components/MovieRow';
import CollectionButton from '../components/CollectionButton';
import SkeletonHero from '../components/SkeletonHero';
import SkeletonRow from '../components/SkeletonRow';
import {
  getMoviesByCompany,
  getTVByCompany,
  getMoviesByCollection,
  searchMoviesMultiple,
  getAnimatedMoviesByCompany,
  getMusicalMoviesByCompany,
  getFamilyMoviesByCompany,
  searchMultipleTitles
} from '../services/tmdb/tmdbService';
import { TMDB_COMPANIES, TMDB_COLLECTIONS } from '../config/api.config';

// Logos de marcas
const brandLogos = {
  Disney: 'https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/disney/FFA0BEBAC1406D88929497501C84019EBBA1B018D3F7C4C3C829F1810A24AD6E/compose?format=webp&width=800',
  Pixar: 'https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/disney/7F4E1A299763030A0A8527227AD2812C049CE3E02822F7EDEFCFA1CFB703DDA5/compose?format=webp&width=800',
  Marvel: 'https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/disney/8D83D724070255A0A0078E3D7945301A1F5ADD0DCCA1C7F908542AEA0C742823/compose?format=webp&width=800',
  'Star Wars': 'https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/disney/5A9416D67DC9595496B2666087596EE64DE379272051BB854157C0D938BE2C26/compose?format=webp&width=800',
  'National Geographic': 'https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/disney/2EF24AA0A1E648E6D1A3B26491F516632137ED87AB22969D153316F8BD670FB5/compose?format=webp&width=800',
  ESPN: 'https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/disney/1CC4B181E5EF37C07D5D0224A04C504FBBCC238B93173450F0A1960DA7EF4B4F/compose?format=webp&width=800',
  Hulu: 'https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/disney/81FA4D830379184F4220A87D3197E9A13BB6F3873862C9EA8BE66A6B1834BD37/compose?format=webp&width=800'
};

// Colecciones de Disney
const disneyCollections = [
  {
    id: 'walt-disney-animation',
    name: 'Walt Disney Animation',
    logoUrl: 'https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/disney/385A218FA90C437B63E662CBA3D1666CF696105E0DCA58DAF38E913BF9642D33/compose?format=webp&width=800',
    backgroundUrl: 'https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/disney/4192EBF55297F1DA12AB0879FF800009EE5D9A1489A60F599E572E27715AEDE1/compose?format=webp&width=800',
    description: 'Desde Blancanieves hasta Encanto'
  },
  {
    id: 'disney-jr',
    name: 'Disney Jr',
    logoUrl: 'https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/disney/2ADC9BC9A7DB53B74F126132A0D4772E888253F613116D413E321865B5BCF886/compose?format=webp&width=800',
    backgroundUrl: 'https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/disney/54B05BB5D563D1A0288E20B0CD237013349E1C5F9398DBBBDD4FC72E76F0893F/compose?format=webp&width=800',
    description: 'Series para los más pequeños'
  },
  {
    id: 'disney-channel',
    name: 'Disney Channel',
    logoUrl: 'https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/disney/EB5163E1447D87CD07DE33B82D1ACB1BE0D6DE4102C1DE87F2B011EB7EE9F431/compose?format=webp&width=800',
    backgroundUrl: 'https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/disney/22B178EC052D417250DC7C1AA6C9544B01E1F10FCBCEAAB29CCF38B2F4F565AF/compose?format=webp&width=800',
    description: 'Series y originales clásicos'
  },
  {
    id: 'disney-xd',
    name: 'Disney XD',
    logoUrl: 'https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/disney/8F941F373804A8C8BCF91BB839ED458FB94E642398CF5409F5FD48F7FCA7A440/compose?format=webp&width=800',
    backgroundUrl: 'https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/disney/7F83F7A51EFFE7C5BDBF012B62DD1E4ED9D516D91168D7C89393CE2857D101DF/compose?format=webp&width=800',
    description: 'Acción y aventura para jóvenes'
  },
  {
    id: 'disney-channel-movies',
    name: 'Disney Channel Original',
    logoUrl: 'https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/disney/FE96162839912079A1B4A26E87286648142CA39DD3B0659EA24A1A2D892EED85/compose?format=webp&width=800',
    backgroundUrl: 'https://disney.images.edge.bamgrid.com/ripcut-delivery/v2/variant/disney/58FE7B200C48D379AF35AB6E97609D6E2A0F34F023EA613CEEE981A4D11CA28E/compose?format=webp&width=800',
    description: 'Películas originales de Disney Channel'
  }
];

// Config de marcas
const brandConfig = {
  'disney': { name: 'Disney', companyId: TMDB_COMPANIES.DISNEY },
  'pixar': { name: 'Pixar', companyId: TMDB_COMPANIES.PIXAR },
  'marvel': { name: 'Marvel', companyId: TMDB_COMPANIES.MARVEL },
  'star-wars': { name: 'Star Wars', companyId: TMDB_COMPANIES.LUCASFILM },
  'national-geographic': { name: 'National Geographic', companyId: TMDB_COMPANIES.NATIONAL_GEOGRAPHIC },
  'espn': { name: 'ESPN', companyId: TMDB_COMPANIES.ESPN },
  'hulu': { name: 'Hulu', companyId: TMDB_COMPANIES.HULU },
  'prime-video': { name: 'Prime Video', companyId: null }
};

// Filtros para Disney
const DISNEY_CLASSICS_KEYWORDS = ['snow white', 'cinderella', 'sleeping beauty', 'pinocchio', 'dumbo', 'bambi', 'fantasia', 'peter pan', 'jungle book', 'lady and the tramp', '101 dalmatians', 'the aristocats', 'the sword in the stone', 'winnie the pooh'];
const PRINCESS_KEYWORDS = ['princess', 'princesa', 'moana', 'mulan', 'tiana', 'rapunzel', 'brave', 'ariel', 'bella', 'jasmine', 'pocahontas', 'elsa', 'anna', 'frozen', 'encanto', 'cinderella', 'aurora', 'snow white'];

function BrandPage() {
  const { brandName } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCollection = searchParams.get('collection');

  const [movies, setMovies] = useState([]);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Autoscroll to top when brand changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [brandName]);

  // Back to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Content states
  const [disneyContent, setDisneyContent] = useState(null);
  const [marvelContent, setMarvelContent] = useState(null);
  const [pixarContent, setPixarContent] = useState(null);
  const [starWarsContent, setStarWarsContent] = useState(null);
  const [primeVideoContent, setPrimeVideoContent] = useState(null);

  const isDisney = brandName === 'disney';
  const isMarvel = brandName === 'marvel';
  const isPixar = brandName === 'pixar';
  const isStarWars = brandName === 'star-wars';
  const isPrimeVideo = brandName === 'prime-video';

  useEffect(() => {
    async function loadBrandContent() {
      try {
        setLoading(true);
        setError(null);
        setDisneyContent(null);
        setMarvelContent(null);
        setPixarContent(null);
        setStarWarsContent(null);
        setPrimeVideoContent(null);

        // ================== DISNEY ==================
        if (brandName === 'disney') {
          const [allDisneyMovies, allDisneySeries, wdaMovies, musicalMovies, familyMovies] = await Promise.all([
            getMoviesByCompany(TMDB_COMPANIES.DISNEY),
            getTVByCompany(TMDB_COMPANIES.DISNEY),
            getMoviesByCompany(TMDB_COMPANIES.WALT_DISNEY_ANIMATION),
            getMusicalMoviesByCompany(TMDB_COMPANIES.DISNEY),
            getFamilyMoviesByCompany(TMDB_COMPANIES.DISNEY)
          ]);

          const animatedMovies = await getAnimatedMoviesByCompany(TMDB_COMPANIES.DISNEY);
          const liveAction = allDisneyMovies.filter(m => !animatedMovies.some(a => a.id === m.id) && !wdaMovies.some(w => w.id === m.id));

          const classics = allDisneyMovies.filter(m => {
            const title = m.title?.toLowerCase() || '';
            return m.releaseYear < 1990 && DISNEY_CLASSICS_KEYWORDS.some(k => title.includes(k));
          }).sort((a, b) => (a.releaseYear || 0) - (b.releaseYear || 0));

          const princess = allDisneyMovies.filter(m => {
            const title = m.title?.toLowerCase() || '';
            const overview = (m.overview || '').toLowerCase();
            return PRINCESS_KEYWORDS.some(k => title.includes(k) || overview.includes(k));
          }).sort((a, b) => (a.releaseYear || 0) - (b.releaseYear || 0));

          setDisneyContent({
            destacada: allDisneyMovies.slice(0, 10),
            clasicos: classics.length > 0 ? classics : allDisneyMovies.filter(m => m.releaseYear < 1990).slice(0, 10),
            princesas: princess,
            waltDisney: wdaMovies.sort((a, b) => (a.releaseYear || 0) - (b.releaseYear || 0)),
            liveAction,
            originales: allDisneySeries.slice(0, 10),
            musicales: musicalMovies,
            familiares: familyMovies,
            channelSeries: allDisneySeries
          });
          setMovies(allDisneyMovies);
          setSeries(allDisneySeries);

        // ================== MARVEL ==================
        } else if (brandName === 'marvel') {
          const [allMarvelMovies, allMarvelSeries] = await Promise.all([
            getMoviesByCompany(TMDB_COMPANIES.MARVEL),
            getTVByCompany(TMDB_COMPANIES.MARVEL)
          ]);

          const mcu = allMarvelMovies.filter(m => m.releaseYear >= 2008 && m.releaseYear <= 2023).sort((a, b) => (a.releaseYear || 0) - (b.releaseYear || 0));
          const nuevos = allMarvelMovies.filter(m => m.releaseYear >= 2024).sort((a, b) => (a.releaseYear || 0) - (b.releaseYear || 0));
          const anteriores = allMarvelMovies.filter(m => m.releaseYear < 2008).sort((a, b) => (a.releaseYear || 0) - (b.releaseYear || 0));

          setMarvelContent({
            populares: allMarvelMovies.slice(0, 10),
            mcu,
            nuevos,
            anteriores,
            series: allMarvelSeries
          });
          setMovies(allMarvelMovies);
          setSeries(allMarvelSeries);

        // ================== PIXAR ==================
        } else if (brandName === 'pixar') {
          const [allPixarMovies, allPixarSeries] = await Promise.all([
            getMoviesByCompany(TMDB_COMPANIES.PIXAR),
            getTVByCompany(TMDB_COMPANIES.PIXAR)
          ]);

          const primeraEra = allPixarMovies.filter(m => m.releaseYear >= 1995 && m.releaseYear <= 2010).sort((a, b) => (a.releaseYear || 0) - (b.releaseYear || 0));
          const moderna = allPixarMovies.filter(m => m.releaseYear > 2010).sort((a, b) => (a.releaseYear || 0) - (b.releaseYear || 0));

          setPixarContent({
            populares: allPixarMovies.slice(0, 10),
            primeraEra,
            moderna,
            series: allPixarSeries
          });
          setMovies(allPixarMovies);
          setSeries(allPixarSeries);

        // ================== STAR WARS ==================
        } else if (brandName === 'star-wars') {
          const collection = await getMoviesByCollection(TMDB_COLLECTIONS.STAR_WARS);
          const searchQueries = ['Star Wars Episode I', 'Star Wars Episode II', 'Star Wars Episode III', 'Star Wars Episode IV', 'Star Wars Episode V', 'Star Wars Episode VI', 'Star Wars Episode VII', 'Star Wars Episode VIII', 'Star Wars Episode IX', 'Rogue One', 'Solo: A Star Wars Story', 'Star Wars: The Clone Wars'];
          const searched = await searchMoviesMultiple(searchQueries);

          const allSW = [...collection, ...searched];
          const unique = Array.from(new Map(allSW.map(m => [m.id, m])).values());

          const saga = unique.filter(m => m.title.toLowerCase().includes('episode')).sort((a, b) => (a.releaseYear || 0) - (b.releaseYear || 0));
          const spinOffs = unique.filter(m => m.title.toLowerCase().includes('rogue') || m.title.toLowerCase().includes('solo')).sort((a, b) => (a.releaseYear || 0) - (b.releaseYear || 0));

          setStarWarsContent({ saga, spinOffs });
          setMovies(unique);
          setSeries([]);

        // ================== PRIME VIDEO ==================
        } else if (brandName === 'prime-video') {
          const [globalSeries, euroSeries, latSeries, asiaSeries, globalMovies, latMovies] = await Promise.all([
            searchMultipleTitles(['The Boys', 'Gen V', 'Rings of Power', 'Reacher', 'Jack Ryan', 'Upload', 'Good Omens', 'Wheel of Time'], 'tv').catch(() => []),
            searchMultipleTitles(['The English', 'Hanna', 'All or Nothing'], 'tv').catch(() => []),
            searchMultipleTitles(['Maradona', 'DOM', 'Pan y Circo', 'La Jauría'], 'tv').catch(() => []),
            searchMultipleTitles(['The Family Man', 'Mirzapur', 'Made in Heaven'], 'tv').catch(() => []),
            searchMultipleTitles(['Sound of Metal', 'The Tomorrow War', 'Saltburn', 'Red One'], 'movie').catch(() => []),
            searchMultipleTitles(['Argentina 1985', 'El Presidente'], 'movie').catch(() => [])
          ]);

          setPrimeVideoContent({ globalSeries, euroSeries, latSeries, asiaSeries, globalMovies, latMovies });
          setMovies(globalMovies);
          setSeries([...globalSeries, ...euroSeries, ...latSeries, ...asiaSeries]);

        // ================== OTRAS MARCAS ==================
        } else {
          const brand = brandConfig[brandName];
          if (brand?.companyId) {
            const [brandMovies, brandSeries] = await Promise.all([
              getMoviesByCompany(brand.companyId),
              getTVByCompany(brand.companyId)
            ]);
            setMovies(brandMovies);
            setSeries(brandSeries);
          } else {
            const [trendingMovies, trendingSeries] = await Promise.all([getTrendingMovies(), getTrendingTV()]);
            setMovies(trendingMovies.slice(0, 20));
            setSeries(trendingSeries.slice(0, 20));
          }
        }
      } catch (err) {
        console.error('Error loading brand:', err);
        setError('Error al cargar el contenido.');
      } finally {
        setLoading(false);
      }
    }

    if (brandName) loadBrandContent();
  }, [brandName]);

  const handleCollectionClick = (id) => {
    setSearchParams(selectedCollection === id ? {} : { collection: id });
  };

  const displayBrandName = brandConfig[brandName]?.name || brandName?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Marca';

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0B0C10' }}>
        <SkeletonHero />
        <div className="space-y-6 sm:space-y-8 px-4 sm:px-6 md:px-8">
          {[1,2,3,4].map(i => <SkeletonRow key={i} title="" count={10} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0B0C10' }}>
        <div className="text-center text-white">
          <p className="text-xl text-red-500 mb-4">{error}</p>
          <button onClick={() => navigate('/')} className="px-6 py-2 bg-red-600 rounded-sm hover:bg-red-700">Volver</button>
        </div>
      </div>
    );
  }

  const heroContent = movies[0] || series[0];
  const brandLogo = brandLogos[displayBrandName];

  const getCollectionMovies = (id) => {
    if (!disneyContent) return [];
    switch (id) {
      case 'walt-disney-animation': return disneyContent.waltDisney;
      case 'disney-jr': return disneyContent.channelSeries.filter(s => /jr|junior|mickey|doc mcstuffins|pluto|vampirina/i.test(s.title));
      case 'disney-channel': return disneyContent.channelSeries;
      case 'disney-xd': return disneyContent.channelSeries.filter(s => /xd|phineas|ferb|gravity|star vs|lab rats/i.test(s.title));
      case 'disney-channel-movies': return disneyContent.familiares.filter(m => /descendants|high school musical|camp rock/i.test(m.title));
      default: return [];
    }
  };

  const selectedColData = disneyCollections.find(c => c.id === selectedCollection);
  const collectionMovies = selectedCollection ? getCollectionMovies(selectedCollection) : [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0B0C10' }}>
      {/* Hero */}
      <section className="relative h-[55vh] sm:h-[65vh] overflow-hidden" style={{ boxShadow: '0 30px 80px -20px rgba(0,0,0,0.9)' }}>
        {heroContent && (
          <div className="absolute inset-0 bg-cover bg-center" style={{
            backgroundImage: `linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.85) 100%), url(${heroContent.backdropUrl || heroContent.posterUrl})`
          }} />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/50 to-transparent" />

        <div className="absolute inset-0 flex items-center justify-center z-10">
          {brandLogo ? (
            <img src={brandLogo} alt={displayBrandName} className="w-auto h-28 sm:h-36 md:h-44 lg:h-52 object-contain"
              style={{ filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.15))' }} />
          ) : (
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white">{displayBrandName.toUpperCase()}</h1>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 pb-8 sm:pb-12 md:pb-16 px-4 sm:px-6">
          <div className="max-w-2xl">
            {heroContent?.rating && <span className="px-2 py-0.5 rounded-sm text-xs font-semibold text-black bg-yellow-400">{heroContent.rating}</span>}
            <div className="flex gap-3 mt-3">
              <button onClick={() => heroContent && navigate(`/watch/movie/${heroContent.id}`)} disabled={!heroContent}
                className="px-6 py-2 bg-white text-black font-semibold rounded-md hover:bg-gray-200 disabled:opacity-50">
                ▶ Reproducir
              </button>
              <button onClick={() => heroContent && navigate(`/movie/${heroContent.id}`)} disabled={!heroContent}
                className="px-6 py-2 bg-gray-600/70 text-white font-semibold rounded-md hover:bg-gray-600/90 disabled:opacity-50">
                ℹ Más información
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Contenido */}
      <div className="w-full py-6 sm:py-8 space-y-8 sm:space-y-10">

        {/* ================== DISNEY ================== */}
        {isDisney && (
          <>
            {/* Colecciones */}
            <section className="px-4 sm:px-6">
              <div className="container viruflix-container mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Explorar Colecciones</h2>
                <p className="text-sm text-gray-400 mt-1">Selecciona una marca para filtrar</p>
              </div>
              <div className="flex gap-5 overflow-x-auto scrollbar-hide pb-4 px-4 sm:px-6">
                {disneyCollections.map(col => (
                  <CollectionButton key={col.id} name={col.name} logoUrl={col.logoUrl} backgroundUrl={col.backgroundUrl}
                    onClick={() => handleCollectionClick(col.id)} />
                ))}
              </div>
            </section>

            {/* Contenido de colección */}
            {selectedCollection && selectedColData && (
              <section className="px-4 sm:px-6">
                <div className="container viruflix-container mb-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSearchParams({})} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white">{selectedColData.name}</h2>
                      <p className="text-sm text-gray-400">{selectedColData.description}</p>
                    </div>
                  </div>
                </div>
                {collectionMovies.length > 0 ? (
                  <MovieRow title={`${collectionMovies.length} títulos`} movies={collectionMovies} />
                ) : (
                  <p className="text-gray-400 text-center py-8">No hay contenido para esta colección</p>
                )}
              </section>
            )}

            {/* Contenido principal */}
            {!selectedCollection && disneyContent && (
              <>
                {disneyContent.destacada?.length > 0 && <MovieRow title="Películas Destacadas" movies={disneyContent.destacada} />}
                {disneyContent.clasicos?.length > 0 && <MovieRow title="Clásicos de Disney" movies={disneyContent.clasicos} />}
                {disneyContent.princesas?.length > 0 && <MovieRow title="Películas de Princesas" movies={disneyContent.princesas} />}
                {disneyContent.waltDisney?.length > 0 && <MovieRow title="Walt Disney Animation Studios" movies={disneyContent.waltDisney} />}
                {disneyContent.liveAction?.length > 0 && <MovieRow title="Películas Live-Action" movies={disneyContent.liveAction} />}
                {disneyContent.musicales?.length > 0 && <MovieRow title="Películas Musicales" movies={disneyContent.musicales} />}
                {disneyContent.familiares?.length > 0 && <MovieRow title="Películas Familiares" movies={disneyContent.familiares} />}
                {disneyContent.originales?.length > 0 && <MovieRow title="Series Originales" movies={disneyContent.originales} />}
                {disneyContent.channelSeries?.length > 0 && <MovieRow title="Disney Channel" movies={disneyContent.channelSeries} />}
              </>
            )}
          </>
        )}

        {/* ================== MARVEL ================== */}
        {isMarvel && marvelContent && (
          <>
            {marvelContent.populares?.length > 0 && <MovieRow title="Películas Populares" movies={marvelContent.populares} />}
            {marvelContent.mcu?.length > 0 && <MovieRow title="Marvel Cinematic Universe (MCU)" movies={marvelContent.mcu} />}
            {marvelContent.nuevos?.length > 0 && <MovieRow title="Nuevas Películas" movies={marvelContent.nuevos} />}
            {marvelContent.anteriores?.length > 0 && <MovieRow title="Películas Clásicas" movies={marvelContent.anteriores} />}
            {marvelContent.series?.length > 0 && <MovieRow title="Series de Marvel" movies={marvelContent.series} />}
          </>
        )}

        {/* ================== PIXAR ================== */}
        {isPixar && pixarContent && (
          <>
            {pixarContent.populares?.length > 0 && <MovieRow title="Todas las Películas" movies={pixarContent.populares} />}
            {pixarContent.primeraEra?.length > 0 && <MovieRow title="Clásicos Pixar (1995-2010)" movies={pixarContent.primeraEra} />}
            {pixarContent.moderna?.length > 0 && <MovieRow title="Era Moderna (2011+)" movies={pixarContent.moderna} />}
            {pixarContent.series?.length > 0 && <MovieRow title="Series Pixar" movies={pixarContent.series} />}
          </>
        )}

        {/* ================== STAR WARS ================== */}
        {isStarWars && starWarsContent && (
          <>
            {starWarsContent.saga?.length > 0 && <MovieRow title="Saga Principal (Episodios I-IX)" movies={starWarsContent.saga} />}
            {starWarsContent.spinOffs?.length > 0 && <MovieRow title="Spin-offs" movies={starWarsContent.spinOffs} />}
          </>
        )}

        {/* ================== PRIME VIDEO ================== */}
        {isPrimeVideo && primeVideoContent && (
          <>
            {primeVideoContent.globalSeries?.length > 0 && <MovieRow title="Series Prime Originals" movies={primeVideoContent.globalSeries} />}
            {primeVideoContent.globalMovies?.length > 0 && <MovieRow title="Películas Prime Originals" movies={primeVideoContent.globalMovies} />}
            {primeVideoContent.euroSeries?.length > 0 && <MovieRow title="Series Europeas" movies={primeVideoContent.euroSeries} />}
            {primeVideoContent.latSeries?.length > 0 && <MovieRow title="Series Latinoamericanas" movies={primeVideoContent.latSeries} />}
            {primeVideoContent.latMovies?.length > 0 && <MovieRow title="Películas Latinoamericanas" movies={primeVideoContent.latMovies} />}
          </>
        )}

        {/* ================== OTRAS MARCAS ================== */}
        {!isDisney && !isMarvel && !isPixar && !isStarWars && !isPrimeVideo && (
          <>
            {(movies.length > 0 || series.length > 0) && (
              <MovieRow title="Contenido" movies={[...movies.slice(0, 10), ...series.slice(0, 10)].slice(0, 20)} />
            )}
            {movies.length > 0 && <MovieRow title="Películas" movies={movies} />}
            {series.length > 0 && <MovieRow title="Series" movies={series} />}
          </>
        )}

        {movies.length === 0 && series.length === 0 && (
          <div className="text-center text-white py-12">
            <p className="text-xl">No se encontró contenido para {displayBrandName}</p>
            <button onClick={() => navigate('/')} className="mt-4 px-6 py-2 bg-red-600 rounded-sm hover:bg-red-700">Volver</button>
          </div>
        )}
      </div>

      {/* Back to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-6 right-6 z-50 p-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-all duration-300 ${
          showBackToTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        aria-label="Volver al inicio"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </button>
    </div>
  );
}

export default BrandPage;
