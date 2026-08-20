import { useState, useRef, useCallback } from 'react';

// Export GameState so components like Arena.tsx can type their refs/props
export interface PlayerPosition {
  x: number;
  y: number;
  score?: number;
}

export interface GameState {
  tick: number;
  players: Record<string, PlayerPosition>;
}

export function useGameSocket(baseUrl: string, jwt: string | null) {
  const [status, setStatus] = useState<'IDLE' | 'SEARCHING' | 'PLAYING'>('IDLE');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!jwt) return;
    setStatus('SEARCHING');
    
    const wsUrl = `${baseUrl}?token=${encodeURIComponent(jwt)}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'MATCH_FOUND') {
          setStatus('PLAYING');
          setPlayerId(data.playerId);
        } else if (data.type === 'TICK') {
          gameStateRef.current = data.state;
        }
      } catch (err) {
        console.error('Failed to parse frame:', err);
      }
    };

    ws.onclose = () => setStatus('IDLE');
    socketRef.current = ws;
  }, [baseUrl, jwt]);

  const sendInput = useCallback((input: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(input));
    }
  }, []);

  return { connect, status, playerId, gameStateRef, sendInput };
}