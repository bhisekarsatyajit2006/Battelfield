import React from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Log error to monitoring service
    this.logError(error, errorInfo);
  }
  
  logError(error, errorInfo) {
    // You can send this to your error monitoring service
    const errorLog = {
      timestamp: new Date().toISOString(),
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    console.error('Error logged:', errorLog);
    
    // Store in localStorage for debugging
    const errors = JSON.parse(localStorage.getItem('error_logs') || '[]');
    errors.push(errorLog);
    localStorage.setItem('error_logs', JSON.stringify(errors.slice(-50))); // Keep last 50 errors
  }
  
  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  }
  
  handleReport = () => {
    const errorReport = {
      error: this.state.error?.toString(),
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };
    
    // Copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2));
    alert('Error report copied to clipboard!');
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <h1>System Error Detected</h1>
            <p className="error-message">
              {this.state.error?.toString() || 'An unexpected error occurred'}
            </p>
            
            <details className="error-details">
              <summary>Technical Details</summary>
              <pre>{this.state.errorInfo?.componentStack}</pre>
            </details>
            
            <div className="error-actions">
              <button onClick={this.handleReset} className="error-btn primary">
                🔄 Reload Application
              </button>
              <button onClick={this.handleReport} className="error-btn secondary">
                📋 Copy Error Report
              </button>
            </div>
            
            <div className="error-help">
              <p>If the problem persists, please:</p>
              <ul>
                <li>Clear your browser cache</li>
                <li>Check if backend server is running on localhost:8000</li>
                <li>Verify WebSocket connection</li>
                <li>Contact system administrator</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

export default ErrorBoundary;