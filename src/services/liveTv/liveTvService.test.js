import { describe, it, expect } from 'vitest';
import {
  getCategoriesFromChannels,
  getSourcesFromChannels,
  ALL_SOURCES_ID,
  countryCodeFromSourceUrl,
  __internals,
} from './liveTvService.js';

const { parseM3U, dedupeChannels, compareChannels, IPTV_ORG_SOURCES } = __internals;

describe('fuentes de TV', () => {
  it('carga primero la playlist local autorizada', () => {
    expect(IPTV_ORG_SOURCES[0]).toMatchObject({
      url: '/channels/authorized.m3u',
      priority: -1,
      region: 'LOCAL',
      label: 'Lista local autorizada',
    });
  });
});

const SAMPLE_M3U = `#EXTM3U
#EXTINF:-1 tvg-id="canal1" tvg-name="Canal Uno" tvg-logo="https://img/1.png" group-title="News",Canal Uno
https://stream.example.com/c1.m3u8
#EXTINF:-1 tvg-id="canal2" tvg-name="Kids TV" tvg-logo="https://img/2.png" group-title="Kids;Family",Kids TV
https://stream.example.com/c2.m3u8
#EXTINF:-1 tvg-name="Sin categoria",Canal Sin Cat
https://stream.example.com/c3.m3u8
`;

describe('countryCodeFromSourceUrl', () => {
  it('extrae código de país desde URL countries/xx.m3u', () => {
    expect(countryCodeFromSourceUrl('https://iptv-org.github.io/iptv/countries/mx.m3u')).toBe('mx');
    expect(countryCodeFromSourceUrl('https://iptv-org.github.io/iptv/countries/es.m3u')).toBe('es');
  });

  it('devuelve null para internacional, regiones e idiomas', () => {
    expect(countryCodeFromSourceUrl('https://iptv-org.github.io/iptv/countries/int.m3u')).toBeNull();
    expect(countryCodeFromSourceUrl('https://iptv-org.github.io/iptv/regions/latam.m3u')).toBeNull();
    expect(countryCodeFromSourceUrl('https://iptv-org.github.io/iptv/languages/spa.m3u')).toBeNull();
  });
});

describe('parseM3U', () => {
  it('extrae canales con categoryId/category/color y aplica prioridad/región', () => {
    const channels = parseM3U(SAMPLE_M3U, {
      priority: 0,
      region: 'LATAM',
      sourceLabel: 'México',
      countryCode: 'mx',
    });

    expect(channels).toHaveLength(3);
    expect(channels[0]).toMatchObject({
      name: 'Canal Uno',
      logo: 'https://img/1.png',
      streamUrl: 'https://stream.example.com/c1.m3u8',
      categoryId: 'news',
      category: 'Noticias',
      priority: 0,
      region: 'LATAM',
      source: 'México',
      countryCode: 'mx',
      isNsfw: false,
    });
    expect(channels[1].categoryId).toBe('kids');
    expect(channels[1].category).toBe('Infantil');
    expect(channels[2].categoryId).toBe('general');
    expect(channels[2].category).toBe('General');
  });

  it('respeta perSourceLimit', () => {
    const channels = parseM3U(SAMPLE_M3U, {
      priority: 0,
      region: 'LATAM',
      sourceLabel: 'test',
      countryCode: null,
      perSourceLimit: 2,
    });
    expect(channels).toHaveLength(2);
  });

  it('ignora EXTINF huérfanos (sin URL después)', () => {
    const m3u = `#EXTM3U
#EXTINF:-1,Canal Roto
#EXTINF:-1,Canal OK
https://ok.example.com/s.m3u8
`;
    const channels = parseM3U(m3u, { priority: 0, region: 'LATAM', sourceLabel: 't', countryCode: null });
    expect(channels).toHaveLength(1);
    expect(channels[0].name).toBe('Canal OK');
  });

  it('marca canales NSFW con isNsfw=true y categoría Adultos', () => {
    const m3u = `#EXTM3U
#EXTINF:-1 tvg-name="Adult Channel" group-title="XXX",Adult Channel
https://adult.example.com/stream.m3u8
#EXTINF:-1 tvg-name="Hot TV" group-title="18+",Hot TV
https://hot.example.com/stream.m3u8
`;
    const channels = parseM3U(m3u, { priority: 0, region: 'GLOBAL', sourceLabel: 'test', countryCode: null });
    expect(channels).toHaveLength(2);
    expect(channels[0].isNsfw).toBe(true);
    expect(channels[0].category).toBe('Adultos');
    expect(channels[1].isNsfw).toBe(true);
    expect(channels[1].category).toBe('Adultos');
  });
});

