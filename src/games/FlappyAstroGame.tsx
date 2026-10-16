import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sounds } from '../utils/audio';
import { Trophy, RotateCcw, Award } from 'lucide-react';

interface Gate {
  x: number;
  topHeight: number;
  bottomHeight: number;
  passed: boolean;
}

export const FlappyAstroGame: React.FC<{ onScoreUpdate?: (score: number) => void }> = ({ onScoreUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('flappy_highscore') || '0', 10);
  });
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const stateRef = useRef({
    hasStarted: false,
    astro: {
      x: 90,
      y: 200,
      vy: 0,
      gravity: 0.38,
      jumpForce: -6.8,
      radius: 14,
      rotation: 0,
    },
    gates: [] as Gate[],
    gateWidth: 50,
    gateGap: 125,
    gateSpeed: 2.3,
    lastGateX: 500,
    score: 0,
    isGameOver: false,
    stars: [] as Array<{ x: number; y: number; s: number; alpha: number }>,
  });

  const initStars = () => {
    const s = [];
    for (let i = 0; i < 60; i++) {
      s.push({
        x: Math.random() * 500,
        y: Math.random() * 400,
        s: Math.random() * 2 + 1,
        alpha: Math.random() * 0.7 + 0.3,
      });
    }
    stateRef.current.stars = s;
  };

  const spawnGate = (xPos: number) => {
    const minHeight = 40;
    const maxHeight = 400 - 125 - minHeight;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight)) + minHeight;
    const bottomHeight = 400 - topHeight - 125;

    stateRef.current.gates.push({
      x: xPos,
      topHeight,
      bottomHeight,
      passed: false,
    });
  };

  const triggerJump = useCallback(() => {
    const s = stateRef.current;
    if (s.isGameOver) return;

    if (!s.hasStarted) {
      s.hasStarted = true;
      setHasStarted(true);
    }

    s.astro.vy = s.astro.jumpForce;
    sounds.playJump();
  }, []);

  const resetGame = useCallback(() => {
    const s = stateRef.current;
    s.hasStarted = false;
    s.isGameOver = false;
    s.astro.x = 90;
    s.astro.y = 200;
    s.astro.vy = 0;
    s.astro.rotation = 0;
    s.gates = [];
    s.score = 0;
    setScore(0);
    setIsGameOver(false);
    setHasStarted(false);
    initStars();

    // Spawn first 3 gates
    spawnGate(400);
    spawnGate(620);
    spawnGate(840);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (stateRef.current.isGameOver) {
          resetGame();
        } else {
          triggerJump();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerJump, resetGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    resetGame();
    let animId: number;

    const gameLoop = () => {
      const s = stateRef.current;

      if (s.hasStarted && !s.isGameOver) {
        // Physics update
        s.astro.vy += s.astro.gravity;
        s.astro.y += s.astro.vy;
        s.astro.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 5, (s.astro.vy * 4 * Math.PI) / 180));

        // Floor / ceiling collision
        if (s.astro.y + s.astro.radius >= 400 || s.astro.y - s.astro.radius <= 0) {
          s.isGameOver = true;
          setIsGameOver(true);
          sounds.playGameOver();
        }

        // Gates update
        for (let i = s.gates.length - 1; i >= 0; i--) {
          const g = s.gates[i];
          g.x -= s.gateSpeed;

          // Gate passing check
          if (!g.passed && g.x + s.gateWidth < s.astro.x) {
            g.passed = true;
            s.score += 1;
            setScore(s.score);
            if (onScoreUpdate) onScoreUpdate(s.score);
            sounds.playScore();

            if (s.score > highScore) {
              setHighScore(s.score);
              localStorage.setItem('flappy_highscore', String(s.score));
            }
          }

          // Gate collision check (AABB with circle)
          const astroLeft = s.astro.x - s.astro.radius + 3;
          const astroRight = s.astro.x + s.astro.radius - 3;
          const astroTop = s.astro.y - s.astro.radius + 3;
          const astroBottom = s.astro.y + s.astro.radius - 3;

          const inGateX = astroRight >= g.x && astroLeft <= g.x + s.gateWidth;
          const hitTop = astroTop <= g.topHeight;
          const hitBottom = astroBottom >= 400 - g.bottomHeight;

          if (inGateX && (hitTop || hitBottom)) {
            s.isGameOver = true;
            setIsGameOver(true);
            sounds.playGameOver();
          }

          // Remove offscreen gates & spawn new ones
          if (g.x + s.gateWidth < -20) {
            s.gates.splice(i, 1);
            const furthestGateX = Math.max(...s.gates.map(gate => gate.x), 350);
            spawnGate(furthestGateX + 220);
          }
        }
      }

      // Draw background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 400);
      bgGrad.addColorStop(0, '#0a091e');
      bgGrad.addColorStop(1, '#1b1233');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw background stars
      s.stars.forEach(star => {
        if (s.hasStarted && !s.isGameOver) {
          star.x -= 0.5;
          if (star.x < 0) star.x = 500;
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.fillRect(star.x, star.y, star.s, star.s);
      });

      // Draw Gates
      s.gates.forEach(g => {
        // Top gate
        const topGrad = ctx.createLinearGradient(g.x, 0, g.x + s.gateWidth, 0);
        topGrad.addColorStop(0, '#f59e0b');
        topGrad.addColorStop(1, '#ea580c');
        ctx.fillStyle = topGrad;
        ctx.fillRect(g.x, 0, s.gateWidth, g.topHeight);

        // Gate glowing rim
        ctx.fillStyle = '#fde047';
        ctx.fillRect(g.x - 3, g.topHeight - 12, s.gateWidth + 6, 12);

        // Bottom gate
        ctx.fillStyle = topGrad;
        ctx.fillRect(g.x, 400 - g.bottomHeight, s.gateWidth, g.bottomHeight);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(g.x - 3, 400 - g.bottomHeight, s.gateWidth + 6, 12);
      });

      // Draw Astro Player
      ctx.save();
      ctx.translate(s.astro.x, s.astro.y);
      ctx.rotate(s.astro.rotation);

      // Cosmonaut Helmet
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, s.astro.radius, 0, Math.PI * 2);
      ctx.fill();

      // Visor
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(4, 0, s.astro.radius * 0.6, -Math.PI / 2, Math.PI / 2);
      ctx.fill();

      // Visor highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(5, -4, 3, 4);

      // Jetpack Thruster
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-s.astro.radius - 4, -6, 6, 12);

      // Thrust Flame if flapping or playing
      if (s.hasStarted && !s.isGameOver && s.astro.vy < 1) {
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(-s.astro.radius - 4, -3);
        ctx.lineTo(-s.astro.radius - 12 - Math.random() * 6, 0);
        ctx.lineTo(-s.astro.radius - 4, 3);
        ctx.fill();
      }

      ctx.restore();

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [resetGame, highScore, onScoreUpdate]);

  const getMedal = (pts: number) => {
    if (pts >= 50) return { name: 'Gold Astro', color: 'text-amber-400' };
    if (pts >= 25) return { name: 'Silver Astro', color: 'text-slate-300' };
    if (pts >= 10) return { name: 'Bronze Astro', color: 'text-amber-600' };
    return null;
  };

  const medal = getMedal(score);

  return (
    <div className="flex flex-col items-center select-none w-full max-w-2xl mx-auto">
      {/* Top HUD */}
      <div className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-t-xl text-xs font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-amber-400">
            <span className="text-slate-400">Score:</span>
            <span className="text-base font-bold tabular-nums">{score}</span>
          </div>
          <div className="flex items-center gap-1.5 text-orange-400">
            <Trophy className="w-3.5 h-3.5" />
            <span className="text-slate-400">Best:</span>
            <span className="text-base font-bold tabular-nums">{highScore}</span>
          </div>
        </div>

        {medal && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${medal.color}`}>
            <Award className="w-3.5 h-3.5" />
            <span>{medal.name}</span>
          </div>
        )}

        <button
          onClick={resetGame}
          className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Canvas Viewport */}
      <div
        onClick={triggerJump}
        className="relative w-full aspect-[5/4] bg-slate-950 border-x border-b border-slate-800 overflow-hidden cursor-pointer"
      >
        <canvas ref={canvasRef} width={500} height={400} className="w-full h-full block object-contain" />

        {/* Start Hint */}
        {!hasStarted && !isGameOver && (
          <div className="absolute inset-0 bg-slate-950/40 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Ready for Launch</h3>
            <p className="text-sm text-amber-300 font-medium">Click, Tap, or Press Space to Thrust Up</p>
          </div>
        )}

        {/* Game Over Modal */}
        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
            <h3 className="text-2xl font-bold text-red-500 mb-1">Orbit Terminated</h3>
            <p className="text-sm text-slate-300 mb-1">
              Score: <span className="text-white font-mono font-bold text-base">{score}</span>
            </p>
            <p className="text-xs text-slate-400 mb-4">
              Best Record: <span className="font-mono text-amber-400 font-bold">{highScore}</span>
            </p>
            {medal && (
              <div className={`flex items-center gap-1.5 text-xs font-bold mb-4 ${medal.color}`}>
                <Award className="w-4 h-4" /> Unlocked {medal.name}
              </div>
            )}
            <button
              onClick={e => {
                e.stopPropagation();
                resetGame();
              }}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-lg shadow-lg hover:shadow-amber-500/20 transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Try Again
            </button>
          </div>
        )}
      </div>

      {/* Mobile Thrust Button */}
      <div className="w-full bg-slate-900 border border-slate-800 rounded-b-xl p-3 flex justify-center md:hidden">
        <button
          onClick={triggerJump}
          className="w-full h-12 bg-amber-500 active:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm shadow-md"
        >
          TAP TO THRUST
        </button>
      </div>
    </div>
  );
};
