class OfflineStorage {
  constructor() {
    this.dbName = 'BattlefieldDB';
    this.dbVersion = 1;
    this.db = null;
  }
  
  async init() {
    return new Promise((resolve) => {
      try {
        if (typeof indexedDB === 'undefined') {
          resolve(null);
          return;
        }
        const request = indexedDB.open(this.dbName, this.dbVersion);
        
        request.onerror = () => {
          console.warn('IndexedDB unavailable, operating in-memory');
          resolve(null);
        };
        request.onsuccess = () => {
          this.db = request.result;
          resolve(this.db);
        };
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          
          // Store for detection data
          if (!db.objectStoreNames.contains('detections')) {
            db.createObjectStore('detections', { keyPath: 'id', autoIncrement: true });
          }
          
          // Store for threats
          if (!db.objectStoreNames.contains('threats')) {
            db.createObjectStore('threats', { keyPath: 'timestamp' });
          }
          
          // Store for reports
          if (!db.objectStoreNames.contains('reports')) {
            db.createObjectStore('reports', { keyPath: 'id', autoIncrement: true });
          }
        };
      } catch (err) {
        console.warn('IndexedDB init error:', err);
        resolve(null);
      }
    });
  }
  
  async saveDetection(data) {
    if (!this.db) await this.init();
    if (!this.db) return null;
    
    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction(['detections'], 'readwrite');
        const store = transaction.objectStore('detections');
        const request = store.add({
          ...data,
          timestamp: Date.now()
        });
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }
  
  async getDetections(limit = 100) {
    if (!this.db) await this.init();
    if (!this.db) return [];
    
    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction(['detections'], 'readonly');
        const store = transaction.objectStore('detections');
        const request = store.getAll();
        
        request.onsuccess = () => {
          const detections = (request.result || []).slice(-limit);
          resolve(detections);
        };
        request.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  }
  
  async saveThreat(threatData) {
    if (!this.db) await this.init();
    if (!this.db) return null;
    
    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction(['threats'], 'readwrite');
        const store = transaction.objectStore('threats');
        const request = store.add({
          ...threatData,
          timestamp: Date.now()
        });
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }
  
  async getThreatHistory() {
    if (!this.db) await this.init();
    if (!this.db) return [];
    
    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction(['threats'], 'readonly');
        const store = transaction.objectStore('threats');
        const request = store.getAll();
        
        request.onsuccess = () => {
          const threats = (request.result || []).sort((a, b) => b.timestamp - a.timestamp);
          resolve(threats);
        };
        request.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  }
  
  async clearOldData(daysOld = 7) {
    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    const stores = ['detections', 'threats'];
    for (const storeName of stores) {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.timestamp < cutoff) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    }
  }
}

export default new OfflineStorage();