class GlobalState {
  constructor() {
    this.state = {
      objects: {},
      paths: {},
      predictions: {},
      threats: {},
      clusters: {},
      fused: {},
      sensors: [],
      blockchain: null,
      report: "",
      satelliteData: null,
      isLoading: false,
      lastUpdate: null,
    };
    
    this.listeners = new Map();
  }
  
  // Subscribe to state changes
  subscribe(id, callback) {
    this.listeners.set(id, callback);
    // Immediately call with current state
    callback(this.state);
  }
  
  // Unsubscribe from state changes
  unsubscribe(id) {
    this.listeners.delete(id);
  }
  
  // Update state (this is the brain)
  updateState(newData) {
    let hasChanges = false;
    
    // Merge new data with existing state
    Object.keys(newData).forEach(key => {
      if (newData[key] !== undefined && newData[key] !== null) {
        if (JSON.stringify(this.state[key]) !== JSON.stringify(newData[key])) {
          this.state[key] = newData[key];
          hasChanges = true;
        }
      }
    });
    
    this.state.lastUpdate = new Date();
    
    // Notify all listeners if changes occurred
    if (hasChanges) {
      this.notifyListeners();
    }
  }
  
  // Batch update for performance
  batchUpdate(updates) {
    let hasChanges = false;
    
    updates.forEach((value, key) => {
      if (value !== undefined && value !== null) {
        if (JSON.stringify(this.state[key]) !== JSON.stringify(value)) {
          this.state[key] = value;
          hasChanges = true;
        }
      }
    });
    
    if (hasChanges) {
      this.state.lastUpdate = new Date();
      this.notifyListeners();
    }
  }
  
  // Get current state
  getState() {
    return { ...this.state };
  }
  
  // Get specific part of state
  get(key) {
    return this.state[key];
  }
  
  // Notify all listeners
  notifyListeners() {
    const currentState = this.getState();
    this.listeners.forEach((callback) => {
      callback(currentState);
    });
  }
  
  // Clear all data
  clear() {
    this.state = {
      objects: {},
      paths: {},
      predictions: {},
      threats: {},
      clusters: {},
      fused: {},
      sensors: [],
      blockchain: null,
      report: "",
      satelliteData: null,
      isLoading: false,
      lastUpdate: null,
    };
    this.notifyListeners();
  }
}

export default new GlobalState();