describe('dedupeChannels', () => {
  it('conserva la primera ocurrencia por streamUrl', () => {
    const channels = [
      { name: 'A', streamUrl: 'u1', priority: 0 },
      { name: 'A dup', streamUrl: 'u1', priority: 2 },
      { name: 'B', streamUrl: 'u2', priority: 0 },
    ];
    const result = dedupeChannels(channels);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('A');
    expect(result[1].name).toBe('B');
  });

  it('descarta entradas sin streamUrl', () => {
    const channels = [
      { name: 'A', streamUrl: '' },
      { name: 'B', streamUrl: 'u1' },
    ];
    expect(dedupeChannels(channels)).toHaveLength(1);
  });
});

describe('compareChannels', () => {
  it('ordena por prioridad ascendente primero', () => {
    const arr = [
      { priority: 2, category: 'Noticias', name: 'Z' },
      { priority: 0, category: 'Noticias', name: 'A' },
      { priority: 1, category: 'Noticias', name: 'M' },
    ];
    arr.sort(compareChannels);
    expect(arr.map((c) => c.priority)).toEqual([0, 1, 2]);
  });

  it('a igual prioridad, ordena por categoría y luego por nombre', () => {
    const arr = [
      { priority: 0, category: 'Noticias', name: 'B' },
      { priority: 0, category: 'Deportes', name: 'A' },
      { priority: 0, category: 'Noticias', name: 'A' },
    ];
    arr.sort(compareChannels);
    expect(arr.map((c) => `${c.category}:${c.name}`)).toEqual([
      'Deportes:A',
      'Noticias:A',
      'Noticias:B',
    ]);
  });
});

describe('getCategoriesFromChannels', () => {
  it('devuelve "Todas" primero con el total y luego categorías por conteo descendente', () => {
    const channels = [
      { categoryId: 'news', category: 'Noticias' },
      { categoryId: 'news', category: 'Noticias' },
      { categoryId: 'sports', category: 'Deportes' },
      { categoryId: 'kids', category: 'Infantil' },
    ];
    const cats = getCategoriesFromChannels(channels);

    expect(cats[0]).toMatchObject({ id: '__all__', label: 'Todas', count: 4 });
    expect(cats[1]).toMatchObject({ id: 'news', label: 'Noticias', count: 2 });
    expect(cats.slice(2).map((c) => c.label).sort()).toEqual(['Deportes', 'Infantil']);
  });

  it('maneja canales sin categoryId asignando "general"', () => {
    const cats = getCategoriesFromChannels([
      { categoryId: '', category: '' },
      { categoryId: null, category: null },
    ]);
    expect(cats.find((c) => c.id === 'general')?.count).toBe(2);
  });
});

describe('getSourcesFromChannels', () => {
  it('agrupa por source con conteo y mete "Todos los orígenes" primero', () => {
    const rows = getSourcesFromChannels([
      { source: 'México', countryCode: 'mx' },
      { source: 'México', countryCode: 'mx' },
      { source: 'España', countryCode: 'es' },
    ]);
    expect(rows[0].id).toBe(ALL_SOURCES_ID);
    expect(rows[0].count).toBe(3);
    const mx = rows.find((r) => r.label === 'México');
    expect(mx).toMatchObject({ count: 2, countryCode: 'mx' });
    expect(rows.find((r) => r.label === 'España')).toMatchObject({ count: 1, countryCode: 'es' });
  });
});
