import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import { recordEvent } from './telemetry.js';

function recordVital({ name, value, rating }) {
  recordEvent({
    type: 'web_vital',
    page: '',
    meta: { name, value, rating },
  });
}

export function initWebVitals() {
  onCLS(recordVital);
  onFCP(recordVital);
  onINP(recordVital);
  onLCP(recordVital);
  onTTFB(recordVital);
}
