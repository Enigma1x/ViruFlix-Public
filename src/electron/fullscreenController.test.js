import { describe, expect, it, vi } from 'vitest';
import { createFullscreenController } from '../../electron/fullscreenController.mjs';

function createWindow(initialFullscreen = false) {
  let fullscreen = initialFullscreen;
  return {
    isDestroyed: () => false,
    isFullScreen: () => fullscreen,
    setFullScreen: vi.fn((next) => { fullscreen = next; }),
  };
}

describe('fullscreenController', () => {
  it('entra en fullscreen con una sola transición', () => {
    const window = createWindow(false);
    const controller = createFullscreenController({ now: () => 1000 });

    expect(controller.toggle(window)).toBe(true);
    expect(window.setFullScreen).toHaveBeenCalledOnce();
    expect(window.setFullScreen).toHaveBeenCalledWith(true);
  });

  it('sale de fullscreen con una sola transición', () => {
    const window = createWindow(true);
    const controller = createFullscreenController({ now: () => 1000 });

    expect(controller.toggle(window)).toBe(false);
    expect(window.setFullScreen).toHaveBeenCalledWith(false);
  });

  it('ignora señales duplicadas durante la transición', () => {
    let time = 1000;
    const window = createWindow(false);
    const controller = createFullscreenController({ cooldownMs: 700, now: () => time });

    controller.toggle(window);
    time += 50;
    controller.toggle(window);

    expect(window.setFullScreen).toHaveBeenCalledOnce();
    expect(window.isFullScreen()).toBe(true);
  });

  it('permite otra transición después del enfriamiento', () => {
    let time = 1000;
    const window = createWindow(false);
    const controller = createFullscreenController({ cooldownMs: 700, now: () => time });

    controller.toggle(window);
    time += 701;
    controller.toggle(window);

    expect(window.setFullScreen).toHaveBeenCalledTimes(2);
    expect(window.isFullScreen()).toBe(false);
  });

  it('no repite una orden explícita de entrada', () => {
    const window = createWindow(false);
    const controller = createFullscreenController();

    controller.set(window, true);
    controller.set(window, true);
    controller.set(window, true);

    expect(window.setFullScreen).toHaveBeenCalledOnce();
    expect(window.isFullScreen()).toBe(true);
  });

  it('mantiene sincronizadas las órdenes explícitas de entrada y salida', () => {
    const window = createWindow(false);
    const controller = createFullscreenController();

    controller.set(window, true);
    controller.sync(true);
    controller.set(window, false);
    controller.set(window, false);

    expect(window.setFullScreen).toHaveBeenCalledTimes(2);
    expect(window.isFullScreen()).toBe(false);
  });

  it('sale aunque el estado interno se haya quedado desfasado', () => {
    const window = createWindow(true);
    const controller = createFullscreenController();

    controller.sync(false);
    expect(controller.set(window, false)).toBe(false);

    expect(window.setFullScreen).toHaveBeenCalledOnce();
    expect(window.setFullScreen).toHaveBeenCalledWith(false);
    expect(window.isFullScreen()).toBe(false);
  });

  it('permite un toggle explícito durante el enfriamiento', () => {
    let time = 1000;
    const window = createWindow(false);
    const controller = createFullscreenController({ cooldownMs: 700, now: () => time });

    controller.toggle(window);
    time += 50;
    controller.toggle(window, { bypassCooldown: true });

    expect(window.setFullScreen).toHaveBeenCalledTimes(2);
    expect(window.isFullScreen()).toBe(false);
  });
});
