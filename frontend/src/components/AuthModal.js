import React, { useState } from 'react';
import axios from 'axios';
import { X, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function AuthModal({ onClose, onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    
    try {
      const endpoint = isLogin ? '/api/auth/login/' : '/api/auth/register/';
      const { data } = await axios.post(`${API}${endpoint}`, { username, password });
      
      onLogin(data.token, data.username);
      toast.success(isLogin ? 'Successfully signed in' : 'Account created');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal">
        <button className="auth-close-btn" onClick={onClose}>
          <X size={20} />
        </button>
        
        <h2 className="auth-title" style={{ fontFamily: "'Playfair Display', serif" }}>
          {isLogin ? 'Welcome Back' : 'Join SnapSummary'}
        </h2>
        <p className="auth-subtitle">
          {isLogin ? 'Sign in to upload and analyze your files.' : 'Create an account to get started.'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="auth-input"
            autoFocus
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
          />
          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? <Loader size={18} className="spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="auth-switch">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button type="button" className="auth-switch-btn" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
