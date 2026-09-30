/**
 * Avisos de actualización (Electron empaquetado + electron-updater).
 * En navegador no renderiza nada.
 */
import { useEffect, useState, useCallback } from 'react';

export default function UpdateNotification() {
  const [downloadPercent, setDownloadPercent] = useState(null);
  const [readyToInstall, setReadyToInstall] = useState(false);
  const [newVersion, setNewVersion] = useState('');

  const handlePayload = useCallback((payload) => {
    if (!payload?.type) return;
    switch (payload.type) {
      case 'download-progress':
        setDownloadPercent(typeof payload.percent === 'number' ? payload.percent : 0);
        break;
      case 'update-downloaded':
        setDownloadPercent(null);
        setReadyToInstall(true);
        if (payload.version) setNewVersion(payload.version);
        break;
      case 'update-available':
        if (payload.version) setNewVersion(payload.version);
        break;
      default:
        break;
    }
  }, []);

  useEffect(() => {
    const api = typeof window !== 'undefined' ? window.electronAPI : undefined;
    if (!api?.onAppUpdate) return undefined;
    return api.onAppUpdate(handlePayload);
  }, [handlePayload]);

  const api = typeof window !== 'undefined' ? window.electronAPI : undefined;
  if (!api?.onAppUpdate) return null;

  const showBar =
    downloadPercent !== null && downloadPercent < 100 && !readyToInstall;

  const handleRestart = () => {
    api.quitAndInstall?.();
  };

  const handleLater = () => {
    setReadyToInstall(false);
  };

  return (
    <>
      {showBar && (
        <div
          className="fixed top-0 left-0 right-0 z-9998 h-1 bg-black/60"
          role="progressbar"
          aria-valuenow={downloadPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${downloadPercent}%`,
              backgroundColor: '#E50914'
            }}
          />
        </div>
      )}

      {readyToInstall && (
        <div
          className="fixed inset-0 z-9999 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
        >
          <div
            className="max-w-md w-full rounded-lg shadow-2xl border border-white/10 p-6"
            style={{ backgroundColor: '#0B0C10' }}
          >
            <h2 className="text-xl font-semibold text-white mb-2">
              Actualización lista
            </h2>
            <p className="text-gray-300 text-sm mb-6">
              Hay una nueva versión
              {newVersion ? (
                <span className="text-white font-medium"> {newVersion}</span>
              ) : null}{' '}
              descargada. Reinicia la aplicación para instalarla.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button
                type="button"
                onClick={handleLater}
                className="px-4 py-2 rounded-sm text-gray-300 hover:bg-white/10 transition-colors text-sm"
              >
                Más tarde
              </button>
              <button
                type="button"
                onClick={handleRestart}
                className="px-4 py-2 rounded-sm font-medium text-white transition-colors text-sm"
                style={{ backgroundColor: '#E50914' }}
              >
                Reiniciar e instalar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
