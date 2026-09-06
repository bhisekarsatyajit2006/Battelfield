import React, { createContext, useContext, useState, useCallback } from 'react';

const GlobalStateContext = createContext();

export const GlobalStateProvider = ({ children }) => {
  const [state, setState] = useState({
    threats: {},
    paths: {},
    predictions: {},
    clusters: {},
    fused: {},
    sensors: [],
    blockchain: null,
    report: '',
    satelliteData: null,
    objects: []
  });

  const updateState = useCallback((updates) => {
    setState((prevState) => ({
      ...prevState,
      ...updates
    }));
  }, []);

  return (
    <GlobalStateContext.Provider value={{ state, updateState }}>
      {children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (!context) {
    // Return a dummy fallback state if used outside provider
    return {
      state: {
        threats: {},
        paths: {},
        predictions: {},
        clusters: {},
        fused: {},
        sensors: [],
        blockchain: null,
        report: '',
        satelliteData: null,
        objects: []
      },
      updateState: () => {}
    };
  }
  return context;
};

export default useGlobalState;
