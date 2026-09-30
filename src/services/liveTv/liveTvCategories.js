/**
 * Definiciones oficiales de categorías para LiveTV.
 *
 * Cada categoría tiene:
 *   - id          : identificador único (usado en filtros y keys)
 *   - label       : nombre visible en español
 *   - labelEn     : nombre en inglés (referencia)
 *   - color       : tono de badge para la UI (clase Tailwind o variable)
 *   - isNsfw      : si es contenido para adultos (+18)
 *   - icon        : nombre del icono Lucide (o null)
 *   - group       : grupo al que pertenece para organizar filtros
 *
 * Los grupos只是为了 organizar la UI — no affectan el filtrado.
 */

export const CATEGORY_GROUPS = {
  GENERAL: 'general',
  ENTERTAINMENT: 'entertainment',
  NEWS: 'news',
  KIDS: 'kids',
  SPORTS: 'sports',
  CULTURE: 'culture',
  MUSIC: 'music',
  ADULTS: 'adults',
};

const BASE_CATEGORIES = [
  // ── General ──────────────────────────────────────────────────────────────
  {
    id: 'general',
    label: 'General',
    labelEn: 'General',
    color: 'bg-gray-700',
    isNsfw: false,
    icon: 'Tv',
    group: CATEGORY_GROUPS.GENERAL,
  },
  {
    id: 'news',
    label: 'Noticias',
    labelEn: 'News',
    color: 'bg-blue-700',
    isNsfw: false,
    icon: 'Newspaper',
    group: CATEGORY_GROUPS.NEWS,
  },
  {
    id: 'public',
    label: 'Público',
    labelEn: 'Public',
    color: 'bg-blue-600',
    isNsfw: false,
    icon: 'Building2',
    group: CATEGORY_GROUPS.GENERAL,
  },

  // ── Entertainment ────────────────────────────────────────────────────────
  {
    id: 'entertainment',
    label: 'Entretenimiento',
    labelEn: 'Entertainment',
    color: 'bg-purple-700',
    isNsfw: false,
    icon: 'Clapperboard',
    group: CATEGORY_GROUPS.ENTERTAINMENT,
  },
  {
    id: 'movies',
    label: 'Películas',
    labelEn: 'Movies',
    color: 'bg-indigo-700',
    isNsfw: false,
    icon: 'Film',
    group: CATEGORY_GROUPS.ENTERTAINMENT,
  },
  {
    id: 'series',
    label: 'Series',
    labelEn: 'Series',
    color: 'bg-violet-700',
    isNsfw: false,
    icon: 'Tv2',
    group: CATEGORY_GROUPS.ENTERTAINMENT,
  },
  {
    id: 'lifestyle',
    label: 'Estilo de vida',
    labelEn: 'Lifestyle',
    color: 'bg-pink-700',
    isNsfw: false,
    icon: 'Heart',
    group: CATEGORY_GROUPS.ENTERTAINMENT,
  },
  {
    id: 'comedy',
    label: 'Comedia',
    labelEn: 'Comedy',
    color: 'bg-yellow-700',
    isNsfw: false,
    icon: 'Smile',
    group: CATEGORY_GROUPS.ENTERTAINMENT,
  },

  // ── Sports ────────────────────────────────────────────────────────────────
  {
    id: 'sports',
    label: 'Deportes',
    labelEn: 'Sports',
    color: 'bg-green-700',
    isNsfw: false,
    icon: 'Trophy',
    group: CATEGORY_GROUPS.SPORTS,
  },
  {
    id: 'auto',
    label: 'Autos',
    labelEn: 'Auto',
    color: 'bg-green-800',
    isNsfw: false,
    icon: 'Car',
    group: CATEGORY_GROUPS.SPORTS,
  },

  // ── Culture / Education ──────────────────────────────────────────────────
  {
    id: 'culture',
    label: 'Cultura',
    labelEn: 'Culture',
    color: 'bg-teal-700',
    isNsfw: false,
    icon: 'Landmark',
    group: CATEGORY_GROUPS.CULTURE,
  },
  {
    id: 'documentary',
    label: 'Documentales',
    labelEn: 'Documentary',
    color: 'bg-cyan-700',
    isNsfw: false,
    icon: 'BookOpen',
    group: CATEGORY_GROUPS.CULTURE,
  },
  {
    id: 'education',
    label: 'Educación',
    labelEn: 'Education',
    color: 'bg-cyan-800',
    isNsfw: false,
    icon: 'GraduationCap',
    group: CATEGORY_GROUPS.CULTURE,
  },
  {
    id: 'science',
    label: 'Ciencia',
    labelEn: 'Science',
    color: 'bg-cyan-900',
    isNsfw: false,
    icon: 'Atom',
    group: CATEGORY_GROUPS.CULTURE,
  },

  // ── Kids ────────────────────────────────────────────────────────────────
  {
    id: 'kids',
    label: 'Infantil',
    labelEn: 'Kids',
    color: 'bg-orange-600',
    isNsfw: false,
    icon: 'Baby',
    group: CATEGORY_GROUPS.KIDS,
  },
  {
    id: 'animation',
    label: 'Animación',
    labelEn: 'Animation',
    color: 'bg-orange-500',
    isNsfw: false,
    icon: 'Sparkles',
    group: CATEGORY_GROUPS.KIDS,
  },
  {
    id: 'family',
    label: 'Familia',
    labelEn: 'Family',
    color: 'bg-orange-700',
    isNsfw: false,
    icon: 'Users',
    group: CATEGORY_GROUPS.KIDS,
  },

  // ── Music ───────────────────────────────────────────────────────────────
  {
    id: 'music',
    label: 'Música',
    labelEn: 'Music',
    color: 'bg-fuchsia-700',
    isNsfw: false,
    icon: 'Music',
    group: CATEGORY_GROUPS.MUSIC,
  },

  // ── Religion ─────────────────────────────────────────────────────────────
  {
    id: 'religious',
    label: 'Religión',
    labelEn: 'Religious',
    color: 'bg-amber-700',
    isNsfw: false,
    icon: 'Cross',
    group: CATEGORY_GROUPS.CULTURE,
  },

  // ── Other ───────────────────────────────────────────────────────────────
  {
    id: 'business',
    label: 'Negocios',
    labelEn: 'Business',
    color: 'bg-slate-700',
    isNsfw: false,
    icon: 'Briefcase',
    group: CATEGORY_GROUPS.GENERAL,
  },
  {
    id: 'cooking',
    label: 'Cocina',
    labelEn: 'Cooking',
    color: 'bg-orange-600',
    isNsfw: false,
    icon: 'ChefHat',
    group: CATEGORY_GROUPS.LIFESTYLE,
  },
  {
    id: 'shop',
    label: 'Compras',
    labelEn: 'Shop',
    color: 'bg-rose-700',
    isNsfw: false,
    icon: 'ShoppingBag',
    group: CATEGORY_GROUPS.LIFESTYLE,
  },
  {
    id: 'travel',
    label: 'Viajes',
    labelEn: 'Travel',
    color: 'bg-sky-700',
    isNsfw: false,
    icon: 'Plane',
    group: CATEGORY_GROUPS.LIFESTYLE,
  },
  {
    id: 'weather',
    label: 'Clima',
    labelEn: 'Weather',
    color: 'bg-sky-600',
    isNsfw: false,
    icon: 'CloudSun',
    group: CATEGORY_GROUPS.GENERAL,
  },
  {
    id: 'relax',
    label: 'Relax',
    labelEn: 'Relax',
    color: 'bg-emerald-700',
    isNsfw: false,
    icon: 'Coffee',
    group: CATEGORY_GROUPS.LIFESTYLE,
  },
  {
    id: 'outdoor',
    label: 'Aire libre',
    labelEn: 'Outdoor',
    color: 'bg-green-600',
    isNsfw: false,
    icon: 'TreePine',
    group: CATEGORY_GROUPS.LIFESTYLE,
  },
  {
    id: 'legislative',
    label: 'Legislativo',
    labelEn: 'Legislative',
    color: 'bg-stone-700',
    isNsfw: false,
    icon: 'Landmark',
    group: CATEGORY_GROUPS.GENERAL,
  },
  {
    id: 'classic',
    label: 'Clásicos',
    labelEn: 'Classic',
    color: 'bg-stone-600',
    isNsfw: false,
    icon: 'Clapperboard',
    group: CATEGORY_GROUPS.ENTERTAINMENT,
  },
  {
    id: 'interactive',
    label: 'Interactivo',
    labelEn: 'Interactive',
    color: 'bg-violet-800',
    isNsfw: false,
    icon: 'Gamepad2',
    group: CATEGORY_GROUPS.ENTERTAINMENT,
  },

  // ── Adults (+18) — siempre al final en filtros ─────────────────────────
  {
    id: 'xxx',
    label: 'Adultos',
    labelEn: 'Adults',
    color: 'bg-red-800',
    isNsfw: true,
    icon: 'Eye',
    group: CATEGORY_GROUPS.ADULTS,
  },
  {
    id: 'adult',
    label: 'Adultos',
    labelEn: 'Adult',
    color: 'bg-red-900',
    isNsfw: true,
    icon: 'Eye',
    group: CATEGORY_GROUPS.ADULTS,
  },
];

