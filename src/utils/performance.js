class PerformanceOptimizer {
  constructor() {
    this.timers = new Map();
    this.cache = new Map();
  }

  debounce(key, fn, delay = 50) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }
    const timer = setTimeout(() => {
      fn();
      this.timers.delete(key);
    }, delay);
    this.timers.set(key, timer);
  }

  setCache(key, value, ttl = 30000) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }

  getCache(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }
}

export default new PerformanceOptimizer();
