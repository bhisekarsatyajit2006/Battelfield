import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './IntelligenceGraph.css';

const IntelligenceGraph = ({ paths, clusters, sensors, fused, onNodeClick }) => {
  const svgRef = useRef();
  const [selectedNode, setSelectedNode] = useState(null);
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();
    
    // Build nodes
    const nodes = [];
    const links = [];
    
    // Add vehicle nodes from paths
    if (paths) {
      Object.keys(paths).forEach(objectId => {
        nodes.push({
          id: `vehicle-${objectId}`,
          type: 'vehicle',
          label: `Vehicle ${objectId}`,
          objectId: objectId,
          clusterId: clusters?.[objectId],
          fused: fused?.[objectId]
        });
      });
    }
    
    // Add sensor nodes
    if (sensors && Array.isArray(sensors)) {
      sensors.forEach(sensor => {
        nodes.push({
          id: `sensor-${sensor.sensor_id}`,
          type: 'sensor',
          label: `Sensor ${sensor.sensor_id}`,
          sensorData: sensor
        });
      });
    }
    
    // Add cluster nodes (unique clusters)
    if (clusters) {
      const uniqueClusters = [...new Set(Object.values(clusters).filter(c => c !== -1))];
      uniqueClusters.forEach(clusterId => {
        nodes.push({
          id: `cluster-${clusterId}`,
          type: 'cluster',
          label: `Cluster ${clusterId}`,
          clusterId: clusterId
        });
      });
    }
    
    // Create links: vehicle -> cluster
    if (paths && clusters) {
      Object.entries(clusters).forEach(([objectId, clusterId]) => {
        if (clusterId !== -1) {
          links.push({
            source: `vehicle-${objectId}`,
            target: `cluster-${clusterId}`,
            type: 'belongs_to'
          });
        }
      });
    }
    
    // Create links: vehicle -> sensor (based on proximity - simplified)
    if (paths && sensors) {
      Object.keys(paths).forEach(objectId => {
        sensors.forEach(sensor => {
          // Add link if there's fused intelligence connection
          if (fused?.[objectId]?.sources?.sensor) {
            links.push({
              source: `vehicle-${objectId}`,
              target: `sensor-${sensor.sensor_id}`,
              type: 'connected_to'
            });
          }
        });
      });
    }
    
    // Set up SVG dimensions
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g');
    
    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 2])
      .on('zoom', (event) => {
        svg.attr('transform', event.transform);
      });
    
    d3.select(svgRef.current).call(zoom);
    
    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50));
    
    // Draw links
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', (d) => {
        switch(d.type) {
          case 'belongs_to': return '#00ff88';
          default: return '#33ccff';
        }
      })
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6)
      .attr('stroke-dasharray', (d) => d.type === 'belongs_to' ? null : '5,5');
    
    // Draw nodes
    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelectedNode(d.id);
        if (onNodeClick) onNodeClick(d);
      });
    
    // Add circles for nodes
    node.append('circle')
      .attr('r', (d) => {
        switch(d.type) {
          case 'vehicle': return 12;
          case 'sensor': return 10;
          case 'cluster': return 15;
          default: return 10;
        }
      })
      .attr('fill', (d) => {
        switch(d.type) {
          case 'vehicle': return d.clusterId !== undefined ? '#00ff88' : '#ff3366';
          case 'sensor': return '#33ccff';
          case 'cluster': return '#ffcc33';
          default: return '#ffffff';
        }
      })
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .attr('fill-opacity', 0.8);
    
    // Add labels
    node.append('text')
      .attr('dy', -15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e0e0e0')
      .attr('font-size', '10px')
      .text(d => d.label);
    
    // Add threat indicator for high threat vehicles
    node.filter(d => d.type === 'vehicle' && d.fused?.threat?.level === 'HIGH')
      .append('circle')
      .attr('r', 16)
      .attr('fill', 'none')
      .attr('stroke', '#ff3366')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '3,3');
    
    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
    
    // Cleanup
    return () => {
      simulation.stop();
    };
    
  }, [paths, clusters, sensors, fused, onNodeClick]);
  
  return (
    <div className="intelligence-graph">
      <div className="graph-header">
        <h3>🧠 INTELLIGENCE NETWORK</h3>
        <div className="graph-legend">
          <span><span className="legend-vehicle"></span> Vehicle</span>
          <span><span className="legend-sensor"></span> Sensor</span>
          <span><span className="legend-cluster"></span> Cluster</span>
        </div>
      </div>
      <div className="graph-container">
        <svg ref={svgRef} style={{ width: '100%', height: '100%' }}></svg>
      </div>
    </div>
  );
};

export default IntelligenceGraph;