// Mapa rápida para lookup por id
export const CATEGORY_BY_ID = Object.fromEntries(BASE_CATEGORIES.map((c) => [c.id, c]));

// Categorías que NO son NSFW (para filtro por defecto)
export const SAFE_CATEGORIES = BASE_CATEGORIES.filter((c) => !c.isNsfw);

// Categorías NSFW
export const NSFW_CATEGORIES = BASE_CATEGORIES.filter((c) => c.isNsfw);

// Todas
export const ALL_CATEGORIES = BASE_CATEGORIES;

// Grupos ordenados para el filtro de categoría
export const CATEGORY_GROUPS_ORDERED = [
  { id: 'general', label: 'General' },
  { id: 'entertainment', label: 'Entretenimiento' },
  { id: 'sports', label: 'Deportes' },
  { id: 'news', label: 'Noticias' },
  { id: 'kids', label: 'Niños' },
  { id: 'culture', label: 'Cultura' },
  { id: 'music', label: 'Música' },
  { id: 'adults', label: '+18' },
];

/**
 * Keywords de iptv-org → id de categoría.
 * Se prueba en orden; primera coincidencia gana.
 */
export const CATEGORY_KEYMAP = {
  animation: 'animation',
  auto: 'auto',
  business: 'business',
  classic: 'classic',
  comedy: 'comedy',
  cooking: 'cooking',
  culture: 'culture',
  documentary: 'documentary',
  education: 'education',
  entertainment: 'entertainment',
  family: 'family',
  general: 'general',
  interactive: 'interactive',
  kids: 'kids',
  legislative: 'legislative',
  lifestyle: 'lifestyle',
  movies: 'movies',
  music: 'music',
  news: 'news',
  outdoor: 'outdoor',
  public: 'public',
  relax: 'relax',
  religious: 'religious',
  science: 'science',
  series: 'series',
  shop: 'shop',
  sports: 'sports',
  travel: 'travel',
  weather: 'weather',
  undefined: 'general',
  // NSFW
  xxx: 'xxx',
  adult: 'adult',
  '18+': 'adult',
  porn: 'adult',
  erotic: 'adult',
  sex: 'adult',
};

