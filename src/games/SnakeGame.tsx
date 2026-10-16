import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sounds } from '../utils/audio';
import { Play, Pause, RotateCcw, Trophy, Zap } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

export const SnakeGame: React.FC<{ onScoreUpdate?: (score: number) => void }> = ({ onScoreUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('snake_highscore') || '0', 10);
  });
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speedLevel, setSpeedLevel] = useState(1);

  // Game internal state in ref for 60fps loop
  const stateRef = useRef({
    gridSize: 20,
    tileCountX: 25,
    tileCountY: 20,
    snake: [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ] as Point[],
    direction: { x: 1, y: 0 } as Point,
    nextDirection: { x: 1, y: 0 } as Point,
    food: { x: 18, y: 10 } as Point,
    bonusFood: null as { x: number; y: number; timer: number } | null,
    score: 0,
    speed: 110, // ms per tick
    lastTick: 0,
    isGameOver: false,
    isPaused: false,
    particles: [] as Array<{ x: number; y: number; vx: number; vy: number; color: string; life: number }>,
  });

  const spawnFood = useCallback(() => {
    const s = stateRef.current;
    let newX: number;
    let newY: number;
    let collision: boolean;

    do {
      newX = Math.floor(Math.random() * s.tileCountX);
      newY = Math.floor(Math.random() * s.tileCountY);
      collision = s.snake.some(segment => segment.x === newX && segment.y === newY);
    } while (collision);

    s.food = { x: newX, y: newY };

    // 25% chance to spawn bonus gold food
    if (Math.random() < 0.25 && !s.bonusFood) {
      let bX = Math.floor(Math.random() * s.tileCountX);
      let bY = Math.floor(Math.random() * s.tileCountY);
      s.bonusFood = { x: bX, y: bY, timer: 70 };
    }
  }, []);

  const addParticles = (x: number, y: number, color: string, count = 12) => {
    const s = stateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      s.particles.push({
        x: x * s.gridSize + s.gridSize / 2,
        y: y * s.gridSize + s.gridSize / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 1,
      });
    }
  };

  const resetGame = useCallback(() => {
    const s = stateRef.current;
    s.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    s.direction = { x: 1, y: 0 };
    s.nextDirection = { x: 1, y: 0 };
    s.score = 0;
    s.speed = 110;
    s.isGameOver = false;
    s.isPaused = false;
    s.bonusFood = null;
    s.particles = [];
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
    setSpeedLevel(1);
    spawnFood();
  }, [spawnFood]);

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      const { direction, nextDirection } = s;

      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        if (direction.y === 0) s.nextDirection = { x: 0, y: -1 };
        e.preventDefault();
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        if (direction.y === 0) s.nextDirection = { x: 0, y: 1 };
        e.preventDefault();
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        if (direction.x === 0) s.nextDirection = { x: -1, y: 0 };
        e.preventDefault();
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        if (direction.x === 0) s.nextDirection = { x: 1, y: 0 };
        e.preventDefault();
      } else if (e.code === 'KeyP' || e.code === 'Space') {
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetGame]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    resetGame();
    let animId: number;

    const gameLoop = (timestamp: number) => {
      const s = stateRef.current;

      // Update logic at tick rate
      if (!s.isGameOver && !s.isPaused) {
        if (timestamp - s.lastTick > s.speed) {
          s.lastTick = timestamp;
          s.direction = s.nextDirection;

          const head = {
            x: s.snake[0].x + s.direction.x,
            y: s.snake[0].y + s.direction.y,
          };

          // Check wall collision
          if (head.x < 0 || head.x >= s.tileCountX || head.y < 0 || head.y >= s.tileCountY) {
            s.isGameOver = true;
            setIsGameOver(true);
            sounds.playGameOver();
          } else {
            // Check self collision
            const selfCollision = s.snake.some(segment => segment.x === head.x && segment.y === head.y);
            if (selfCollision) {
              s.isGameOver = true;
              setIsGameOver(true);
              sounds.playGameOver();
            } else {
              s.snake.unshift(head);

              // Check food
              if (head.x === s.food.x && head.y === s.food.y) {
                s.score += 10;
                setScore(s.score);
                if (onScoreUpdate) onScoreUpdate(s.score);
                sounds.playScore();
                addParticles(head.x, head.y, '#10b981', 14);

                // Speed progression
                s.speed = Math.max(50, 110 - Math.floor(s.score / 40) * 8);
                setSpeedLevel(Math.min(10, 1 + Math.floor(s.score / 50)));

                if (s.score > highScore) {
                  setHighScore(s.score);
                  localStorage.setItem('snake_highscore', String(s.score));
                }
                spawnFood();
              } else if (s.bonusFood && head.x === s.bonusFood.x && head.y === s.bonusFood.y) {
                s.score += 50;
                setScore(s.score);
                if (onScoreUpdate) onScoreUpdate(s.score);
                sounds.playPowerup();
                addParticles(head.x, head.y, '#f59e0b', 22);
                s.bonusFood = null;
                if (s.score > highScore) {
                  setHighScore(s.score);
                  localStorage.setItem('snake_highscore', String(s.score));
                }
              } else {
                s.snake.pop();
              }

              // Update bonus food lifetime
              if (s.bonusFood) {
                s.bonusFood.timer--;
                if (s.bonusFood.timer <= 0) {
                  s.bonusFood = null;
                }
              }
            }
          }
        }
      }

      // Render
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid background pattern
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= canvas.width; x += s.gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += s.gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Food (glowing green orb)
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#10b981';
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(
        s.food.x * s.gridSize + s.gridSize / 2,
        s.food.y * s.gridSize + s.gridSize / 2,
        s.gridSize / 2 - 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();

      // Bonus Food (pulsing gold orb)
      if (s.bonusFood) {
        ctx.save();
        const pulse = Math.sin(timestamp / 100) * 2;
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#f59e0b';
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(
          s.bonusFood.x * s.gridSize + s.gridSize / 2,
          s.bonusFood.y * s.gridSize + s.gridSize / 2,
          s.gridSize / 2 - 1 + pulse,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      }

      // Draw Snake
      s.snake.forEach((part, index) => {
        ctx.save();
        const isHead = index === 0;
        if (isHead) {
          ctx.fillStyle = '#10b981';
          ctx.shadowBlur = 14;
          ctx.shadowColor = '#10b981';
        } else {
          // Gradient fade down body
          const progress = 1 - index / s.snake.length;
          ctx.fillStyle = `rgba(16, 185, 129, ${Math.max(0.4, progress)})`;
        }

        const radius = isHead ? 4 : 2;
        ctx.beginPath();
        ctx.roundRect(
          part.x * s.gridSize + 1,
          part.y * s.gridSize + 1,
          s.gridSize - 2,
          s.gridSize - 2,
          radius
        );
        ctx.fill();

        // Draw eyes on head
        if (isHead) {
          ctx.fillStyle = '#ffffff';
          const eyeOffset = 4;
          const eyeSize = 3;
          let eye1X = part.x * s.gridSize + eyeOffset;
          let eye1Y = part.y * s.gridSize + eyeOffset;
          let eye2X = part.x * s.gridSize + s.gridSize - eyeOffset - eyeSize;
          let eye2Y = part.y * s.gridSize + eyeOffset;

          if (s.direction.y !== 0) {
            eye1Y = s.direction.y > 0 ? part.y * s.gridSize + s.gridSize - 7 : part.y * s.gridSize + 4;
            eye2Y = eye1Y;
          } else if (s.direction.x !== 0) {
            eye1X = s.direction.x > 0 ? part.x * s.gridSize + s.gridSize - 7 : part.x * s.gridSize + 4;
            eye2X = eye1X;
            eye2Y = part.y * s.gridSize + s.gridSize - eyeOffset - eyeSize;
          }

          ctx.fillRect(eye1X, eye1Y, eyeSize, eyeSize);
          ctx.fillRect(eye2X, eye2Y, eyeSize, eyeSize);
        }
        ctx.restore();
      });

      // Update & draw particles
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;

        if (p.life <= 0) {
          s.particles.splice(i, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [resetGame, spawnFood, highScore, onScoreUpdate]);

  const setTouchDirection = (x: number, y: number) => {
    const s = stateRef.current;
    if (x !== 0 && s.direction.x === 0) s.nextDirection = { x, y: 0 };
    if (y !== 0 && s.direction.y === 0) s.nextDirection = { x: 0, y };
  };

  return (
    <div className="flex flex-col items-center select-none w-full max-w-2xl mx-auto">
      {/* Top HUD */}
      <div className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-t-xl text-xs font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="text-slate-400">Score:</span>
            <span className="text-base font-bold tabular-nums">{score}</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400">
            <Trophy className="w-3.5 h-3.5" />
            <span className="text-slate-400">Best:</span>
            <span className="text-base font-bold tabular-nums">{highScore}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-slate-400">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Speed: {speedLevel}x</span>
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
            title="Pause / Resume"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            onClick={resetGame}
            className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
            title="Restart Game"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative w-full aspect-[5/4] bg-slate-950 border-x border-b border-slate-800 overflow-hidden flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={500}
          height={400}
          className="w-full h-full block object-contain"
        />

        {/* Game Over Screen */}
        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
            <h3 className="text-2xl font-bold text-red-500 mb-1">Game Over</h3>
            <p className="text-sm text-slate-400 mb-4">
              You scored <span className="text-white font-mono font-bold text-base">{score}</span> points
            </p>
            <button
              onClick={resetGame}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-lg shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Play Again
            </button>
          </div>
        )}

        {/* Pause Overlay */}
        {isPaused && !isGameOver && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-center">
            <h3 className="text-xl font-bold text-white mb-2">Game Paused</h3>
            <p className="text-xs text-slate-400 mb-4">Press Space or P to resume</p>
            <button
              onClick={() => {
                stateRef.current.isPaused = false;
                setIsPaused(false);
                sounds.playClick();
              }}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg"
            >
              Resume
            </button>
          </div>
        )}
      </div>

      {/* Mobile Touch Controls */}
      <div className="w-full bg-slate-900 border border-slate-800 rounded-b-xl p-3 flex justify-between items-center md:hidden">
        <span className="text-xs text-slate-400">Touch D-Pad:</span>
        <div className="grid grid-cols-3 gap-1.5 w-36">
          <div />
          <button
            onClick={() => setTouchDirection(0, -1)}
            className="h-10 bg-slate-800 active:bg-emerald-600 text-slate-200 rounded flex items-center justify-center font-bold text-sm"
          >
            ▲
          </button>
          <div />
          <button
            onClick={() => setTouchDirection(-1, 0)}
            className="h-10 bg-slate-800 active:bg-emerald-600 text-slate-200 rounded flex items-center justify-center font-bold text-sm"
          >
            ◀
          </button>
          <button
            onClick={() => setTouchDirection(0, 1)}
            className="h-10 bg-slate-800 active:bg-emerald-600 text-slate-200 rounded flex items-center justify-center font-bold text-sm"
          >
            ▼
          </button>
          <button
            onClick={() => setTouchDirection(1, 0)}
            className="h-10 bg-slate-800 active:bg-emerald-600 text-slate-200 rounded flex items-center justify-center font-bold text-sm"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
};
