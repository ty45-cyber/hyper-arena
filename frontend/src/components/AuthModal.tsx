"use client";
import { useState } from 'react';

interface AuthModalProps {
  onSuccess: (token: string, username: string) => void;
}

export default function AuthModal({ onSuccess }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    try {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || (typeof data === 'string' ? data : 'Authentication failed'));
      }

      localStorage.setItem('arena_jwt', data.token);
      localStorage.setItem('arena_username', data.username);
      onSuccess(data.token, data.username);
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-center tracking-widest text-cyan-400 mb-6">
          {isRegister ? 'CREATE ACCOUNT' : 'PLAYER LOGIN'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-rose-950/50 border border-rose-500/50 text-rose-400 text-xs rounded tracking-wide">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 uppercase tracking-widest mb-1">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 uppercase tracking-widest mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 bg-cyan-950 border border-cyan-500 text-cyan-400 font-bold tracking-widest rounded hover:bg-cyan-900 transition-all disabled:opacity-50"
          >
            {loading ? 'AUTHENTICATING...' : isRegister ? 'REGISTER' : 'LOG IN'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-slate-500 hover:text-slate-300 tracking-wider underline underline-offset-4"
          >
            {isRegister ? 'Already have an account? Log in' : "Need an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}