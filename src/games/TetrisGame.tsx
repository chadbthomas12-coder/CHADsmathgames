import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sounds } from '../utils/audio';
import { RotateCcw, Trophy, Play, Pause, Layers } from 'lucide-react';

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 20;

type PieceType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

interface Tetromino {
  type: PieceType;
  color: string;
  matrix: number[][];
}

const SHAPES: Record<PieceType, { color: string; matrix: number[][] }> = {
  I: { color: '#06b6d4', matrix: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
  J: { color: '#3b82f6', matrix: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
  L: { color: '#f97316', matrix: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] },
  O: { color: '#eab308', matrix: [[1, 1], [1, 1]] },
  S: { color: '#22c55e', matrix: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
  T: { color: '#a855f7', matrix: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
  Z: { color: '#ef4444', matrix: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] },
};

export const TetrisGame: React.FC<{ onScoreUpdate?: (score: number) => void }> = ({ onScoreUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const holdCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('tetris_highscore') || '0', 10);
  });
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const stateRef = useRef({
    board: Array.from({ length: ROWS }, () => Array(COLS).fill(0)) as (string | 0)[][],
    currentPiece: null as { x: number; y: number; tetromino: Tetromino } | null,
    nextPiece: null as Tetromino | null,
    holdPiece: null as Tetromino | null,
    canHold: true,
    score: 0,
    lines: 0,
    level: 1,
    dropInterval: 800,
    lastDrop: 0,
    isGameOver: false,
    isPaused: false,
  });

  const getRandomPiece = (): Tetromino => {
    const types: PieceType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
    const type = types[Math.floor(Math.random() * types.length)];
    return {
      type,
      color: SHAPES[type].color,
      matrix: SHAPES[type].matrix.map(row => [...row]),
    };
  };

  const checkCollision = (matrix: number[][], posX: number, posY: number, board: (string | 0)[][]) => {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] !== 0) {
          const newX = posX + c;
          const newY = posY + r;
          if (newX < 0 || newX >= COLS || newY >= ROWS) {
            return true;
          }
          if (newY >= 0 && board[newY][newX] !== 0) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const rotateMatrix = (matrix: number[][], clockwise = true) => {
    const n = matrix.length;
    const result = Array.from({ length: n }, () => Array(n).fill(0));
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (clockwise) {
          result[c][n - 1 - r] = matrix[r][c];
        } else {
          result[n - 1 - c][r] = matrix[r][c];
        }
      }
    }
    return result;
  };

  const getGhostY = () => {
    const s = stateRef.current;
    if (!s.currentPiece) return 0;
    let ghostY = s.currentPiece.y;
    while (!checkCollision(s.currentPiece.tetromino.matrix, s.currentPiece.x, ghostY + 1, s.board)) {
      ghostY++;
    }
    return ghostY;
  };

  const spawnPiece = useCallback(() => {
    const s = stateRef.current;
    if (!s.nextPiece) {
      s.nextPiece = getRandomPiece();
    }
    const piece = s.nextPiece;
    s.nextPiece = getRandomPiece();

    const startX = Math.floor(COLS / 2) - Math.floor(piece.matrix[0].length / 2);
    const startY = 0;

    if (checkCollision(piece.matrix, startX, startY, s.board)) {
      s.isGameOver = true;
      setIsGameOver(true);
      sounds.playGameOver();
      return;
    }

    s.currentPiece = {
      x: startX,
      y: startY,
      tetromino: piece,
    };
    s.canHold = true;
  }, []);

  const resetGame = useCallback(() => {
    const s = stateRef.current;
    s.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    s.score = 0;
    s.lines = 0;
    s.level = 1;
    s.dropInterval = 800;
    s.holdPiece = null;
    s.canHold = true;
    s.isGameOver = false;
    s.isPaused = false;
    s.nextPiece = getRandomPiece();

    setScore(0);
    setLines(0);
    setLevel(1);
    setIsGameOver(false);
    setIsPaused(false);

    spawnPiece();
  }, [spawnPiece]);

  const lockPiece = useCallback(() => {
    const s = stateRef.current;
    if (!s.currentPiece) return;

    const { matrix } = s.currentPiece.tetromino;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] !== 0) {
          const by = s.currentPiece.y + r;
          const bx = s.currentPiece.x + c;
          if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
            s.board[by][bx] = s.currentPiece.tetromino.color;
          }
        }
      }
    }

    sounds.playHit();

    // Check completed lines
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (s.board[r].every(cell => cell !== 0)) {
        s.board.splice(r, 1);
        s.board.unshift(Array(COLS).fill(0));
        cleared++;
        r++; // check same row index again after shift
      }
    }

    if (cleared > 0) {
      sounds.playScore();
      const points = [0, 100, 300, 500, 800][cleared] * s.level;
      s.score += points;
      s.lines += cleared;
      s.level = Math.floor(s.lines / 10) + 1;
      s.dropInterval = Math.max(100, 800 - (s.level - 1) * 70);

      setScore(s.score);
      setLines(s.lines);
      setLevel(s.level);
      if (onScoreUpdate) onScoreUpdate(s.score);

      if (s.score > highScore) {
        setHighScore(s.score);
        localStorage.setItem('tetris_highscore', String(s.score));
      }
    }

    spawnPiece();
  }, [spawnPiece, highScore, onScoreUpdate]);

  const drop = useCallback(() => {
    const s = stateRef.current;
    if (!s.currentPiece || s.isGameOver || s.isPaused) return;

    if (!checkCollision(s.currentPiece.tetromino.matrix, s.currentPiece.x, s.currentPiece.y + 1, s.board)) {
      s.currentPiece.y++;
    } else {
      lockPiece();
    }
  }, [lockPiece]);

  const hardDrop = useCallback(() => {
    const s = stateRef.current;
    if (!s.currentPiece || s.isGameOver || s.isPaused) return;

    const ghostY = getGhostY();
    const droppedDistance = ghostY - s.currentPiece.y;
    s.currentPiece.y = ghostY;
    s.score += droppedDistance * 2;
    setScore(s.score);
    lockPiece();
  }, [lockPiece]);

  const moveSide = (dir: number) => {
    const s = stateRef.current;
    if (!s.currentPiece || s.isGameOver || s.isPaused) return;

    if (!checkCollision(s.currentPiece.tetromino.matrix, s.currentPiece.x + dir, s.currentPiece.y, s.board)) {
      s.currentPiece.x += dir;
    }
  };

  const rotate = (clockwise = true) => {
    const s = stateRef.current;
    if (!s.currentPiece || s.isGameOver || s.isPaused) return;

    const rotated = rotateMatrix(s.currentPiece.tetromino.matrix, clockwise);
    if (!checkCollision(rotated, s.currentPiece.x, s.currentPiece.y, s.board)) {
      s.currentPiece.tetromino.matrix = rotated;
      sounds.playClick();
    } else if (!checkCollision(rotated, s.currentPiece.x - 1, s.currentPiece.y, s.board)) {
      // Wall kick left
      s.currentPiece.x -= 1;
      s.currentPiece.tetromino.matrix = rotated;
      sounds.playClick();
    } else if (!checkCollision(rotated, s.currentPiece.x + 1, s.currentPiece.y, s.board)) {
      // Wall kick right
      s.currentPiece.x += 1;
      s.currentPiece.tetromino.matrix = rotated;
      sounds.playClick();
    }
  };

  const hold = () => {
    const s = stateRef.current;
    if (!s.currentPiece || !s.canHold || s.isGameOver || s.isPaused) return;

    const current = s.currentPiece.tetromino;
    // reset rotation of held piece
    current.matrix = SHAPES[current.type].matrix.map(row => [...row]);

    if (!s.holdPiece) {
      s.holdPiece = current;
      spawnPiece();
    } else {
      const temp = s.holdPiece;
      s.holdPiece = current;
      s.currentPiece = {
        x: Math.floor(COLS / 2) - Math.floor(temp.matrix[0].length / 2),
        y: 0,
        tetromino: temp,
      };
    }
    s.canHold = false;
    sounds.playClick();
  };

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        moveSide(-1);
        e.preventDefault();
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        moveSide(1);
        e.preventDefault();
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        drop();
        e.preventDefault();
      } else if (['ArrowUp', 'KeyX'].includes(e.code)) {
        rotate(true);
        e.preventDefault();
      } else if (e.code === 'KeyZ') {
        rotate(false);
        e.preventDefault();
      } else if (e.code === 'Space') {
        hardDrop();
        e.preventDefault();
      } else if (e.code === 'KeyC') {
        hold();
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drop, hardDrop, resetGame]);

  // Game loop & Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    resetGame();
    let animId: number;

    const gameLoop = (timestamp: number) => {
      const s = stateRef.current;

      // Drop interval tick
      if (!s.isGameOver && !s.isPaused) {
        if (timestamp - s.lastDrop > s.dropInterval) {
          s.lastDrop = timestamp;
          drop();
        }
      }

      // Render Board
      ctx.fillStyle = '#080c16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * BLOCK_SIZE, 0);
        ctx.lineTo(c * BLOCK_SIZE, ROWS * BLOCK_SIZE);
        ctx.stroke();
      }
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * BLOCK_SIZE);
        ctx.lineTo(COLS * BLOCK_SIZE, r * BLOCK_SIZE);
        ctx.stroke();
      }

      // Placed blocks
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const color = s.board[r][c];
          if (color !== 0) {
            ctx.fillStyle = color;
            ctx.fillRect(c * BLOCK_SIZE + 1, r * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(c * BLOCK_SIZE + 2, r * BLOCK_SIZE + 2, BLOCK_SIZE - 4, 3);
          }
        }
      }

      // Ghost piece
      if (s.currentPiece && !s.isGameOver) {
        const ghostY = getGhostY();
        const { matrix, color } = s.currentPiece.tetromino;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([2, 2]);

        for (let r = 0; r < matrix.length; r++) {
          for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c] !== 0) {
              const gx = (s.currentPiece.x + c) * BLOCK_SIZE;
              const gy = (ghostY + r) * BLOCK_SIZE;
              ctx.strokeRect(gx + 1, gy + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
            }
          }
        }
        ctx.restore();

        // Current Falling Piece
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        for (let r = 0; r < matrix.length; r++) {
          for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c] !== 0) {
              const px = (s.currentPiece.x + c) * BLOCK_SIZE;
              const py = (s.currentPiece.y + r) * BLOCK_SIZE;
              ctx.fillRect(px + 1, py + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
            }
          }
        }
        ctx.restore();
      }

      // Render Next piece preview canvas
      if (nextCanvasRef.current && s.nextPiece) {
        const nCtx = nextCanvasRef.current.getContext('2d');
        if (nCtx) {
          nCtx.fillStyle = '#080c16';
          nCtx.fillRect(0, 0, 80, 80);
          const m = s.nextPiece.matrix;
          const sz = 16;
          const offX = (80 - m[0].length * sz) / 2;
          const offY = (80 - m.length * sz) / 2;

          nCtx.fillStyle = s.nextPiece.color;
          for (let r = 0; r < m.length; r++) {
            for (let c = 0; c < m[r].length; c++) {
              if (m[r][c] !== 0) {
                nCtx.fillRect(offX + c * sz + 1, offY + r * sz + 1, sz - 2, sz - 2);
              }
            }
          }
        }
      }

      // Render Hold piece preview canvas
      if (holdCanvasRef.current) {
        const hCtx = holdCanvasRef.current.getContext('2d');
        if (hCtx) {
          hCtx.fillStyle = '#080c16';
          hCtx.fillRect(0, 0, 80, 80);
          if (s.holdPiece) {
            const m = s.holdPiece.matrix;
            const sz = 16;
            const offX = (80 - m[0].length * sz) / 2;
            const offY = (80 - m.length * sz) / 2;

            hCtx.fillStyle = s.canHold ? s.holdPiece.color : '#64748b';
            for (let r = 0; r < m.length; r++) {
              for (let c = 0; c < m[r].length; c++) {
                if (m[r][c] !== 0) {
                  hCtx.fillRect(offX + c * sz + 1, offY + r * sz + 1, sz - 2, sz - 2);
                }
              }
            }
          }
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [resetGame, drop]);

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
          <div className="flex items-center gap-1 text-emerald-400">
            <Layers className="w-3.5 h-3.5" />
            <span>Lines: {lines}</span>
          </div>
          <div className="text-purple-400 font-bold">Lvl {level}</div>

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

      {/* Main Board & Side Panels */}
      <div className="w-full bg-slate-950 border-x border-b border-slate-800 p-4 flex justify-center items-center gap-6">
        {/* Left Side: Hold Box */}
        <div className="hidden sm:flex flex-col items-center gap-2">
          <span className="text-xs font-mono text-slate-400">HOLD (C)</span>
          <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
            <canvas ref={holdCanvasRef} width={80} height={80} />
          </div>
        </div>

        {/* Center Matrix Canvas */}
        <div className="relative border-2 border-slate-800 rounded-md overflow-hidden shadow-2xl">
          <canvas ref={canvasRef} width={COLS * BLOCK_SIZE} height={ROWS * BLOCK_SIZE} className="block" />

          {isGameOver && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
              <h3 className="text-xl font-bold text-red-500 mb-1">Matrix Full</h3>
              <p className="text-xs text-slate-400 mb-1">Score: {score}</p>
              <p className="text-xs text-slate-400 mb-4">Cleared {lines} lines</p>
              <button
                onClick={resetGame}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restart
              </button>
            </div>
          )}

          {isPaused && !isGameOver && (
            <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center">
              <p className="text-sm font-bold text-white mb-2">Paused</p>
              <button
                onClick={() => {
                  stateRef.current.isPaused = false;
                  setIsPaused(false);
                }}
                className="px-3 py-1 bg-slate-800 text-white text-xs rounded"
              >
                Resume
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Next Box */}
        <div className="hidden sm:flex flex-col items-center gap-2">
          <span className="text-xs font-mono text-slate-400">NEXT</span>
          <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center">
            <canvas ref={nextCanvasRef} width={80} height={80} />
          </div>
        </div>
      </div>

      {/* Mobile Controls Bar */}
      <div className="w-full bg-slate-900 border border-slate-800 rounded-b-xl p-2.5 flex justify-between items-center md:hidden gap-1">
        <button onClick={() => moveSide(-1)} className="px-3 py-2 bg-slate-800 text-white rounded text-sm font-bold">
          ◀
        </button>
        <button onClick={() => moveSide(1)} className="px-3 py-2 bg-slate-800 text-white rounded text-sm font-bold">
          ▶
        </button>
        <button onClick={() => rotate(true)} className="px-3 py-2 bg-blue-600 text-white rounded text-xs font-bold">
          Rotate
        </button>
        <button onClick={drop} className="px-3 py-2 bg-slate-800 text-white rounded text-sm font-bold">
          ▼
        </button>
        <button onClick={hardDrop} className="px-3 py-2 bg-amber-600 text-white rounded text-xs font-bold">
          Drop
        </button>
        <button onClick={hold} className="px-3 py-2 bg-purple-600 text-white rounded text-xs font-bold">
          Hold
        </button>
      </div>
    </div>
  );
};