/**
 * Keywords que indican contenido NSFW en nombre de canal o categoría.
 */
export const NSFW_KEYWORDS = [
  'xxx',
  'adult',
  '18+',
  'porn',
  'erotic',
  'porno',
  'sex',
  'xxx',
];

/**
 * Dice si un raw category string (del M3U) es NSFW.
 */
export function isNsfwCategory(rawCategory) {
  if (!rawCategory) return false;
  const lower = rawCategory.toLowerCase();
  return NSFW_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Dice si el nombre de un canal parece NSFW.
 */
export function isNsfwChannelName(name) {
  if (!name) return false;
  const lower = name.toLowerCase();
  return NSFW_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Normaliza un raw category string al id canónico de CATEGORY_KEYMAP.
 */
export function normalizeCategoryId(rawCategory) {
  if (!rawCategory) return 'general';
  const primary = rawCategory.split(';')[0].trim().toLowerCase();
  if (CATEGORY_KEYMAP[primary]) return CATEGORY_KEYMAP[primary];
  return primary.replace(/(^\w|\s\w)/g, (char) => char.toUpperCase());
}

/**
 * Obtiene el objeto categoría completo desde un id.
 */
export function getCategoryById(id) {
  return CATEGORY_BY_ID[id] ?? CATEGORY_BY_ID.general;
}
