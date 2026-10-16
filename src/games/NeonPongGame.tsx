import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sounds } from '../utils/audio';
import { RotateCcw, Users, User, Trophy } from 'lucide-react';

export const NeonPongGame: React.FC<{ onScoreUpdate?: (score: number) => void }> = ({ onScoreUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [isTwoPlayer, setIsTwoPlayer] = useState(false);
  const [difficulty, setDifficulty] = useState<'rookie' | 'pro' | 'master'>('pro');
  const [winner, setWinner] = useState<string | null>(null);

  const stateRef = useRef({
    p1: { y: 150, vy: 0, height: 70, width: 10, speed: 6 },
    p2: { y: 150, vy: 0, height: 70, width: 10, speed: 5.5 },
    ball: {
      x: 250,
      y: 200,
      radius: 6,
      vx: 4.5,
      vy: 2,
      baseSpeed: 5,
      speedMultiplier: 1,
    },
    trail: [] as Array<{ x: number; y: number }>,
    particles: [] as Array<{ x: number; y: number; vx: number; vy: number; color: string; life: number }>,
    keys: {
      w: false,
      s: false,
      up: false,
      down: false,
    },
    p1Score: 0,
    p2Score: 0,
    winner: null as string | null,
    isTwoPlayer: false,
    difficulty: 'pro' as 'rookie' | 'pro' | 'master',
  });

  const createSparks = (x: number, y: number, color: string) => {
    const s = stateRef.current;
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      s.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 1,
      });
    }
  };

  const resetBall = useCallback((towardsP1 = false) => {
    const s = stateRef.current;
    s.ball.x = 250;
    s.ball.y = 200;
    s.ball.speedMultiplier = 1;
    const angle = (Math.random() * Math.PI) / 3 - Math.PI / 6; // -30 to +30 deg
    const dir = towardsP1 ? -1 : 1;
    s.ball.vx = Math.cos(angle) * s.ball.baseSpeed * dir;
    s.ball.vy = Math.sin(angle) * s.ball.baseSpeed;
    s.trail = [];
  }, []);

  const resetMatch = useCallback(() => {
    const s = stateRef.current;
    s.p1.y = 165;
    s.p2.y = 165;
    s.p1Score = 0;
    s.p2Score = 0;
    s.winner = null;
    setP1Score(0);
    setP2Score(0);
    setWinner(null);
    resetBall(Math.random() > 0.5);
  }, [resetBall]);

  useEffect(() => {
    stateRef.current.isTwoPlayer = isTwoPlayer;
    stateRef.current.difficulty = difficulty;
  }, [isTwoPlayer, difficulty]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = stateRef.current.keys;
      if (e.code === 'KeyW') { k.w = true; e.preventDefault(); }
      if (e.code === 'KeyS') { k.s = true; e.preventDefault(); }
      if (e.code === 'ArrowUp') { k.up = true; e.preventDefault(); }
      if (e.code === 'ArrowDown') { k.down = true; e.preventDefault(); }
      if (e.code === 'KeyR' && stateRef.current.winner) {
        resetMatch();
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = stateRef.current.keys;
      if (e.code === 'KeyW') k.w = false;
      if (e.code === 'KeyS') k.s = false;
      if (e.code === 'ArrowUp') k.up = false;
      if (e.code === 'ArrowDown') k.down = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [resetMatch]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    resetMatch();
    let animId: number;

    const gameLoop = () => {
      const s = stateRef.current;

      if (!s.winner) {
        // Player 1 controls (W/S or Up/Down if 1P mode on arrows)
        if (s.keys.w || (!s.isTwoPlayer && s.keys.up)) {
          s.p1.y = Math.max(0, s.p1.y - s.p1.speed);
        }
        if (s.keys.s || (!s.isTwoPlayer && s.keys.down)) {
          s.p1.y = Math.min(400 - s.p1.height, s.p1.y + s.p1.speed);
        }

        // Player 2 controls
        if (s.isTwoPlayer) {
          if (s.keys.up) s.p2.y = Math.max(0, s.p2.y - s.p2.speed);
          if (s.keys.down) s.p2.y = Math.min(400 - s.p2.height, s.p2.y + s.p2.speed);
        } else {
          // AI Logic
          const targetY = s.ball.y - s.p2.height / 2;
          const aiSpeed = s.difficulty === 'rookie' ? 3.4 : s.difficulty === 'pro' ? 5.2 : 6.8;

          // Only track when ball moving towards AI (or center)
          if (s.ball.vx > 0) {
            if (s.p2.y < targetY - 4) {
              s.p2.y = Math.min(400 - s.p2.height, s.p2.y + aiSpeed);
            } else if (s.p2.y > targetY + 4) {
              s.p2.y = Math.max(0, s.p2.y - aiSpeed);
            }
          }
        }

        // Ball movement
        s.ball.x += s.ball.vx * s.ball.speedMultiplier;
        s.ball.y += s.ball.vy * s.ball.speedMultiplier;

        // Trail record
        s.trail.unshift({ x: s.ball.x, y: s.ball.y });
        if (s.trail.length > 7) s.trail.pop();

        // Top/Bottom wall bounce
        if (s.ball.y - s.ball.radius <= 0) {
          s.ball.y = s.ball.radius;
          s.ball.vy *= -1;
          sounds.playHit();
          createSparks(s.ball.x, 0, '#38bdf8');
        } else if (s.ball.y + s.ball.radius >= 400) {
          s.ball.y = 400 - s.ball.radius;
          s.ball.vy *= -1;
          sounds.playHit();
          createSparks(s.ball.x, 400, '#38bdf8');
        }

        // Paddle 1 Collision (Left)
        const p1X = 25;
        if (
          s.ball.x - s.ball.radius <= p1X + s.p1.width &&
          s.ball.x + s.ball.radius >= p1X &&
          s.ball.y >= s.p1.y &&
          s.ball.y <= s.p1.y + s.p1.height &&
          s.ball.vx < 0
        ) {
          s.ball.x = p1X + s.p1.width + s.ball.radius;
          // Angle based on hit location
          const offset = (s.ball.y - (s.p1.y + s.p1.height / 2)) / (s.p1.height / 2);
          s.ball.vx = Math.abs(s.ball.vx);
          s.ball.vy = offset * 5;
          s.ball.speedMultiplier = Math.min(1.7, s.ball.speedMultiplier + 0.05);
          sounds.playLaser();
          createSparks(p1X + s.p1.width, s.ball.y, '#06b6d4');
        }

        // Paddle 2 Collision (Right)
        const p2X = 475 - s.p2.width;
        if (
          s.ball.x + s.ball.radius >= p2X &&
          s.ball.x - s.ball.radius <= p2X + s.p2.width &&
          s.ball.y >= s.p2.y &&
          s.ball.y <= s.p2.y + s.p2.height &&
          s.ball.vx > 0
        ) {
          s.ball.x = p2X - s.ball.radius;
          const offset = (s.ball.y - (s.p2.y + s.p2.height / 2)) / (s.p2.height / 2);
          s.ball.vx = -Math.abs(s.ball.vx);
          s.ball.vy = offset * 5;
          s.ball.speedMultiplier = Math.min(1.7, s.ball.speedMultiplier + 0.05);
          sounds.playLaser();
          createSparks(p2X, s.ball.y, '#f43f5e');
        }

        // Left Goal (P2 Scores)
        if (s.ball.x < 0) {
          s.p2Score++;
          setP2Score(s.p2Score);
          sounds.playScore();
          if (s.p2Score >= 7) {
            s.winner = s.isTwoPlayer ? 'Player 2 Wins!' : 'Computer AI Wins!';
            setWinner(s.winner);
            sounds.playGameOver();
          } else {
            resetBall(false);
          }
        }

        // Right Goal (P1 Scores)
        if (s.ball.x > 500) {
          s.p1Score++;
          setP1Score(s.p1Score);
          sounds.playScore();
          if (onScoreUpdate) onScoreUpdate(s.p1Score * 100);
          if (s.p1Score >= 7) {
            s.winner = 'Player 1 Wins!';
            setWinner(s.winner);
            sounds.playGameOver();
          } else {
            resetBall(true);
          }
        }
      }

      // Render
      ctx.fillStyle = '#070b14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Center dashed net
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(250, 0);
      ctx.lineTo(250, 400);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center circle
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.beginPath();
      ctx.arc(250, 200, 50, 0, Math.PI * 2);
      ctx.stroke();

      // Draw Ball Trail
      s.trail.forEach((point, i) => {
        const alpha = (1 - i / s.trail.length) * 0.4;
        ctx.fillStyle = `rgba(56, 189, 248, ${alpha})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, s.ball.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Ball
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#38bdf8';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.ball.x, s.ball.y, s.ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Paddle 1 (Cyan)
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#06b6d4';
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.roundRect(25, s.p1.y, s.p1.width, s.p1.height, 4);
      ctx.fill();
      ctx.restore();

      // Paddle 2 (Rose)
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#f43f5e';
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.roundRect(475 - s.p2.width, s.p2.y, s.p2.width, s.p2.height, 4);
      ctx.fill();
      ctx.restore();

      // Particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.04;
        if (p.life <= 0) {
          s.particles.splice(i, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, 2.5, 2.5);
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [resetMatch, resetBall, onScoreUpdate]);

  return (
    <div className="flex flex-col items-center select-none w-full max-w-2xl mx-auto">
      {/* Top HUD */}
      <div className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-t-xl text-xs font-mono">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold">P1:</span>
            <span className="text-lg font-bold text-white tabular-nums">{p1Score}</span>
          </div>
          <span className="text-slate-600 font-bold">vs</span>
          <div className="flex items-center gap-2">
            <span className="text-rose-400 font-bold">{isTwoPlayer ? 'P2:' : 'AI:'}</span>
            <span className="text-lg font-bold text-white tabular-nums">{p2Score}</span>
          </div>
          <span className="text-slate-500 text-[11px]">(First to 7)</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switch */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => {
                setIsTwoPlayer(false);
                resetMatch();
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                !isTwoPlayer ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3 h-3" /> Solo
            </button>
            <button
              onClick={() => {
                setIsTwoPlayer(true);
                resetMatch();
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                isTwoPlayer ? 'bg-rose-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3 h-3" /> 2-Player
            </button>
          </div>

          {!isTwoPlayer && (
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value as 'rookie' | 'pro' | 'master')}
              aria-label="AI Difficulty Level"
              className="bg-slate-800 text-slate-300 border border-slate-700 rounded px-2 py-1 text-xs outline-none"
            >
              <option value="rookie">Easy</option>
              <option value="pro">Pro</option>
              <option value="master">Master</option>
            </select>
          )}

          <button
            onClick={resetMatch}
            className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full aspect-[5/4] bg-slate-950 border-x border-b border-slate-800 overflow-hidden flex items-center justify-center">
        <canvas ref={canvasRef} width={500} height={400} className="w-full h-full block object-contain" />

        {winner && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
            <Trophy className="w-10 h-10 text-amber-400 mb-2" />
            <h3 className="text-2xl font-bold text-white mb-2">{winner}</h3>
            <p className="text-sm text-slate-400 mb-4">Final Score: {p1Score} - {p2Score}</p>
            <button
              onClick={resetMatch}
              className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm rounded-lg shadow-lg transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Play Rematch
            </button>
          </div>
        )}
      </div>

      {/* Mobile Controls */}
      <div className="w-full bg-slate-900 border border-slate-800 rounded-b-xl p-3 flex justify-between items-center md:hidden">
        <div className="flex gap-2">
          <button
            onPointerDown={() => { stateRef.current.keys.w = true; }}
            onPointerUp={() => { stateRef.current.keys.w = false; }}
            className="w-14 h-11 bg-slate-800 active:bg-cyan-600 text-white font-bold rounded flex items-center justify-center"
          >
            ▲
          </button>
          <button
            onPointerDown={() => { stateRef.current.keys.s = true; }}
            onPointerUp={() => { stateRef.current.keys.s = false; }}
            className="w-14 h-11 bg-slate-800 active:bg-cyan-600 text-white font-bold rounded flex items-center justify-center"
          >
            ▼
          </button>
        </div>

        {isTwoPlayer && (
          <div className="flex gap-2">
            <button
              onPointerDown={() => { stateRef.current.keys.up = true; }}
              onPointerUp={() => { stateRef.current.keys.up = false; }}
              className="w-14 h-11 bg-slate-800 active:bg-rose-600 text-white font-bold rounded flex items-center justify-center"
            >
              ▲
            </button>
            <button
              onPointerDown={() => { stateRef.current.keys.down = true; }}
              onPointerUp={() => { stateRef.current.keys.down = false; }}
              className="w-14 h-11 bg-slate-800 active:bg-rose-600 text-white font-bold rounded flex items-center justify-center"
            >
              ▼
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
