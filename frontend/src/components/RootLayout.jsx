import React from 'react';
import { Outlet } from 'react-router-dom';

const RootLayout = () => {

  return (
    <div className="root-layout">
      
      <div className="relative z-10 w-full h-full">
        <Outlet />
      </div>
    </div>
  );
};

export default RootLayout;
