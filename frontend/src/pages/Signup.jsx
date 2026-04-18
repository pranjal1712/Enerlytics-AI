import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User as UserIcon, Mail, Lock, Loader2, Plus } from 'lucide-react';
import { apiFetch } from '../api';

export default function Signup({ setAuth, setHasDocs }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    try {
      if (e) e.preventDefault();
      setLoading(true);
      setError('');

      // Validation Rules
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address (e.g., user@example.com)');
        setLoading(false);
        return;
      }

      if (password.length < 8) {
        setError('Password must be at least 8 characters long');
        setLoading(false);
        return;
      }

      if (!username.trim()) {
        setError('Username is required');
        setLoading(false);
        return;
      }

      const res = await apiFetch('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, username })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.is_verifying) {
          setIsVerifying(true);
        } else {
          const token = data.access_token;
          if (token) localStorage.setItem('access_token', token);
          if (setAuth) setAuth(true);
          navigate('/upload');
        }
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Signup failed. Email might already be registered.');
      }
    } catch (err) {
      setError('Connection failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    try {
      if (e) e.preventDefault();
      setLoading(true);
      setError('');

      if (otp.length !== 6) {
        setError('Please enter a valid 6-digit code');
        setLoading(false);
        return;
      }

      const res = await apiFetch('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp })
      });

      if (res.ok) {
        const data = await res.json();
        const token = data.access_token;
        if (token) localStorage.setItem('access_token', token);
        if (setAuth) setAuth(true);
        if (setHasDocs) setHasDocs(false);
        navigate('/upload');
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Invalid verification code. Please try again.');
      }
    } catch (err) {
      setError('Verification failed. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (tokenResponse) => {
    try {
      setLoading(true);
      const res = await apiFetch('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ access_token: tokenResponse.access_token })
      });
      if (res.ok) {
        const loginData = await res.json();
        const token = loginData.access_token;
        if (token) {
          localStorage.setItem('access_token', token);
        }

        const statusRes = await apiFetch('/workspace/init');
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (setAuth) setAuth(true);
          if (setHasDocs) setHasDocs(statusData.status.has_documents);
          navigate(statusData.status.has_documents ? '/chat' : '/upload');
        }
      } else {
        setError('Google signup failed');
      }
    } catch (err) {
      setError('Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const signupWithGoogleManual = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = window.location.origin + '/signup';
    const scope = 'email profile openid';
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${encodeURIComponent(scope)}`;
    window.location.href = googleAuthUrl;
  };

  // Google OAuth Fragment Handler
  useState(() => {
    const params = new URLSearchParams(window.location.hash.replace('#', '?'));
    const token = params.get('access_token');
    if (token) {
      handleGoogleSuccess({ access_token: token });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  });

  return (
    <div className="auth-premium-card auth-sync-height">
      <div className="auth-glow-header pt-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="logo-brand-container">
            <img src="/logo.png" alt="Logo" className="logo-brand-img" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">Enerlytics AI</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-wide">
          {isVerifying ? "Verify Email" : "Create Account"}
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {isVerifying ? `Verification code sent to ${email}` : "Join us to start analyzing your energy data"}
        </p>
      </div>

      <div className="p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        {isVerifying ? (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div>
              <label className="label-premium">Verification Code <span className="text-energy">*</span></label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit code"
                className="premium-input text-center text-2xl tracking-[10px] font-bold"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="premium-btn-green flex items-center justify-center mt-4 shadow-[0_0_20px_rgba(0,200,83,0.2)] py-5 text-lg"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirm Identity'}
            </button>

            <button
              type="button"
              onClick={() => setIsVerifying(false)}
              className="w-full text-center text-gray-500 text-xs mt-4 hover:text-white transition-all bg-transparent border-none cursor-pointer"
            >
              Back to registration
            </button>
          </form>
        ) : (
          <>
            {/* Social Signups - Only visible in development */}
            {!import.meta.env.PROD && (
              <>
                <div className="flex justify-center mb-6">
                  <button
                    onClick={signupWithGoogleManual}
                    className="premium-social-btn hover:bg-white/5 transition-all w-full flex items-center justify-center gap-4 py-4 border-none cursor-pointer bg-transparent"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12.48 10.92v3.28h7.84c-.24 1.84-2 5.28-7.84 5.28-5.08 0-9.24-4.2-9.24-9.36s4.16-9.36 9.24-9.36c2.88 0 4.8 1.2 5.88 2.24l2.56-2.52C19.32 1.92 16.32 0 12.48 0 5.64 0 0 5.64 0 12.48s5.64 12.48 12.48 12.48c7.16 0 11.92-5.04 11.92-12.12 0-.84-.08-1.48-.2-2.12h-11.72z" />
                    </svg>
                    <span className="text-sm font-bold text-white uppercase tracking-wider">Continue with Google</span>
                  </button>
                </div>

                <div className="relative flex justify-center text-xs uppercase mb-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                  <span className="bg-[#0d0d0d] px-4 text-gray-400 font-bold z-10">Or</span>
                </div>
              </>
            )}

            <form onSubmit={handleSignup} className="space-y-6">
              <div>
                <label className="label-premium">Username <span className="text-energy">*</span></label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  className="premium-input"
                />
              </div>

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
                <label className="label-premium">Password <span className="text-energy">*</span></label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="premium-input"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="premium-btn-green flex items-center justify-center mt-4 shadow-[0_0_20px_rgba(0,200,83,0.2)] py-5 text-lg"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Get Verification Code'}
              </button>
            </form>
          </>
        )}

        <p className="mt-10 text-center text-sm text-gray-500 font-bold">
          Already have an account?{' '}
          <Link to="/login" className="text-energy font-bold hover:brightness-125 transition-all">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
