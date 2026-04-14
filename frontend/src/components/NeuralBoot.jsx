import React, { useState, useEffect } from 'react';
import { Loader2, Terminal, Shield, Cpu, Activity } from 'lucide-react';

const BOOT_LOGS = [
  { text: "Initializing Neural Core...", icon: <Cpu size={16} /> },
  { text: "Mapping Semantic Projections...", icon: <Activity size={16} /> },
  { text: "Synchronizing Power Grid History...", icon: <Terminal size={16} /> },
  { text: "Securing Context Isolation...", icon: <Shield size={16} /> },
  { text: "Refining Knowledge Vectors...", icon: <Loader2 size={16} className="animate-spin" /> },
];

const NeuralBoot = ({ onComplete }) => {
  const [currentLog, setCurrentLog] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const logInterval = setInterval(() => {
      setCurrentLog(prev => {
        if (prev >= BOOT_LOGS.length - 1) {
          clearInterval(logInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 600);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 40);

    return () => {
      clearInterval(logInterval);
      clearInterval(progressInterval);
    };
  }, [onComplete]);

  return (
    <div className="neural-boot-overlay">
      <div className="neural-boot-content">
        <div className="boot-header">
          <div className="neural-logo-small">
            <div className="logo-pulse"></div>
          </div>
          <h1>System <span className="text-energy">Initializing</span></h1>
        </div>

        <div className="boot-status-list">
          {BOOT_LOGS.slice(0, currentLog + 1).map((log, index) => (
            <div 
              key={index} 
              className={`boot-log-item ${index === currentLog ? 'active' : 'completed'}`}
            >
              <span className="log-icon">{log.icon}</span>
              <span className="log-text">{log.text}</span>
              {index < currentLog && <span className="log-check">OK</span>}
            </div>
          ))}
        </div>

        <div className="boot-progress-container">
          <div className="boot-progress-bar">
            <div 
              className="boot-progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
            <div className="boot-progress-glow" style={{ left: `${progress}%` }}></div>
          </div>
          <div className="boot-progress-meta">
            <span>BIT-STREAM LOAD: {progress}%</span>
            <span>SECTOR: 0x{progress.toString(16).toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NeuralBoot;
