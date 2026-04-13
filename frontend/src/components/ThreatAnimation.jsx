import React, { useEffect, useRef } from 'react';
import './ThreatAnimation.css';

const ThreatAnimation = ({ threats, activeThreat }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Animation variables
    let particles = [];
    let animationFrame;
    
    // Create particles for threats
    const createParticles = () => {
      if (!threats) return;
      
      Object.entries(threats).forEach(([id, threat]) => {
        if (threat.level === 'HIGH') {
          // Add more particles for high threats
          for (let i = 0; i < 15; i++) {
            particles.push({
              id: id,
              x: Math.random() * canvas.width,
              y: Math.random() * canvas.height,
              radius: Math.random() * 3 + 1,
              speedX: (Math.random() - 0.5) * 2,
              speedY: (Math.random() - 0.5) * 2,
              alpha: Math.random() * 0.5 + 0.3,
              threatLevel: 'HIGH'
            });
          }
        } else if (threat.level === 'MEDIUM') {
          // Medium particles
          for (let i = 0; i < 8; i++) {
            particles.push({
              id: id,
              x: Math.random() * canvas.width,
              y: Math.random() * canvas.height,
              radius: Math.random() * 2 + 1,
              speedX: (Math.random() - 0.5) * 1.5,
              speedY: (Math.random() - 0.5) * 1.5,
              alpha: Math.random() * 0.4 + 0.2,
              threatLevel: 'MEDIUM'
            });
          }
        }
      });
    };
    
    // Update particle positions
    const updateParticles = () => {
      particles = particles.filter(p => p.alpha > 0);
      
      particles.forEach(particle => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.alpha -= 0.005;
        
        // Wrap around screen
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;
      });
    };
    
    // Draw particles
    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(particle => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        
        const color = particle.threatLevel === 'HIGH' 
          ? `rgba(255, 51, 102, ${particle.alpha})`
          : `rgba(255, 153, 51, ${particle.alpha})`;
        
        ctx.fillStyle = color;
        ctx.fill();
        
        // Add glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = particle.threatLevel === 'HIGH' ? '#ff3366' : '#ff9933';
      });
      
      ctx.shadowBlur = 0;
    };
    
    // Animation loop
    const animate = () => {
      updateParticles();
      drawParticles();
      animationFrame = requestAnimationFrame(animate);
    };
    
    createParticles();
    animate();
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [threats]);
  
  return (
    <div className="threat-animation-container">
      <canvas ref={canvasRef} className="threat-canvas"></canvas>
    </div>
  );
};

export default ThreatAnimation;