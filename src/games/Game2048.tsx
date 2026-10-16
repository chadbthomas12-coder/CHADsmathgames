import React, { useState, useEffect, useCallback, useRef } from 'react';
import { sounds } from '../utils/audio';
import { RotateCcw, Trophy, Undo2, Award } from 'lucide-react';

const SIZE = 4;

type Grid = number[][];

export const Game2048: React.FC<{ onScoreUpdate?: (score: number) => void }> = ({ onScoreUpdate }) => {
  const [grid, setGrid] = useState<Grid>(() => Array.from({ length: SIZE }, () => Array(SIZE).fill(0)));
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('2048_highscore') || '0', 10);
  });
  const [previousState, setPreviousState] = useState<{ grid: Grid; score: number } | null>(null);
  const [isWon, setIsWon] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [continuePlaying, setContinuePlaying] = useState(false);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const getEmptyCells = (currentGrid: Grid) => {
    const cells: { r: number; c: number }[] = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (currentGrid[r][c] === 0) cells.push({ r, c });
      }
    }
    return cells;
  };

  const addRandomTile = (currentGrid: Grid): Grid => {
    const empty = getEmptyCells(currentGrid);
    if (empty.length === 0) return currentGrid;

    const randomCell = empty[Math.floor(Math.random() * empty.length)];
    const val = Math.random() < 0.9 ? 2 : 4;
    const newGrid = currentGrid.map(row => [...row]);
    newGrid[randomCell.r][randomCell.c] = val;
    return newGrid;
  };

  const checkGameOver = (currentGrid: Grid) => {
    if (getEmptyCells(currentGrid).length > 0) return false;

    // Check adjacent matches
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const val = currentGrid[r][c];
        if (r < SIZE - 1 && currentGrid[r + 1][c] === val) return false;
        if (c < SIZE - 1 && currentGrid[r][c + 1] === val) return false;
      }
    }
    return true;
  };

  const resetGame = useCallback(() => {
    let newGrid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    newGrid = addRandomTile(newGrid);
    newGrid = addRandomTile(newGrid);
    setGrid(newGrid);
    setScore(0);
    setPreviousState(null);
    setIsWon(false);
    setIsGameOver(false);
    setContinuePlaying(false);
  }, []);

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  const slideRow = (row: number[]) => {
    let arr = row.filter(val => val !== 0);
    let points = 0;

    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        points += arr[i];
        arr[i + 1] = 0;
      }
    }

    arr = arr.filter(val => val !== 0);
    while (arr.length < SIZE) {
      arr.push(0);
    }

    return { row: arr, points };
  };

  const move = useCallback(
    (direction: 'left' | 'right' | 'up' | 'down') => {
      if (isGameOver) return;

      let moved = false;
      let addedScore = 0;
      let newGrid = grid.map(row => [...row]);

      setPreviousState({ grid: grid.map(r => [...r]), score });

      if (direction === 'left') {
        for (let r = 0; r < SIZE; r++) {
          const { row, points } = slideRow(newGrid[r]);
          if (row.some((val, idx) => val !== newGrid[r][idx])) moved = true;
          newGrid[r] = row;
          addedScore += points;
        }
      } else if (direction === 'right') {
        for (let r = 0; r < SIZE; r++) {
          const reversed = [...newGrid[r]].reverse();
          const { row, points } = slideRow(reversed);
          const finalRow = row.reverse();
          if (finalRow.some((val, idx) => val !== newGrid[r][idx])) moved = true;
          newGrid[r] = finalRow;
          addedScore += points;
        }
      } else if (direction === 'up') {
        for (let c = 0; c < SIZE; c++) {
          const col = [newGrid[0][c], newGrid[1][c], newGrid[2][c], newGrid[3][c]];
          const { row, points } = slideRow(col);
          for (let r = 0; r < SIZE; r++) {
            if (newGrid[r][c] !== row[r]) moved = true;
            newGrid[r][c] = row[r];
          }
          addedScore += points;
        }
      } else if (direction === 'down') {
        for (let c = 0; c < SIZE; c++) {
          const col = [newGrid[3][c], newGrid[2][c], newGrid[1][c], newGrid[0][c]];
          const { row, points } = slideRow(col);
          const finalCol = row.reverse();
          for (let r = 0; r < SIZE; r++) {
            if (newGrid[r][c] !== finalCol[r]) moved = true;
            newGrid[r][c] = finalCol[r];
          }
          addedScore += points;
        }
      }

      if (moved) {
        newGrid = addRandomTile(newGrid);
        const nextScore = score + addedScore;
        setGrid(newGrid);
        setScore(nextScore);
        if (onScoreUpdate) onScoreUpdate(nextScore);

        if (addedScore > 0) {
          sounds.playScore();
        } else {
          sounds.playClick();
        }

        if (nextScore > highScore) {
          setHighScore(nextScore);
          localStorage.setItem('2048_highscore', String(nextScore));
        }

        // Check 2048 win
        if (!continuePlaying && !isWon) {
          const has2048 = newGrid.some(row => row.some(val => val === 2048));
          if (has2048) {
            setIsWon(true);
            sounds.playPowerup();
          }
        }

        // Check game over
        if (checkGameOver(newGrid)) {
          setIsGameOver(true);
          sounds.playGameOver();
        }
      }
    },
    [grid, score, highScore, isGameOver, continuePlaying, isWon, onScoreUpdate]
  );

  const undo = () => {
    if (previousState) {
      setGrid(previousState.grid);
      setScore(previousState.score);
      setPreviousState(null);
      setIsGameOver(false);
      sounds.playClick();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        move('left');
        e.preventDefault();
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        move('right');
        e.preventDefault();
      } else if (['ArrowUp', 'KeyW'].includes(e.code)) {
        move('up');
        e.preventDefault();
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        move('down');
        e.preventDefault();
      } else if (e.code === 'KeyU') {
        undo();
        e.preventDefault();
      } else if (e.code === 'KeyR' && isGameOver) {
        resetGame();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move, isGameOver, resetGame]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) > 30) {
      if (absX > absY) {
        move(dx > 0 ? 'right' : 'left');
      } else {
        move(dy > 0 ? 'down' : 'up');
      }
    }
    touchStartRef.current = null;
  };

  const getTileStyles = (val: number) => {
    switch (val) {
      case 2:
        return 'bg-slate-800 text-slate-100 shadow-sm';
      case 4:
        return 'bg-slate-700 text-slate-100 shadow-sm';
      case 8:
        return 'bg-amber-600 text-white font-bold shadow-md shadow-amber-600/20';
      case 16:
        return 'bg-orange-600 text-white font-bold shadow-md shadow-orange-600/20';
      case 32:
        return 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/20';
      case 64:
        return 'bg-red-600 text-white font-bold shadow-md shadow-red-600/20';
      case 128:
        return 'bg-yellow-500 text-slate-950 font-extrabold shadow-lg shadow-yellow-500/30';
      case 256:
        return 'bg-yellow-400 text-slate-950 font-extrabold shadow-lg shadow-yellow-400/30';
      case 512:
        return 'bg-emerald-500 text-slate-950 font-extrabold shadow-lg shadow-emerald-500/30';
      case 1024:
        return 'bg-cyan-400 text-slate-950 font-black shadow-xl shadow-cyan-400/40 text-xl';
      case 2048:
        return 'bg-gradient-to-r from-amber-400 to-rose-500 text-white font-black shadow-2xl text-xl animate-pulse';
      default:
        return val > 2048
          ? 'bg-purple-600 text-white font-black shadow-2xl text-lg'
          : 'bg-slate-900/60 text-transparent';
    }
  };

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

        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={!previousState}
            className="flex items-center gap-1 px-2.5 py-1 text-slate-300 hover:text-white disabled:opacity-40 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" /> Undo
          </button>

          <button
            onClick={resetGame}
            className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2048 Grid Board */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative w-full aspect-[5/4] bg-slate-950 border-x border-b border-slate-800 p-6 flex items-center justify-center"
      >
        <div className="grid grid-cols-4 gap-3 bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-[360px] aspect-square">
          {grid.map((row, r) =>
            row.map((val, c) => (
              <div
                key={`${r}-${c}`}
                className={`flex items-center justify-center rounded-xl text-2xl font-bold font-mono transition-transform duration-100 ${getTileStyles(
                  val
                )}`}
              >
                {val > 0 ? val : ''}
              </div>
            ))
          )}
        </div>

        {/* 2048 Win Modal */}
        {isWon && !continuePlaying && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
            <Award className="w-12 h-12 text-amber-400 mb-2 animate-bounce" />
            <h3 className="text-3xl font-black text-amber-400 mb-1">2048 Reached!</h3>
            <p className="text-sm text-slate-300 mb-4">Incredible mastery of the numeric grid.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setContinuePlaying(true)}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-lg"
              >
                Keep Playing
              </button>
              <button
                onClick={resetGame}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-lg"
              >
                New Game
              </button>
            </div>
          </div>
        )}

        {/* Game Over Modal */}
        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
            <h3 className="text-2xl font-bold text-red-500 mb-1">No Moves Left</h3>
            <p className="text-sm text-slate-400 mb-4">Final Score: {score}</p>
            <button
              onClick={resetGame}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm rounded-lg shadow-lg flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Try Again
            </button>
          </div>
        )}
      </div>

      {/* On-screen Directional Controls */}
      <div className="w-full bg-slate-900 border border-slate-800 rounded-b-xl p-3 flex justify-center items-center">
        <div className="grid grid-cols-3 gap-2 w-44">
          <div />
          <button
            onClick={() => move('up')}
            className="h-10 bg-slate-800 active:bg-amber-600 text-white rounded font-bold"
          >
            ▲
          </button>
          <div />
          <button
            onClick={() => move('left')}
            className="h-10 bg-slate-800 active:bg-amber-600 text-white rounded font-bold"
          >
            ◀
          </button>
          <button
            onClick={() => move('down')}
            className="h-10 bg-slate-800 active:bg-amber-600 text-white rounded font-bold"
          >
            ▼
          </button>
          <button
            onClick={() => move('right')}
            className="h-10 bg-slate-800 active:bg-amber-600 text-white rounded font-bold"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
};
