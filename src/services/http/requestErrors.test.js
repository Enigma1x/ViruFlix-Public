import { describe, it, expect } from 'vitest';
import {
  RequestError,
  USER_MESSAGES,
  getUserFacingMessage,
  isRequestError,
  userMessageFromHttpStatus,
} from './requestErrors.js';

describe('requestErrors', () => {
  it('RequestError expone userMessage coherente con message', () => {
    const e = new RequestError('Hola usuario', { code: 'X', technical: 'detalle interno' });
    expect(isRequestError(e)).toBe(true);
    expect(e.userMessage).toBe('Hola usuario');
    expect(e.message).toBe('Hola usuario');
    expect(e.technical).toBe('detalle interno');
  });

  it('getUserFacingMessage devuelve userMessage para RequestError', () => {
    const e = new RequestError('Visible', { technical: 'oculto' });
    expect(getUserFacingMessage(e)).toBe('Visible');
  });

  it('getUserFacingMessage usa fallback para Error genérico', () => {
    expect(getUserFacingMessage(new Error('stack trace stuff'), 'Por defecto')).toBe('Por defecto');
  });

  it('userMessageFromHttpStatus cubre rangos comunes', () => {
    expect(userMessageFromHttpStatus(404)).toMatch(/No se encontró/);
    expect(userMessageFromHttpStatus(503)).toMatch(/no está disponible/);
    expect(userMessageFromHttpStatus(302)).toBeNull();
  });

  it('USER_MESSAGES.GENERIC existe', () => {
    expect(USER_MESSAGES.GENERIC.length).toBeGreaterThan(5);
  });
});
