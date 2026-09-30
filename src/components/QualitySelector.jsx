import { useEffect, useState } from 'react';

function QualitySelector({ onQualityChange, onSourceChange, defaultSource = 'tmdb', defaultQuality = '1080p', autoQuality = false, onAutoQualityChange, providerStatus = {} }) {
  const [source, setSource] = useState(defaultSource);
  const [quality, setQuality] = useState(defaultQuality);
  useEffect(() => setSource(defaultSource), [defaultSource]);
  useEffect(() => setQuality(defaultQuality), [defaultQuality]);
  const chooseSource = (value) => { setSource(value); onSourceChange?.(value); };
  const chooseQuality = (value) => { setQuality(value); onQualityChange?.(value); };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-xs uppercase tracking-wider text-gray-400" htmlFor="vf-source">Source</label>
      <select id="vf-source" value={source} onChange={(event) => chooseSource(event.target.value)} className="rounded border border-white/20 bg-black/60 px-2 py-1 text-sm text-white">
        <option value="tmdb">Videasy{providerStatus.tmdb === 'failed' ? ' (unavailable)' : ''}</option>
        <option value="demo">Demo player</option>
      </select>
      {source === 'tmdb' && <>
        <label className="text-xs uppercase tracking-wider text-gray-400" htmlFor="vf-quality">Quality</label>
        <select id="vf-quality" value={quality} onChange={(event) => chooseQuality(event.target.value)} className="rounded border border-white/20 bg-black/60 px-2 py-1 text-sm text-white">
          {['2160p', '1080p', '720p', '480p', '360p'].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        {onAutoQualityChange && <label className="flex items-center gap-2 text-xs text-gray-300"><input type="checkbox" checked={autoQuality} onChange={(event) => onAutoQualityChange(event.target.checked)} /> Auto</label>}
      </>}
    </div>
  );
}

export default QualitySelector;
