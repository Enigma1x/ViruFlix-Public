import { describe, it, expect, vi } from 'vitest';
import {
  getStreamKind,
  isDashUrl,
  isLikelyHlsUrl,
  isProgressiveVideoUrl,
} from './attachLiveStream.js';

vi.mock('hls.js', () => ({
  default: {
    isSupported: () => true,
  },
}));

describe('attachLiveStream helpers', () => {
  it('detecta DASH por .mpd', () => {
    expect(isDashUrl('https://example.com/live.mpd')).toBe(true);
    expect(getStreamKind('https://cdn.test/manifest.mpd')).toBe('dash');
  });

  it('detecta video progresivo', () => {
    expect(isProgressiveVideoUrl('https://x.com/a.mp4')).toBe(true);
    expect(getStreamKind('https://x.com/a.mp4')).toBe('native');
  });

  it('detecta HLS por m3u8', () => {
    expect(isLikelyHlsUrl('https://x.com/hls/playlist.m3u8')).toBe(true);
    expect(getStreamKind('https://x.com/hls/playlist.m3u8')).toBe('hls');
  });
});
