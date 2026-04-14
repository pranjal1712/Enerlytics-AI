import { useState } from 'react';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getApiUrl } from '../api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(getApiUrl('/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (response.ok) {
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
        <h1 className="text-3xl font-bold text-white tracking-wide">Reset Password</h1>
        <p className="text-gray-400 text-sm mt-1">Enter email to receive recovery link</p>
      </div>

      <div className="p-12">
        <Link to="/login" className="text-gray-500 hover:text-white flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all mb-10">
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>

        {message && (
          <div className="mb-8 p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-sm text-center">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="label-premium">Email Address <span className="text-energy">*</span></label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter registered email"
              className="premium-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="premium-btn-green flex items-center justify-center shadow-[0_0_20px_rgba(0,200,83,0.2)] py-5 text-lg"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
