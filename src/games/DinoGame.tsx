import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sounds } from '../utils/audio';
import { RotateCcw, Trophy, Moon, Sun } from 'lucide-react';

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'cactus' | 'bird';
  wingState?: number;
}

export const DinoGame: React.FC<{ onScoreUpdate?: (score: number) => void }> = ({ onScoreUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('dino_highscore') || '0', 10);
  });
  const [isGameOver, setIsGameOver] = useState(false);
  const [isNight, setIsNight] = useState(false);

  const stateRef = useRef({
    dino: {
      x: 50,
      y: 280,
      width: 40,
      height: 44,
      vy: 0,
      gravity: 0.65,
      jumpForce: -11,
      isGrounded: true,
      isDucking: false,
      legStep: 0,
    },
    obstacles: [] as Obstacle[],
    groundOffset: 0,
    speed: 5.5,
    score: 0,
    isGameOver: false,
    nextSpawnDistance: 200,
    isNight: false,
  });

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (s.isGameOver) return;
    if (s.dino.isGrounded && !s.dino.isDucking) {
      s.dino.vy = s.dino.jumpForce;
      s.dino.isGrounded = false;
      sounds.playJump();
    }
  }, []);

  const resetGame = useCallback(() => {
    const s = stateRef.current;
    s.dino.y = 280;
    s.dino.vy = 0;
    s.dino.isGrounded = true;
    s.dino.isDucking = false;
    s.dino.height = 44;
    s.obstacles = [];
    s.groundOffset = 0;
    s.speed = 5.5;
    s.score = 0;
    s.isGameOver = false;
    s.nextSpawnDistance = 250;
    s.isNight = false;
    setScore(0);
    setIsGameOver(false);
    setIsNight(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        if (s.isGameOver) {
          resetGame();
        } else {
          jump();
        }
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        if (s.dino.isGrounded) {
          s.dino.isDucking = true;
          s.dino.height = 26;
          s.dino.y = 298;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (['ArrowDown', 'KeyS'].includes(e.code)) {
        s.dino.isDucking = false;
        s.dino.height = 44;
        s.dino.y = 280;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [jump, resetGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    resetGame();
    let animId: number;
    let frame = 0;

    const gameLoop = () => {
      const s = stateRef.current;
      frame++;

      if (!s.isGameOver) {
        // Distance score
        s.score += 0.2;
        const currentScore = Math.floor(s.score);
        setScore(currentScore);
        if (onScoreUpdate && currentScore % 50 === 0) onScoreUpdate(currentScore);

        // Day/Night shift
        const nightState = Math.floor(currentScore / 500) % 2 === 1;
        if (nightState !== s.isNight) {
          s.isNight = nightState;
          setIsNight(nightState);
        }

        // Ramp speed gradually
        s.speed = Math.min(11, 5.5 + currentScore * 0.004);

        if (currentScore > highScore) {
          setHighScore(currentScore);
          localStorage.setItem('dino_highscore', String(currentScore));
        }

        // Dino physics
        if (!s.dino.isGrounded) {
          s.dino.vy += s.dino.gravity;
          s.dino.y += s.dino.vy;

          if (s.dino.y >= 280) {
            s.dino.y = 280;
            s.dino.vy = 0;
            s.dino.isGrounded = true;
          }
        }

        // Ground scroll
        s.groundOffset = (s.groundOffset + s.speed) % 500;

        // Spawn obstacles
        s.nextSpawnDistance -= s.speed;
        if (s.nextSpawnDistance <= 0) {
          const isBird = currentScore > 350 && Math.random() < 0.35;
          if (isBird) {
            const birdY = Math.random() < 0.5 ? 255 : 225; // low or mid flight
            s.obstacles.push({
              x: 520,
              y: birdY,
              width: 34,
              height: 22,
              type: 'bird',
              wingState: 0,
            });
          } else {
            const isTall = Math.random() < 0.4;
            s.obstacles.push({
              x: 520,
              y: isTall ? 275 : 285,
              width: isTall ? 24 : 18,
              height: isTall ? 45 : 35,
              type: 'cactus',
            });
          }
          s.nextSpawnDistance = Math.floor(Math.random() * 150) + 200;
        }

        // Move obstacles & detect collision
        for (let i = s.obstacles.length - 1; i >= 0; i--) {
          const obs = s.obstacles[i];
          obs.x -= s.speed;

          // AABB collision box with slight margin
          const dinoBox = {
            left: s.dino.x + 6,
            right: s.dino.x + s.dino.width - 6,
            top: s.dino.y + 4,
            bottom: s.dino.y + s.dino.height,
          };

          const obsBox = {
            left: obs.x + 4,
            right: obs.x + obs.width - 4,
            top: obs.y + 4,
            bottom: obs.y + obs.height,
          };

          if (
            dinoBox.right >= obsBox.left &&
            dinoBox.left <= obsBox.right &&
            dinoBox.bottom >= obsBox.top &&
            dinoBox.top <= obsBox.bottom
          ) {
            s.isGameOver = true;
            setIsGameOver(true);
            sounds.playGameOver();
          }

          if (obs.x + obs.width < -20) {
            s.obstacles.splice(i, 1);
          }
        }
      }

      // Render
      const bg = s.isNight ? '#090d16' : '#f8fafc';
      const mainColor = s.isNight ? '#e2e8f0' : '#1e293b';
      const accentColor = s.isNight ? '#38bdf8' : '#0284c7';

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Ground Line
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 324);
      ctx.lineTo(canvas.width, 324);
      ctx.stroke();

      // Ground pebbles
      ctx.fillStyle = mainColor;
      for (let i = 0; i < 20; i++) {
        const px = ((i * 35 - s.groundOffset) % 500 + 500) % 500;
        ctx.fillRect(px, 328 + (i % 3) * 3, 3, 2);
      }

      // Draw Dino
      ctx.save();
      ctx.fillStyle = accentColor;
      const d = s.dino;

      if (!d.isDucking) {
        // Upright T-Rex body
        ctx.beginPath();
        ctx.roundRect(d.x + 10, d.y, 22, 34, 4);
        ctx.fill();

        // Head & snout
        ctx.fillRect(d.x + 16, d.y - 8, 22, 16);
        ctx.fillRect(d.x + 28, d.y - 4, 12, 10);

        // Eye
        ctx.fillStyle = bg;
        ctx.fillRect(d.x + 22, d.y - 4, 3, 3);
        ctx.fillStyle = accentColor;

        // Tail
        ctx.fillRect(d.x, d.y + 14, 12, 8);

        // Running legs
        const step = Math.floor(frame / 6) % 2;
        if (d.isGrounded) {
          if (step === 0) {
            ctx.fillRect(d.x + 14, d.y + 34, 4, 10);
            ctx.fillRect(d.x + 24, d.y + 34, 4, 6);
          } else {
            ctx.fillRect(d.x + 14, d.y + 34, 4, 6);
            ctx.fillRect(d.x + 24, d.y + 34, 4, 10);
          }
        } else {
          ctx.fillRect(d.x + 14, d.y + 34, 4, 8);
          ctx.fillRect(d.x + 24, d.y + 34, 4, 8);
        }
      } else {
        // Ducking T-Rex
        ctx.beginPath();
        ctx.roundRect(d.x, d.y + 4, 40, 18, 3);
        ctx.fill();
        ctx.fillRect(d.x + 30, d.y + 8, 12, 10);

        ctx.fillStyle = bg;
        ctx.fillRect(d.x + 36, d.y + 8, 3, 3);
        ctx.fillStyle = accentColor;

        ctx.fillRect(d.x + 14, d.y + 22, 4, 6);
        ctx.fillRect(d.x + 26, d.y + 22, 4, 6);
      }
      ctx.restore();

      // Draw Obstacles
      s.obstacles.forEach(obs => {
        ctx.save();
        ctx.fillStyle = obs.type === 'cactus' ? '#10b981' : '#f43f5e';

        if (obs.type === 'cactus') {
          // Cactus stem & arms
          ctx.fillRect(obs.x + obs.width / 2 - 3, obs.y, 6, obs.height);
          ctx.fillRect(obs.x, obs.y + 10, 6, 12);
          ctx.fillRect(obs.x + obs.width - 6, obs.y + 6, 6, 14);
          ctx.fillRect(obs.x, obs.y + 18, obs.width, 4);
        } else {
          // Flying bird
          const wingUp = Math.floor(frame / 8) % 2 === 0;
          ctx.fillRect(obs.x + 8, obs.y + 8, 20, 8); // body
          ctx.fillRect(obs.x, obs.y + 6, 8, 6); // beak

          if (wingUp) {
            ctx.fillRect(obs.x + 12, obs.y, 6, 10);
          } else {
            ctx.fillRect(obs.x + 12, obs.y + 14, 6, 10);
          }
        }
        ctx.restore();
      });

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [resetGame, highScore, onScoreUpdate]);

  return (
    <div className="flex flex-col items-center select-none w-full max-w-2xl mx-auto">
      {/* Top HUD */}
      <div className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-t-xl text-xs font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <span className="text-slate-400">Distance:</span>
            <span className="text-base font-bold tabular-nums">{score}m</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400">
            <Trophy className="w-3.5 h-3.5" />
            <span className="text-slate-400">Best:</span>
            <span className="text-base font-bold tabular-nums">{highScore}m</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-slate-400">
            {isNight ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isNight ? 'Nightfall' : 'Daylight'}</span>
          </div>

          <button
            onClick={resetGame}
            className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div
        onClick={jump}
        className="relative w-full aspect-[5/4] border-x border-b border-slate-800 overflow-hidden cursor-pointer"
      >
        <canvas ref={canvasRef} width={500} height={400} className="w-full h-full block object-contain" />

        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
            <h3 className="text-2xl font-bold text-red-500 mb-1">Crashed in Desert</h3>
            <p className="text-sm text-slate-300 mb-4">Distance reached: {score}m</p>
            <button
              onClick={e => {
                e.stopPropagation();
                resetGame();
              }}
              className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm rounded-lg shadow-lg flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Run Again
            </button>
          </div>
        )}
      </div>

      {/* Mobile Controls */}
      <div className="w-full bg-slate-900 border border-slate-800 rounded-b-xl p-3 flex justify-between gap-3 md:hidden">
        <button
          onClick={jump}
          className="flex-1 h-12 bg-cyan-600 active:bg-cyan-500 text-white font-bold rounded-lg text-sm"
        >
          JUMP (SPACE)
        </button>
        <button
          onPointerDown={() => {
            const s = stateRef.current;
            if (s.dino.isGrounded) {
              s.dino.isDucking = true;
              s.dino.height = 26;
              s.dino.y = 298;
            }
          }}
          onPointerUp={() => {
            const s = stateRef.current;
            s.dino.isDucking = false;
            s.dino.height = 44;
            s.dino.y = 280;
          }}
          className="w-28 h-12 bg-slate-800 active:bg-slate-700 text-white font-bold rounded-lg text-sm"
        >
          DUCK
        </button>
      </div>
    </div>
  );
};
