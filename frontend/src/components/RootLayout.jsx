import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import VantaBackground from './VantaBackground';

const RootLayout = () => {
  const location = useLocation();
  
  // Show topology (3D grid) for all auth pages and upload page
  // Hide it (dots only) for the chat dashboard to keep it clean
  const isChat = location.pathname === '/chat';
  const showTopology = !isChat;

  return (
    <div className="root-layout">
      {/* 
          This background stays mounted throughout the entire 
          session, preventing WebGL initialization stutters.
      */}
      <VantaBackground showTopology={showTopology} showDots={true} />
      
      <div className="relative z-10 w-full h-full">
        <Outlet />
      </div>
    </div>
  );
};

export default RootLayout;
