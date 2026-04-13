// Performance optimization utilities
class PerformanceOptimizer {
  constructor() {
    this.debounceTimers = new Map();
    this.throttleTimers = new Map();
    this.cache = new Map();
    this.frameCallbacks = new Map();
  }
  
  // Debounce function for rapid updates
  debounce(key, fn, delay = 100) {
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }
    
    const timer = setTimeout(() => {
      fn();
      this.debounceTimers.delete(key);
    }, delay);
    
    this.debounceTimers.set(key, timer);
  }
  
  // Throttle function for rate limiting
  throttle(key, fn, delay = 100) {
    if (this.throttleTimers.has(key)) {
      return;
    }
    
    fn();
    const timer = setTimeout(() => {
      this.throttleTimers.delete(key);
    }, delay);
    
    this.throttleTimers.set(key, timer);
  }
  
  // Request animation frame with cleanup
  requestAnimationFrame(key, fn) {
    if (this.frameCallbacks.has(key)) {
      cancelAnimationFrame(this.frameCallbacks.get(key));
    }
    
    const frameId = requestAnimationFrame(fn);
    this.frameCallbacks.set(key, frameId);
  }
  
  // Cache data with TTL
  setCache(key, data, ttl = 60000) {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    });
  }
  
  getCache(key) {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }
  
  // Clear all caches
  clearCache() {
    this.cache.clear();
  }
  
  // Measure performance
  measurePerformance(name, fn) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`${name} took ${(end - start).toFixed(2)}ms`);
    return result;
  }
  
  // Batch updates for better performance
  batchUpdates(updates, batchSize = 10) {
    const batches = [];
    for (let i = 0; i < updates.length; i += batchSize) {
      batches.push(updates.slice(i, i + batchSize));
    }
    
    batches.forEach(batch => {
      requestAnimationFrame(() => {
        batch.forEach(update => update());
      });
    });
  }
}

export default new PerformanceOptimizer();