import { useEffect, useRef, useCallback } from 'react';
import webSocketService from '../core/socket';
import performanceOptimizer from '../utils/performance';

export const useWebSocket = (onMessage, dependencies = []) => {
  const handlerRef = useRef(onMessage);
  
  useEffect(() => {
    handlerRef.current = onMessage;
  }, [onMessage]);
  
  useEffect(() => {
    const wsId = `websocket-${Math.random()}`;
    
    const handleMessage = (data) => {
      // Throttle updates for performance
      performanceOptimizer.throttle(wsId, () => {
        if (handlerRef.current) {
          handlerRef.current(data);
        }
      }, 50);
    };
    
    webSocketService.addListener(wsId, handleMessage);
    webSocketService.connect();
    
    return () => {
      webSocketService.removeListener(wsId);
    };
  }, dependencies);
};