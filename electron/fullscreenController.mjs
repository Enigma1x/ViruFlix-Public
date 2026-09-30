export function createFullscreenController({ cooldownMs = 700, now = Date.now } = {}) {
  let lastToggleAt = -Infinity;
  let targetState = null;

  return {
    set(window, desiredState) {
      if (!window || window.isDestroyed?.()) return false;

      const desired = Boolean(desiredState);
      const current = Boolean(window.isFullScreen());
      // Electron es la fuente de verdad; targetState puede quedar retrasado
      // después de una transición iniciada por un iframe.
      if (current === desired) {
        targetState = desired;
        return desired;
      }

      targetState = desired;
      window.setFullScreen(desired);
      return desired;
    },

    sync(currentState) {
      targetState = Boolean(currentState);
    },

    toggle(window, { bypassCooldown = false } = {}) {
      if (!window || window.isDestroyed?.()) return false;

      const current = Boolean(window.isFullScreen());
      const timestamp = now();
      if (!bypassCooldown && timestamp - lastToggleAt < cooldownMs) return current;

      lastToggleAt = timestamp;
      const next = !current;
      targetState = next;
      window.setFullScreen(next);
      return next;
    },
  };
}
