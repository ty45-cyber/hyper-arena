"use client";
import { useEffect, useRef } from 'react';
import { GameState } from '../hooks/useGameSocket';

interface ArenaProps {
  gameStateRef: React.MutableRefObject<GameState | null>;
  playerId: number;
  sendInput: (x: number) => void;
}

// Helper to smoothly transition between two values
const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

export default function Arena({ gameStateRef, playerId, sendInput }: ArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // 1. Client-Side Prediction State
  // We store our local prediction independently of the server state
  const localPaddleX = useRef<number>(350); 
  
  // 2. Interpolation State
  // We maintain a separate visual state that smoothly chases the server state
  const visualState = useRef({
    ball_x: 400,
    ball_y: 300,
    opp_x: 350
  });

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = 800 / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const newPaddleX = mouseX - 50;
    
    // Instantly predict local state (Zero input lag)
    localPaddleX.current = newPaddleX;
    
    // Dispatch to server asynchronously
    sendInput(newPaddleX); 
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const render = () => {
      const serverState = gameStateRef.current;
      if (!serverState) {
        requestRef.current = requestAnimationFrame(render);
        return;
      }

      // 3. Apply Lag Compensation (Interpolation)
      // Smoothly blend the current visual position toward the true server position
      // The 0.3 factor determines how aggressively it snaps vs glides
      visualState.current.ball_x = lerp(visualState.current.ball_x, serverState.ball_x, 0.3);
      visualState.current.ball_y = lerp(visualState.current.ball_y, serverState.ball_y, 0.3);
      
      const serverOppX = playerId === 1 ? serverState.p2_x : serverState.p1_x;
      visualState.current.opp_x = lerp(visualState.current.opp_x, serverOppX, 0.3);

      // Determine which paddle is local (predicted) and which is the opponent (interpolated)
      const renderP1_X = playerId === 1 ? localPaddleX.current : visualState.current.opp_x;
      const renderP2_X = playerId === 2 ? localPaddleX.current : visualState.current.opp_x;

      // Background decay trail
      ctx.fillStyle = 'rgba(2, 6, 23, 0.4)';
      ctx.fillRect(0, 0, 800, 600);

      // Center court division
      ctx.strokeStyle = '#1e293b';
      ctx.setLineDash([15, 15]);
      ctx.beginPath();
      ctx.moveTo(0, 300);
      ctx.lineTo(800, 300);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.globalCompositeOperation = 'lighter';

      // Ball (Using smooth interpolated state)
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#22d3ee';
      ctx.fillStyle = '#0891b2';
      ctx.beginPath();
      ctx.arc(visualState.current.ball_x, visualState.current.ball_y, 8, 0, Math.PI * 2);
      ctx.fill();

      // Bottom Paddle (P1)
      ctx.shadowColor = playerId === 1 ? '#34d399' : '#f43f5e';
      ctx.fillStyle = playerId === 1 ? '#10b981' : '#e11d48';
      ctx.fillRect(renderP1_X, 570, 100, 10);

      // Top Paddle (P2)
      ctx.shadowColor = playerId === 2 ? '#34d399' : '#f43f5e';
      ctx.fillStyle = playerId === 2 ? '#10b981' : '#e11d48';
      ctx.fillRect(renderP2_X, 20, 100, 10);

      // Scoreboard (Direct from server state, no interpolation needed)
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.font = 'bold 72px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(serverState.p2_score.toString(), 400, 240);
      ctx.fillText(serverState.p1_score.toString(), 400, 390);

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [playerId, gameStateRef]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      onPointerMove={handlePointerMove}
      className="w-full max-w-4xl h-auto bg-slate-950 border border-slate-800 rounded-lg shadow-[0_0_50px_rgba(2,6,23,0.8)] cursor-none touch-none"
    />
  );
}