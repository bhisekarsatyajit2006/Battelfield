import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SatellitePage from './pages/SatellitePage';
import BlockchainLogs from './pages/BlockchainLogs';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/global.css';
import './styles/navigation.css';

// Navigation component with active route highlighting
const Navigation = () => {
  const location = useLocation();
  
  return (
    <nav className="main-nav">
      <div className="nav-brand">
        <span className="brand-icon">🎯</span>
        <span className="brand-text">BATTLEFIELD AI</span>
      </div>
      <div className="nav-links">
        <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
          <span className="nav-icon">🗺️</span>
          Dashboard
        </Link>
        <Link to="/satellite" className={`nav-link ${location.pathname === '/satellite' ? 'active' : ''}`}>
          <span className="nav-icon">🛰️</span>
          Satellite
        </Link>
        <Link to="/blockchain" className={`nav-link ${location.pathname === '/blockchain' ? 'active' : ''}`}>
          <span className="nav-icon">🔗</span>
          Blockchain
        </Link>
      </div>
    </nav>
  );
};

// Custom Error Boundary with enhanced features
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application Error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Log error to localStorage for debugging
    const errorLog = {
      timestamp: new Date().toISOString(),
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    const errors = JSON.parse(localStorage.getItem('error_logs') || '[]');
    errors.push(errorLog);
    localStorage.setItem('error_logs', JSON.stringify(errors.slice(-50)));
  }
  
  handleReload = () => {
    window.location.reload();
  }
  
  handleClearData = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  }
  
  handleCopyReport = () => {
    const errorReport = {
      error: this.state.error?.toString(),
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };
    
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2));
    alert('✅ Error report copied to clipboard!');
  }
  
  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '40px 20px', 
          color: '#ff3366', 
          background: '#0a0f1a',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          fontFamily: 'monospace'
        }}>
          <div style={{ 
            maxWidth: '800px',
            width: '90%',
            background: 'rgba(0, 0, 0, 0.8)',
            border: '2px solid #ff3366',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>⚠️</div>
              <h1 style={{ color: '#ff3366', marginBottom: '12px', fontSize: '28px' }}>
                Battlefield System Error
              </h1>
              <p style={{ color: '#e0e0e0', fontSize: '14px' }}>
                An unexpected error has occurred in the intelligence system
              </p>
            </div>
            
            <div style={{ 
              background: 'rgba(0, 0, 0, 0.5)', 
              padding: '20px', 
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <div style={{ 
                color: '#ff3366', 
                fontFamily: 'monospace', 
                fontSize: '13px',
                wordBreak: 'break-word'
              }}>
                {this.state.error?.toString() || 'Unknown error occurred'}
              </div>
              
              <button 
                onClick={this.toggleDetails}
                style={{
                  marginTop: '12px',
                  background: 'transparent',
                  border: '1px solid #00ff88',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  color: '#00ff88',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                {this.state.showDetails ? 'Hide Details ▲' : 'Show Details ▼'}
              </button>
              
              {this.state.showDetails && this.state.errorInfo && (
                <details style={{ marginTop: '12px' }} open>
                  <summary style={{ color: '#00ff88', marginBottom: '8px', cursor: 'pointer' }}>
                    Technical Details
                  </summary>
                  <pre style={{ 
                    color: '#a0a0a0', 
                    fontSize: '11px',
                    overflow: 'auto',
                    maxHeight: '200px',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    background: 'rgba(0, 0, 0, 0.5)',
                    padding: '12px',
                    borderRadius: '4px',
                    marginTop: '8px'
                  }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={this.handleReload}
                style={{
                  padding: '12px 24px',
                  background: '#00ff88',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  color: '#0a0f1a',
                  fontSize: '14px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                🔄 Reload Application
              </button>
              
              <button 
                onClick={this.handleCopyReport}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  border: '1px solid #33ccff',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  color: '#33ccff',
                  fontSize: '14px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                📋 Copy Error Report
              </button>
              
              <button 
                onClick={this.handleClearData}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  border: '1px solid #ff3366',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  color: '#ff3366',
                  fontSize: '14px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                🗑️ Clear Data & Reload
              </button>
            </div>
            
            <div style={{ 
              marginTop: '24px', 
              paddingTop: '24px', 
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '12px',
              color: '#a0a0a0',
              textAlign: 'center'
            }}>
              <p>If the problem persists, please:</p>
              <ul style={{ marginTop: '8px', listStyle: 'none', padding: 0 }}>
                <li>✓ Check if backend server is running on localhost:8000</li>
                <li>✓ Verify WebSocket connection (ws://localhost:8000/ws/live)</li>
                <li>✓ Clear browser cache and cookies</li>
                <li>✓ Contact system administrator</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main App component with Router
const AppWithRouter = () => {
  return (
    <Router>
      <div className="App" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Navigation />
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/satellite" element={<SatellitePage />} />
            <Route path="/blockchain" element={<BlockchainLogs />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

// Main App component with Error Boundary wrapper
function App() {
  return (
    <AppErrorBoundary>
      <AppWithRouter />
    </AppErrorBoundary>
  );
}

export default App;