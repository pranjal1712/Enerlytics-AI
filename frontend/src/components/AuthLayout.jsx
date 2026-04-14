import React from 'react';
import { Outlet } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
const AuthLayout = () => {
  return (
    <div className="auth-page-wrapper">
      <div className="auth-split-container relative z-10">
        {/* Persistent Left Side: Lottie Animation & Branding */}
        <div className="lottie-side">
          <DotLottieReact
            src="https://lottie.host/4d47cbfa-fc99-4f43-8756-9d618df0a0e4/BHEFT82GGU.lottie"
            loop
            autoplay
          />
          <div className="left-branding">
            <h1 className="left-site-name">Enerlytics AI</h1>
            <p className="left-slogan">Think energy. Think Smart</p>
          </div>
        </div>

        {/* Dynamic Right Side: Individual Auth Forms (Login, Signup, etc) */}
        <div className="form-side">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
