import { useEffect, useRef, useCallback } from 'react';

export const useThrottle = (fn, delay = 100) => {
  const lastRun = useRef(Date.now());
  const timeoutRef = useRef(null);
  
  const throttledFn = useCallback((...args) => {
    const now = Date.now();
    
    if (now - lastRun.current >= delay) {
      fn(...args);
      lastRun.current = now;
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        fn(...args);
        lastRun.current = Date.now();
      }, delay - (now - lastRun.current));
    }
  }, [fn, delay]);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return throttledFn;
};