import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sounds } from '../utils/audio';
import { Play, Pause, RotateCcw, Trophy, Shield, Zap } from 'lucide-react';

interface Bullet {
  x: number;
  y: number;
  vy: number;
  isEnemy?: boolean;
}

interface Enemy {
  x: number;
  y: number;
  type: number;
  hp: number;
  width: number;
  height: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

export const SpaceDefenderGame: React.FC<{ onScoreUpdate?: (score: number) => void }> = ({ onScoreUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('space_highscore') || '0', 10);
  });
  const [wave, setWave] = useState(1);
  const [lives, setLives] = useState(3);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const stateRef = useRef({
    player: {
      x: 250,
      y: 360,
      width: 32,
      height: 24,
      speed: 5.5,
      movingLeft: false,
      movingRight: false,
      shooting: false,
      lastShot: 0,
      shieldTime: 0,
    },
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    enemyDirection: 1,
    enemyStepDown: false,
    enemySpeed: 1,
    lastEnemyShot: 0,
    particles: [] as Particle[],
    stars: [] as Array<{ x: number; y: number; speed: number; size: number }>,
    score: 0,
    wave: 1,
    lives: 3,
    isGameOver: false,
    isPaused: false,
  });

  const initStars = () => {
    const stars = [];
    for (let i = 0; i < 75; i++) {
      stars.push({
        x: Math.random() * 500,
        y: Math.random() * 400,
        speed: Math.random() * 1.5 + 0.3,
        size: Math.random() * 1.5 + 0.5,
      });
    }
    stateRef.current.stars = stars;
  };

  const spawnEnemies = useCallback((waveNum: number) => {
    const s = stateRef.current;
    const enemies: Enemy[] = [];
    const rows = Math.min(5, 3 + Math.floor(waveNum / 2));
    const cols = 8;
    const spacingX = 42;
    const spacingY = 30;
    const startX = (500 - (cols - 1) * spacingX) / 2;
    const startY = 40;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        enemies.push({
          x: startX + c * spacingX,
          y: startY + r * spacingY,
          type: r % 3,
          hp: r === 0 ? 2 : 1,
          width: 24,
          height: 18,
        });
      }
    }
    s.enemies = enemies;
    s.enemyDirection = 1;
    s.enemySpeed = 0.8 + waveNum * 0.2;
  }, []);

  const createExplosion = (x: number, y: number, color: string, count = 15) => {
    const s = stateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 0.5;
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
    s.player.x = 234;
    s.player.y = 360;
    s.player.movingLeft = false;
    s.player.movingRight = false;
    s.player.shooting = false;
    s.player.shieldTime = 120; // 2s spawn invulnerability
    s.bullets = [];
    s.particles = [];
    s.score = 0;
    s.wave = 1;
    s.lives = 3;
    s.isGameOver = false;
    s.isPaused = false;
    setScore(0);
    setWave(1);
    setLives(3);
    setIsGameOver(false);
    setIsPaused(false);
    initStars();
    spawnEnemies(1);
  }, [spawnEnemies]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        s.player.movingLeft = true;
        e.preventDefault();
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        s.player.movingRight = true;
        e.preventDefault();
      } else if (e.code === 'Space') {
        s.player.shooting = true;
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
      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        s.player.movingLeft = false;
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        s.player.movingRight = false;
      } else if (e.code === 'Space') {
        s.player.shooting = false;
      }
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

    const gameLoop = (timestamp: number) => {
      const s = stateRef.current;

      if (!s.isGameOver && !s.isPaused) {
        // Player shield countdown
        if (s.player.shieldTime > 0) s.player.shieldTime--;

        // Move Player
        if (s.player.movingLeft && s.player.x > 15) {
          s.player.x -= s.player.speed;
        }
        if (s.player.movingRight && s.player.x < 500 - s.player.width - 15) {
          s.player.x += s.player.speed;
        }

        // Fire bullets
        if (s.player.shooting && timestamp - s.player.lastShot > 220) {
          s.player.lastShot = timestamp;
          sounds.playLaser();
          s.bullets.push({
            x: s.player.x + s.player.width / 2,
            y: s.player.y - 4,
            vy: -7,
            isEnemy: false,
          });
        }

        // Move bullets
        for (let i = s.bullets.length - 1; i >= 0; i--) {
          const b = s.bullets[i];
          b.y += b.vy;
          if (b.y < -10 || b.y > 410) {
            s.bullets.splice(i, 1);
          }
        }

        // Enemy movement
        let hitWall = false;
        let lowestY = 0;
        s.enemies.forEach(e => {
          e.x += s.enemyDirection * s.enemySpeed;
          if (e.x <= 10 || e.x + e.width >= 490) {
            hitWall = true;
          }
          if (e.y + e.height > lowestY) {
            lowestY = e.y + e.height;
          }
        });

        if (hitWall) {
          s.enemyDirection *= -1;
          s.enemies.forEach(e => {
            e.y += 12;
          });
        }

        // Check if enemies reached bottom
        if (lowestY >= s.player.y) {
          s.isGameOver = true;
          setIsGameOver(true);
          sounds.playGameOver();
        }

        // Enemy firing
        if (s.enemies.length > 0 && timestamp - s.lastEnemyShot > Math.max(700, 1500 - s.wave * 120)) {
          s.lastEnemyShot = timestamp;
          const randomEnemy = s.enemies[Math.floor(Math.random() * s.enemies.length)];
          s.bullets.push({
            x: randomEnemy.x + randomEnemy.width / 2,
            y: randomEnemy.y + randomEnemy.height,
            vy: 3.5,
            isEnemy: true,
          });
        }

        // Bullet vs Enemy collision
        for (let bi = s.bullets.length - 1; bi >= 0; bi--) {
          const b = s.bullets[bi];
          if (!b.isEnemy) {
            for (let ei = s.enemies.length - 1; ei >= 0; ei--) {
              const enemy = s.enemies[ei];
              if (
                b.x >= enemy.x &&
                b.x <= enemy.x + enemy.width &&
                b.y >= enemy.y &&
                b.y <= enemy.y + enemy.height
              ) {
                // Hit enemy
                enemy.hp--;
                s.bullets.splice(bi, 1);
                createExplosion(b.x, b.y, '#38bdf8', 6);

                if (enemy.hp <= 0) {
                  s.enemies.splice(ei, 1);
                  createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#a855f7', 16);
                  sounds.playHit();
                  s.score += (enemy.type + 1) * 20;
                  setScore(s.score);
                  if (onScoreUpdate) onScoreUpdate(s.score);

                  if (s.score > highScore) {
                    setHighScore(s.score);
                    localStorage.setItem('space_highscore', String(s.score));
                  }
                }
                break;
              }
            }
          } else {
            // Enemy bullet vs Player collision
            if (
              s.player.shieldTime <= 0 &&
              b.x >= s.player.x &&
              b.x <= s.player.x + s.player.width &&
              b.y >= s.player.y &&
              b.y <= s.player.y + s.player.height
            ) {
              s.bullets.splice(bi, 1);
              createExplosion(s.player.x + s.player.width / 2, s.player.y + s.player.height / 2, '#ef4444', 20);
              sounds.playExplosion();
              s.lives--;
              setLives(s.lives);
              s.player.shieldTime = 120; // 2 sec shield after hit

              if (s.lives <= 0) {
                s.isGameOver = true;
                setIsGameOver(true);
                sounds.playGameOver();
              }
            }
          }
        }

        // Check wave complete
        if (s.enemies.length === 0) {
          sounds.playScore();
          s.wave++;
          setWave(s.wave);
          spawnEnemies(s.wave);
        }
      }

      // Render
      ctx.fillStyle = '#060814';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Starfield
      s.stars.forEach(star => {
        if (!s.isGameOver && !s.isPaused) {
          star.y += star.speed;
          if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
          }
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });

      // Draw Enemies
      s.enemies.forEach(e => {
        ctx.save();
        if (e.type === 0) {
          ctx.fillStyle = '#ec4899'; // Pink drone
        } else if (e.type === 1) {
          ctx.fillStyle = '#a855f7'; // Purple cruiser
        } else {
          ctx.fillStyle = '#38bdf8'; // Cyan interceptor
        }

        ctx.shadowBlur = 8;
        ctx.shadowColor = ctx.fillStyle;

        // Draw alien ship shape
        ctx.beginPath();
        ctx.moveTo(e.x + e.width / 2, e.y + e.height);
        ctx.lineTo(e.x + e.width, e.y);
        ctx.lineTo(e.x + e.width / 2, e.y + 5);
        ctx.lineTo(e.x, e.y);
        ctx.closePath();
        ctx.fill();

        // Eye / cockpit
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(e.x + e.width / 2 - 2, e.y + 4, 4, 4);
        ctx.restore();
      });

      // Draw Bullets
      s.bullets.forEach(b => {
        ctx.save();
        if (b.isEnemy) {
          ctx.fillStyle = '#ef4444';
          ctx.shadowBlur = 6;
          ctx.shadowColor = '#ef4444';
          ctx.fillRect(b.x - 2, b.y, 4, 8);
        } else {
          ctx.fillStyle = '#38bdf8';
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#38bdf8';
          ctx.fillRect(b.x - 2, b.y, 4, 10);
        }
        ctx.restore();
      });

      // Draw Player Ship
      if (!s.isGameOver) {
        ctx.save();
        // Shield pulse
        if (s.player.shieldTime > 0) {
          ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + Math.sin(timestamp / 50) * 0.3})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(
            s.player.x + s.player.width / 2,
            s.player.y + s.player.height / 2,
            s.player.width * 0.8,
            0,
            Math.PI * 2
          );
          ctx.stroke();
        }

        ctx.fillStyle = '#10b981';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#10b981';

        // Triangular spaceship
        ctx.beginPath();
        ctx.moveTo(s.player.x + s.player.width / 2, s.player.y);
        ctx.lineTo(s.player.x + s.player.width, s.player.y + s.player.height);
        ctx.lineTo(s.player.x + s.player.width / 2, s.player.y + s.player.height - 4);
        ctx.lineTo(s.player.x, s.player.y + s.player.height);
        ctx.closePath();
        ctx.fill();

        // Engine glow
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(s.player.x + s.player.width / 2 - 3, s.player.y + s.player.height - 2, 6, 4);
        ctx.restore();
      }

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
  }, [resetGame, highScore, onScoreUpdate]);

  return (
    <div className="flex flex-col items-center select-none w-full max-w-2xl mx-auto">
      {/* Top HUD */}
      <div className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-t-xl text-xs font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-cyan-400">
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
          <div className="flex items-center gap-1 text-purple-400">
            <Zap className="w-3.5 h-3.5" />
            <span>Wave {wave}</span>
          </div>

          <div className="flex items-center gap-1 text-red-400">
            <Shield className="w-3.5 h-3.5" />
            <span>Lives: {lives}</span>
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
            <h3 className="text-2xl font-bold text-red-500 mb-1">Defense Fleet Fallen</h3>
            <p className="text-sm text-slate-400 mb-1">
              Final Score: <span className="text-white font-mono font-bold text-base">{score}</span>
            </p>
            <p className="text-xs text-slate-500 mb-4">Reached Wave {wave}</p>
            <button
              onClick={resetGame}
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium text-sm rounded-lg shadow-lg hover:shadow-violet-500/20 transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Deploy Interceptor
            </button>
          </div>
        )}

        {isPaused && !isGameOver && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-center">
            <h3 className="text-xl font-bold text-white mb-2">Simulation Paused</h3>
            <p className="text-xs text-slate-400 mb-4">Press P or Resume to continue</p>
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

      {/* Mobile Controls */}
      <div className="w-full bg-slate-900 border border-slate-800 rounded-b-xl p-3 flex justify-between items-center md:hidden">
        <div className="flex gap-2">
          <button
            onPointerDown={() => { stateRef.current.player.movingLeft = true; }}
            onPointerUp={() => { stateRef.current.player.movingLeft = false; }}
            onPointerLeave={() => { stateRef.current.player.movingLeft = false; }}
            className="w-16 h-12 bg-slate-800 active:bg-cyan-600 text-white rounded-lg flex items-center justify-center font-bold text-lg"
          >
            ◀
          </button>
          <button
            onPointerDown={() => { stateRef.current.player.movingRight = true; }}
            onPointerUp={() => { stateRef.current.player.movingRight = false; }}
            onPointerLeave={() => { stateRef.current.player.movingRight = false; }}
            className="w-16 h-12 bg-slate-800 active:bg-cyan-600 text-white rounded-lg flex items-center justify-center font-bold text-lg"
          >
            ▶
          </button>
        </div>

        <button
          onPointerDown={() => {
            const s = stateRef.current;
            s.player.shooting = true;
          }}
          onPointerUp={() => {
            stateRef.current.player.shooting = false;
          }}
          onPointerLeave={() => {
            stateRef.current.player.shooting = false;
          }}
          className="px-8 h-12 bg-violet-600 active:bg-violet-500 text-white rounded-lg font-bold text-sm tracking-wide shadow-md"
        >
          FIRE
        </button>
      </div>
    </div>
  );
};
