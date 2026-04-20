import React, { useState, useEffect, useRef } from 'react';

const VantaBackground = ({ showTopology = true, showDots = true }) => {
  const dotsEffectRef = useRef(null);
  const topologyEffectRef = useRef(null);
  const dotsRef = useRef(null);
  const topologyRef = useRef(null);

  useEffect(() => {
    let timer;
    let attempts = 0;

    const initVanta = () => {
      attempts++;
      
      if ((!window.THREE || !window.VANTA || !window.VANTA.TOPOLOGY || !window.VANTA.DOTS) && attempts < 20) {
        timer = setTimeout(initVanta, 50);
        return;
      }

      if (!window.VANTA) return;

      // 1. Initialize Topology (Bottom Layer)
      if (topologyRef.current && window.VANTA.TOPOLOGY && !topologyEffectRef.current) {
        try {
          topologyEffectRef.current = window.VANTA.TOPOLOGY({
            el: topologyRef.current,
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.0,
            minWidth: 200.0,
            scale: 1.2,
            scaleMobile: 1.0,
            color: 0x00c853,
            backgroundColor: 0x0,
          });
        } catch (err) {
          console.error('Vanta Topology failed:', err);
        }
      }

      // 2. Initialize Bubbles (Dots) (Top Layer)
      if (dotsRef.current && window.VANTA.DOTS && !dotsEffectRef.current) {
        try {
          dotsEffectRef.current = window.VANTA.DOTS({
            el: dotsRef.current,
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.0,
            minWidth: 200.0,
            scale: 1.0,
            scaleMobile: 1.0,
            color: 0x00c853,
            color2: 0x003311,
            size: 4.5,
            spacing: 35.0,
            showLines: false,
            backgroundColor: 0x0,
            backgroundAlpha: 0.0,
          });
        } catch (err) {
          console.error('Vanta Bubbles failed:', err);
        }
      }
    };

    initVanta();

    return () => {
      if (timer) clearTimeout(timer);
      if (dotsEffectRef.current) {
        try { dotsEffectRef.current.destroy(); } catch(e) {}
      }
      if (topologyEffectRef.current) {
        try { topologyEffectRef.current.destroy(); } catch(e) {}
      }
      dotsEffectRef.current = null;
      topologyEffectRef.current = null;
    };
  }, []); // Run ONCE on mount

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: '#000' }}>
      {/* Topology Background (Bottom) */}
      <div
        ref={topologyRef}
        style={{
          position: 'absolute',
          top: 0, left: 0, width: '100%', height: '100%',
          zIndex: 0,
          opacity: showTopology ? 0.3 : 0,
          transition: 'opacity 1.5s ease-in-out',
        }}
      />

      {/* Bubbles Overlay (Top) */}
      <div
        ref={dotsRef}
        style={{
          position: 'absolute',
          top: 0, left: 0, width: '100%', height: '100%',
          zIndex: 1,
          opacity: showDots ? 0.4 : 0,
          transition: 'opacity 1.5s ease-in-out',
        }}
      />

      {/* Dark Overlay for depth */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, width: '100%', height: '100%',
          zIndex: 2,
          background: 'radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.7) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default VantaBackground;
