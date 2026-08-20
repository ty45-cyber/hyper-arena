"use client";
import { useEffect, useState } from 'react';
import { useGameSocket } from '../hooks/useGameSocket';
import AuthModal from '../components/AuthModal';

export default function Home() {
  const [jwt, setJwt] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('arena_jwt');
    const savedUser = localStorage.getItem('arena_username');
    if (savedToken && savedUser) {
      setJwt(savedToken);
      setUsername(savedUser);
    }
    setIsInitialized(true);
  }, []);

  const handleAuthSuccess = (token: string, user: string) => {
    setJwt(token);
    setUsername(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('arena_jwt');
    localStorage.removeItem('arena_username');
    setJwt(null);
    setUsername(null);
  };

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000/ws';

  const { connect, status, playerId, gameStateRef, sendInput } = useGameSocket(
    wsUrl,
    jwt
  );

  if (!isInitialized) return null;

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {!jwt && <AuthModal onSuccess={handleAuthSuccess} />}

      <div className="mb-6 text-center h-24">
        <h1 className="text-4xl font-bold tracking-[0.25em] text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
          ARENA
        </h1>
        
        {username && (
          <div className="flex items-center gap-3 justify-center mt-2">
            <span className="text-xs text-slate-400 tracking-wider">
              PILOT: <strong className="text-white">{username}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="text-[10px] text-rose-400 hover:text-rose-300 tracking-widest border border-rose-900 px-2 py-0.5 rounded"
            >
              LOGOUT
            </button>
          </div>
        )}

        {status === 'IDLE' && jwt && (
          <p className="text-xs text-slate-500 tracking-widest mt-2">
            SYSTEM READY // CLICK INITIALIZE TO ENTER QUEUE
          </p>
        )}
        
        {status === 'SEARCHING' && (
          <p className="text-xs text-cyan-400 tracking-widest mt-2 animate-pulse">
            SEARCHING FOR AVAILABLE OPPONENT...
          </p>
        )}
      </div>

      {status === 'PLAYING' && playerId ? (
        <div className="w-full max-w-4xl h-[600px] border border-cyan-500 rounded-lg bg-slate-900 flex items-center justify-center">
          <p className="text-cyan-400">GAME CANVAS RENDERER</p>
        </div>
      ) : (
        <div className="w-full max-w-4xl h-[600px] border border-slate-900 rounded-lg bg-slate-950/50 flex flex-col items-center justify-center gap-6 shadow-inner">
          <button
            onClick={connect}
            disabled={!jwt || status === 'SEARCHING'}
            className="px-10 py-5 bg-cyan-950/80 border border-cyan-500/50 text-cyan-400 font-bold tracking-[0.2em] rounded hover:bg-cyan-900 hover:border-cyan-400 hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            {status === 'SEARCHING' ? 'QUEUED' : 'INITIALIZE MATCH'}
          </button>
        </div>
      )}
    </main>
  );
}