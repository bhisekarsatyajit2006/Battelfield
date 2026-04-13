import React from 'react';
import './ExportReports.css';

const ExportReports = ({ data, onExport }) => {
  const exportAsJSON = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `battlefield-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (onExport) onExport('json');
  };
  
  const exportAsCSV = () => {
    const threats = Object.entries(data.threats || {}).map(([id, threat]) => ({
      object_id: id,
      threat_level: threat.level,
      threat_score: threat.score,
      confidence: threat.confidence
    }));
    
    if (threats.length === 0) {
      alert('No threat data to export');
      return;
    }
    
    const headers = Object.keys(threats[0]);
    const csvRows = [
      headers.join(','),
      ...threats.map(row => headers.map(header => JSON.stringify(row[header])).join(','))
    ];
    
    const csvStr = csvRows.join('\n');
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `threat-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    if (onExport) onExport('csv');
  };
  
  const exportAsPDF = () => {
    // Create a printable version
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Battlefield Report - ${new Date().toLocaleString()}</title>
          <style>
            body { font-family: monospace; padding: 20px; }
            h1 { color: #00ff88; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #00ff88; color: black; }
          </style>
        </head>
        <body>
          <h1>Battlefield Intelligence Report</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <h2>Threat Analysis</h2>
          <table>
            <thead>
              <tr>
                <th>Object ID</th>
                <th>Threat Level</th>
                <th>Score</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(data.threats || {}).map(([id, threat]) => `
                <tr>
                  <td>${id}</td>
                  <td>${threat.level}</td>
                  <td>${(threat.score * 100).toFixed(1)}%</td>
                  <td>${(threat.confidence * 100).toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <h2>Summary</h2>
          <p>${data.report || 'No report available'}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    if (onExport) onExport('pdf');
  };
  
  return (
    <div className="export-menu">
      <button className="export-btn" onClick={exportAsJSON}>
        📄 Export as JSON
      </button>
      <button className="export-btn" onClick={exportAsCSV}>
        📊 Export as CSV
      </button>
      <button className="export-btn" onClick={exportAsPDF}>
        🖨️ Print Report
      </button>
    </div>
  );
};

export default ExportReports;