import { useEffect, useState, useRef } from 'react';
import globalState from '../core/state';

export const useGlobalState = () => {
  const [state, setState] = useState(globalState.getState());
  const listenerId = useRef(Math.random().toString(36).substr(2, 9));
  
  useEffect(() => {
    const handleStateChange = (newState) => {
      setState(newState);
    };
    
    globalState.subscribe(listenerId.current, handleStateChange);
    
    return () => {
      globalState.unsubscribe(listenerId.current);
    };
  }, []);
  
  const updateState = (newData) => {
    globalState.updateState(newData);
  };
  
  const batchUpdate = (updates) => {
    globalState.batchUpdate(updates);
  };
  
  return {
    state,
    updateState,
    batchUpdate,
    getState: () => globalState.getState(),
  };
};