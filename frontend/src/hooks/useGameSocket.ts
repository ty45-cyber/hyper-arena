import { useState, useRef, useCallback } from 'react';

export function useGameSocket(baseUrl: string, jwt: string | null) {
  const [status, setStatus] = useState<'IDLE' | 'SEARCHING' | 'PLAYING'>('IDLE');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const gameStateRef = useRef(null); // Replace with actual game state type
  const socketRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!jwt) return;
    setStatus('SEARCHING');
    
    const wsUrl = `${baseUrl}?token=${encodeURIComponent(jwt)}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'MATCH_FOUND') {
        setStatus('PLAYING');
        setPlayerId(data.playerId);
      }
      // Update gameStateRef based on authoritative ticks
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