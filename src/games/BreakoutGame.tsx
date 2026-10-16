import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sounds } from '../utils/audio';
import { Play, Pause, RotateCcw, Trophy, Heart } from 'lucide-react';

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  hp: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface PowerUp {
  x: number;
  y: number;
  type: 'wide' | 'life' | 'multi';
  vy: number;
}

export const BreakoutGame: React.FC<{ onScoreUpdate?: (score: number) => void }> = ({ onScoreUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('breakout_highscore') || '0', 10);
  });
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const stateRef = useRef({
    paddle: { x: 210, y: 370, w: 80, h: 12, speed: 7, isWide: false, wideTimer: 0 },
    balls: [] as Ball[],
    bricks: [] as Brick[],
    powerUps: [] as PowerUp[],
    particles: [] as Array<{ x: number; y: number; vx: number; vy: number; color: string; life: number }>,
    keys: { left: false, right: false },
    score: 0,
    lives: 3,
    level: 1,
    isGameOver: false,
    isPaused: false,
  });

  const initBricks = useCallback((lvl: number) => {
    const s = stateRef.current;
    const bricks: Brick[] = [];
    const rows = 5 + Math.min(3, lvl - 1);
    const cols = 9;
    const brickW = 46;
    const brickH = 16;
    const pad = 6;
    const startX = (500 - (cols * (brickW + pad) - pad)) / 2;
    const startY = 40;

    const colors = ['#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#a855f7'];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hp = r === 0 && lvl > 1 ? 2 : 1;
        bricks.push({
          x: startX + c * (brickW + pad),
          y: startY + r * (brickH + pad),
          w: brickW,
          h: brickH,
          color: colors[r % colors.length],
          hp,
        });
      }
    }
    s.bricks = bricks;
  }, []);

  const addParticles = (x: number, y: number, color: string) => {
    const s = stateRef.current;
    for (let i = 0; i < 8; i++) {
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

  const resetGame = useCallback(() => {
    const s = stateRef.current;
    s.paddle.x = 210;
    s.paddle.w = 80;
    s.paddle.isWide = false;
    s.balls = [{ x: 250, y: 350, vx: 3.5, vy: -4, radius: 5 }];
    s.powerUps = [];
    s.particles = [];
    s.score = 0;
    s.lives = 3;
    s.level = 1;
    s.isGameOver = false;
    s.isPaused = false;
    setScore(0);
    setLives(3);
    setLevel(1);
    setIsGameOver(false);
    setIsPaused(false);
    initBricks(1);
  }, [initBricks]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        s.keys.left = true;
        e.preventDefault();
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        s.keys.right = true;
        e.preventDefault();
      } else if (e.code === 'KeyP') {
        if (!s.isGameOver) {
          s.isPaused = !s.isPaused;
          setIsPaused(s.isPaused);
          sounds.playClick();
        }
        e.preventDefault();
      } else if (e.code === 'KeyR' && s.isGameOver) {
        resetGame();
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) s.keys.left = false;
      if (['ArrowRight', 'KeyD'].includes(e.code)) s.keys.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [resetGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    resetGame();
    let animId: number;

    const gameLoop = () => {
      const s = stateRef.current;

      if (!s.isGameOver && !s.isPaused) {
        // Move paddle
        if (s.keys.left) s.paddle.x = Math.max(10, s.paddle.x - s.paddle.speed);
        if (s.keys.right) s.paddle.x = Math.min(490 - s.paddle.w, s.paddle.x + s.paddle.speed);

        // Wide paddle timer
        if (s.paddle.isWide) {
          s.paddle.wideTimer--;
          if (s.paddle.wideTimer <= 0) {
            s.paddle.isWide = false;
            s.paddle.w = 80;
          }
        }

        // Move powerups
        for (let pi = s.powerUps.length - 1; pi >= 0; pi--) {
          const pu = s.powerUps[pi];
          pu.y += pu.vy;

          // Catch powerup
          if (
            pu.y >= s.paddle.y &&
            pu.y <= s.paddle.y + s.paddle.h &&
            pu.x >= s.paddle.x &&
            pu.x <= s.paddle.x + s.paddle.w
          ) {
            sounds.playPowerup();
            if (pu.type === 'wide') {
              s.paddle.w = 120;
              s.paddle.isWide = true;
              s.paddle.wideTimer = 450;
            } else if (pu.type === 'life') {
              s.lives++;
              setLives(s.lives);
            } else if (pu.type === 'multi') {
              if (s.balls.length > 0) {
                const b = s.balls[0];
                s.balls.push(
                  { x: b.x, y: b.y, vx: b.vx * 0.9 + 1, vy: -Math.abs(b.vy), radius: 5 },
                  { x: b.x, y: b.y, vx: -b.vx * 0.9 - 1, vy: -Math.abs(b.vy), radius: 5 }
                );
              }
            }
            s.powerUps.splice(pi, 1);
            continue;
          }

          if (pu.y > 410) s.powerUps.splice(pi, 1);
        }

        // Move balls
        for (let bi = s.balls.length - 1; bi >= 0; bi--) {
          const b = s.balls[bi];
          b.x += b.vx;
          b.y += b.vy;

          // Wall bounces
          if (b.x - b.radius <= 0) {
            b.x = b.radius;
            b.vx = Math.abs(b.vx);
            sounds.playHit();
          } else if (b.x + b.radius >= 500) {
            b.x = 500 - b.radius;
            b.vx = -Math.abs(b.vx);
            sounds.playHit();
          }

          if (b.y - b.radius <= 0) {
            b.y = b.radius;
            b.vy = Math.abs(b.vy);
            sounds.playHit();
          }

          // Paddle collision
          if (
            b.y + b.radius >= s.paddle.y &&
            b.y - b.radius <= s.paddle.y + s.paddle.h &&
            b.x >= s.paddle.x &&
            b.x <= s.paddle.x + s.paddle.w &&
            b.vy > 0
          ) {
            const hitOffset = (b.x - (s.paddle.x + s.paddle.w / 2)) / (s.paddle.w / 2);
            b.vy = -Math.abs(b.vy);
            b.vx = hitOffset * 4.5;
            sounds.playLaser();
          }

          // Brick collisions
          for (let bri = s.bricks.length - 1; bri >= 0; bri--) {
            const brick = s.bricks[bri];
            if (
              b.x + b.radius >= brick.x &&
              b.x - b.radius <= brick.x + brick.w &&
              b.y + b.radius >= brick.y &&
              b.y - b.radius <= brick.y + brick.h
            ) {
              b.vy *= -1;
              brick.hp--;
              sounds.playHit();
              addParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color);

              if (brick.hp <= 0) {
                s.bricks.splice(bri, 1);
                s.score += 25;
                setScore(s.score);
                if (onScoreUpdate) onScoreUpdate(s.score);

                // Chance to drop power-up
                if (Math.random() < 0.2) {
                  const types: ('wide' | 'life' | 'multi')[] = ['wide', 'life', 'multi'];
                  s.powerUps.push({
                    x: brick.x + brick.w / 2,
                    y: brick.y,
                    type: types[Math.floor(Math.random() * types.length)],
                    vy: 2.2,
                  });
                }

                if (s.score > highScore) {
                  setHighScore(s.score);
                  localStorage.setItem('breakout_highscore', String(s.score));
                }
              }
              break;
            }
          }

          // Ball drops below bottom
          if (b.y > 410) {
            s.balls.splice(bi, 1);
          }
        }

        // Check if all balls lost
        if (s.balls.length === 0) {
          s.lives--;
          setLives(s.lives);
          sounds.playGameOver();

          if (s.lives <= 0) {
            s.isGameOver = true;
            setIsGameOver(true);
          } else {
            // Respawn 1 ball
            s.balls.push({ x: 250, y: 350, vx: 3.5, vy: -4, radius: 5 });
            s.paddle.x = 210;
          }
        }

        // Check all bricks cleared (level up)
        if (s.bricks.length === 0) {
          sounds.playScore();
          s.level++;
          setLevel(s.level);
          initBricks(s.level);
          s.balls = [{ x: 250, y: 350, vx: 3.5 + s.level * 0.3, vy: -4 - s.level * 0.3, radius: 5 }];
        }
      }

      // Render
      ctx.fillStyle = '#060a14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Bricks
      s.bricks.forEach(br => {
        ctx.save();
        ctx.fillStyle = br.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = br.color;
        ctx.beginPath();
        ctx.roundRect(br.x, br.y, br.w, br.h, 3);
        ctx.fill();

        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(br.x + 2, br.y + 2, br.w - 4, 3);
        ctx.restore();
      });

      // Draw PowerUps
      s.powerUps.forEach(pu => {
        ctx.save();
        const colors = { wide: '#06b6d4', life: '#f43f5e', multi: '#eab308' };
        ctx.fillStyle = colors[pu.type];
        ctx.shadowBlur = 6;
        ctx.shadowColor = colors[pu.type];
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pu.type === 'wide' ? 'W' : pu.type === 'life' ? '+' : 'M', pu.x, pu.y);
        ctx.restore();
      });

      // Draw Paddle
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#3b82f6';
      ctx.fillStyle = s.paddle.isWide ? '#06b6d4' : '#3b82f6';
      ctx.beginPath();
      ctx.roundRect(s.paddle.x, s.paddle.y, s.paddle.w, s.paddle.h, 5);
      ctx.fill();
      ctx.restore();

      // Draw Balls
      s.balls.forEach(b => {
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ffffff';
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Particles
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
          ctx.fillRect(p.x, p.y, 3, 3);
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [resetGame, initBricks, highScore, onScoreUpdate]);

  return (
    <div className="flex flex-col items-center select-none w-full max-w-2xl mx-auto">
      {/* Top HUD */}
      <div className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-t-xl text-xs font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-rose-400">
            <span className="text-slate-400">Score:</span>
            <span className="text-base font-bold tabular-nums">{score}</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400">
            <Trophy className="w-3.5 h-3.5" />
            <span className="text-slate-400">Best:</span>
            <span className="text-base font-bold tabular-nums">{highScore}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-cyan-400 font-bold">Lvl {level}</div>
          <div className="flex items-center gap-1 text-red-400">
            <Heart className="w-3.5 h-3.5 fill-red-400" />
            <span>x{lives}</span>
          </div>

          <button
            onClick={() => {
              const s = stateRef.current;
              if (!s.isGameOver) {
                s.isPaused = !s.isPaused;
                setIsPaused(s.isPaused);
                sounds.playClick();
              }
            }}
            className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            onClick={resetGame}
            className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full aspect-[5/4] bg-slate-950 border-x border-b border-slate-800 overflow-hidden flex items-center justify-center">
        <canvas ref={canvasRef} width={500} height={400} className="w-full h-full block object-contain" />

        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
            <h3 className="text-2xl font-bold text-red-500 mb-1">Paddle Destroyed</h3>
            <p className="text-sm text-slate-400 mb-1">Final Score: {score}</p>
            <p className="text-xs text-slate-500 mb-4">Reached Level {level}</p>
            <button
              onClick={resetGame}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm rounded-lg shadow-lg flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Try Again
            </button>
          </div>
        )}
      </div>

      {/* Mobile Controls */}
      <div className="w-full bg-slate-900 border border-slate-800 rounded-b-xl p-3 flex justify-between items-center md:hidden">
        <button
          onPointerDown={() => { stateRef.current.keys.left = true; }}
          onPointerUp={() => { stateRef.current.keys.left = false; }}
          className="w-24 h-12 bg-slate-800 active:bg-rose-600 text-white rounded-lg flex items-center justify-center font-bold text-xl"
        >
          ◀
        </button>
        <button
          onPointerDown={() => { stateRef.current.keys.right = true; }}
          onPointerUp={() => { stateRef.current.keys.right = false; }}
          className="w-24 h-12 bg-slate-800 active:bg-rose-600 text-white rounded-lg flex items-center justify-center font-bold text-xl"
        >
          ▶
        </button>
      </div>
    </div>
  );
};
