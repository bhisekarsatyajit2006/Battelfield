// Polyfill / safeguard against environments where window.fetch has only a getter
(function ensureFetchSetter() {
  try {
    const target = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null);
    if (!target) return;

    const rawFetch = typeof target.fetch === 'function' ? target.fetch.bind(target) : target.fetch;
    let currentFetch = rawFetch;

    const applySetter = (obj) => {
      if (!obj) return;
      try {
        Object.defineProperty(obj, 'fetch', {
          get() {
            return currentFetch;
          },
          set(fn) {
            currentFetch = fn;
          },
          configurable: true,
          enumerable: true
        });
      } catch (err) {
        // Ignored if non-configurable
      }
    };

    applySetter(target);
    if (typeof Window !== 'undefined' && Window.prototype) {
      applySetter(Window.prototype);
    }
  } catch (e) {
    // Fail-safe
  }
})();
