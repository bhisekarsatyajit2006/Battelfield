class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/live`;
    
    this.socket = new WebSocket(wsUrl);
    
    this.socket.onopen = () => {
      console.log('✅ WebSocket connected');
      this.reconnectAttempts = 0;
    };
    
    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.notifyListeners(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      this.reconnect();
    };
  }
  
  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
        this.connect();
      }, 3000);
    }
  }
  
  addListener(id, callback) {
    this.listeners.set(id, callback);
  }
  
  removeListener(id) {
    this.listeners.delete(id);
  }
  
  notifyListeners(data) {
    this.listeners.forEach((callback) => {
      callback(data);
    });
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
}

export default new WebSocketService();