import { useEffect } from 'react';
import webSocketService from '../core/socket';

export const useWebSocket = (onMessage, deps = []) => {
  useEffect(() => {
    webSocketService.connect();
    const listenerId = `ws_listener_${Math.random().toString(36).substring(2, 9)}`;

    if (typeof onMessage === 'function') {
      webSocketService.addListener(listenerId, onMessage);
    }

    return () => {
      webSocketService.removeListener(listenerId);
    };
  }, deps);
};

export default useWebSocket;
