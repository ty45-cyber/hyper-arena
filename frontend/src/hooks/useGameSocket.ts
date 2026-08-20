import { useState, useRef, useCallback } from 'react';

export interface GameState {
  tick: number;
  ball_x: number;
  ball_y: number;
  p1_x: number;
  p1_y: number;
  p2_x: number;
  p2_y: number;
  p1_score?: number;
  p2_score?: number;
  [key: string]: any; // Index signature fallback for additional custom state properties
}

export function useGameSocket(baseUrl: string, jwt: string | null) {
  const [status, setStatus] = useState<'IDLE' | 'SEARCHING' | 'PLAYING'>('IDLE');
  const [playerId, setPlayerId] = useState<number | string | null>(null);
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