import { useState } from 'react';
import { Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { getApiUrl } from '../api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const response = await fetch(getApiUrl('/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess(true);
        setMessage(data.message);
      } else {
        setError(data.detail || 'Something went wrong');
      }
    } catch (err) {
      setError('Connection failed. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4 text-white text-center">
        <div>
          <h1 className="text-2xl font-bold mb-4">Invalid Reset Link</h1>
          <Link to="/login" className="text-blue-500 hover:underline">Back to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-premium-card">
      {/* Glowing Header */}
      <div className="auth-glow-header pt-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="logo-brand-container">
            <img src="/logo.png" alt="Logo" className="logo-brand-img" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">Enerlytics AI</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-wide">Update Password</h1>
        <p className="text-gray-400 text-sm mt-1">Secure your account with a new password</p>
      </div>

      <div className="p-12">
        {success ? (
          <div className="text-center animate-in fade-in zoom-in duration-300 py-6">
            <CheckCircle2 className="w-16 h-16 text-energy mx-auto mb-6" />
            <h2 className="text-xl font-bold text-white mb-8 tracking-tight">Password Changed Successfully!</h2>
            <Link 
              to="/login" 
              className="premium-btn-green block text-center shadow-[0_0_20px_rgba(0,200,83,0.3)] py-5 text-lg"
            >
              Login Now
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <label className="label-premium">New Password <span className="text-energy">*</span></label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="premium-input"
                />
              </div>

              <div>
                <label className="label-premium">Confirm Password <span className="text-energy">*</span></label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="premium-input"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="premium-btn-green flex items-center justify-center mt-4 shadow-[0_0_20_rgba(0,200,83,0.2)] py-5 text-lg"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Update Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
