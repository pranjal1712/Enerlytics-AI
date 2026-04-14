import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { getApiUrl } from '../api';

export default function Login({ setAuth, setHasDocs }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    try {
      if (e) e.preventDefault();
      setLoading(true);
      setError('');
      
      const res = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, username: email })
      });
      if (res.ok) {
        // Fetch new status
        const statusRes = await fetch(getApiUrl('/api/user/status'), { credentials: 'include' });
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setAuth(true);
          setHasDocs(statusData.has_documents);
          navigate(statusData.has_documents ? '/chat' : '/upload');
        }
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('Connection failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (tokenResponse) => {
    try {
      setLoading(true);
      const res = await fetch(getApiUrl('/api/auth/google'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ access_token: tokenResponse.access_token })
      });
      if (res.ok) {
        const statusRes = await fetch(getApiUrl('/api/user/status'), { credentials: 'include' });
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setAuth(true);
          setHasDocs(statusData.has_documents);
          navigate(statusData.has_documents ? '/chat' : '/upload');
        }
      } else {
        setError('Google login failed');
      }
    } catch (err) {
      setError('Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle Redirect Result on mount
  useState(() => {
    const params = new URLSearchParams(window.location.hash.replace('#', '?'));
    const token = params.get('access_token');
    if (token) {
      handleGoogleSuccess({ access_token: token });
      // Clean URL fragment
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  });

  const loginWithGoogleManual = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = window.location.origin + '/login';
    const scope = 'email profile openid';
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${encodeURIComponent(scope)}`;
    
    // Manual Redirect to Google
    window.location.href = googleAuthUrl;
  };

  return (
    <div className="auth-premium-card auth-sync-height">
      {/* Glowing Header */}
      <div className="auth-glow-header pt-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="logo-brand-container">
            <img src="/logo.png" alt="Logo" className="logo-brand-img" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">Enerlytics AI</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-wide">Welcome Back</h1>
        <p className="text-gray-400 text-sm mt-1">Please enter your details to access dashboard</p>
      </div>

      <div className="p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        {/* Social Logins */}
        <div className="flex justify-center mb-6">
          <button 
            onClick={loginWithGoogleManual}
            className="premium-social-btn hover:bg-white/5 transition-all w-full flex items-center justify-center gap-4 py-4 border-none cursor-pointer bg-transparent"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12.48 10.92v3.28h7.84c-.24 1.84-2 5.28-7.84 5.28-5.08 0-9.24-4.2-9.24-9.36s4.16-9.36 9.24-9.36c2.88 0 4.8 1.2 5.88 2.24l2.56-2.52C19.32 1.92 16.32 0 12.48 0 5.64 0 0 5.64 0 12.48s5.64 12.48 12.48 12.48c7.16 0 11.92-5.04 11.92-12.12 0-.84-.08-1.48-.2-2.12h-11.72z"/>
            </svg>
            <span className="text-sm font-bold text-white uppercase tracking-wider">Continue with Google</span>
          </button>
        </div>

        <div className="relative flex justify-center text-xs uppercase mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
          <span className="bg-[#0d0d0d] px-4 text-gray-400 font-bold z-10">Or</span>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="label-premium">E-mail Address <span className="text-energy">*</span></label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter Email ID"
              className="premium-input"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label-premium mb-0">Password <span className="text-energy">*</span></label>
              <Link to="/forgot-password" rounded-none className="text-xs font-bold text-energy hover:brightness-125 transition-all">
                Forgot Password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Password"
              className="premium-input"
            />
          </div>

          <div className="flex items-center gap-3 py-2">
            <input type="checkbox" className="w-5 h-5 rounded border-white/10 bg-black/50 accent-energy" id="remember" />
            <label htmlFor="remember" className="text-sm text-gray-300 font-bold cursor-pointer">Remember me</label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="premium-btn-green flex items-center justify-center mt-4 shadow-[0_0_20px_rgba(0,200,83,0.2)] py-5 text-lg"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Sign in'}
          </button>
        </form>

        <p className="mt-10 text-center text-sm text-gray-500 font-bold">
          Don't have an account yet?{' '}
          <Link to="/signup" className="text-energy font-bold hover:brightness-125 transition-all">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
