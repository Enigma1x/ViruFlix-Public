import { describe, it, expect } from 'vitest';
import { startPageMetric, endPageMetric } from './performanceMetrics';

describe('performanceMetrics', () => {
  it('mide duración y devuelve un número', () => {
    startPageMetric('test-page');
    const duration = endPageMetric('test-page', { ok: true });
    expect(typeof duration).toBe('number');
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it('tolera cerrar una métrica sin inicio explícito', () => {
    const duration = endPageMetric('missing-start');
    expect(duration === null || typeof duration === 'number').toBe(true);
  });
});
