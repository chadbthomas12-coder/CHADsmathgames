import React, { useState, useEffect, useRef, useMemo } from 'react';
import gamesData from './data/games.json';
import {
  Gamepad2,
  Rocket,
  Compass,
  Swords,
  Grid,
  Boxes,
  Binary,
  Footprints,
  Flag,
  CircleDot,
  Search,
  Maximize2,
  RotateCcw,
  Star,
  ShieldAlert,
  Plus,
  Play,
  ArrowLeft,
  X,
  ExternalLink,
  Shuffle,
  Eye,
  EyeOff
} from 'lucide-react';

export interface GameItem {
  id: string;
  title: string;
  category: string;
  description: string;
  iframeUrl: string;
  icon?: string;
  accent?: string;
  badge?: string;
  rating: number;
  plays: string;
  controls?: Array<{ key: string; action: string }>;
  instructions?: string[];
  isCustom?: boolean;
}

const CATEGORIES = ['All', 'Arcade', 'Action', 'Puzzle', '2-Player', 'Favorites'] as const;
type CategoryType = typeof CATEGORIES[number];

export default function App() {
  const [games, setGames] = useState<GameItem[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('unblockplay_favorites');
      return saved ? JSON.parse(saved) : ['cyber-snake', 'space-invaders', 'tetris-matrix'];
    } catch {
      return ['cyber-snake'];
    }
  });

  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);

  // Panic / Stealth Mode state
  const [isStealthMode, setIsStealthMode] = useState(false);
  const [stealthNotes, setStealthNotes] = useState(
    'AP European History - Unit 4: Scientific Revolution & Enlightenment\n\n' +
    '1. The Heliocentric Model:\n' +
    '   - Nicolaus Copernicus (1473-1543): De revolutionibus orbium coelestium.\n' +
    '   - Johannes Kepler: Planetary motion laws, elliptical orbits.\n' +
    '   - Galileo Galilei: Telescope observations, moon craters, trial of 1633.\n\n' +
    '2. The Scientific Method:\n' +
    '   - Francis Bacon: Inductive reasoning, empirical observation.\n' +
    '   - Rene Descartes: Deductive reasoning, "Cogito ergo sum".\n\n' +
    '3. Key Enlightenment Thinkers:\n' +
    '   - John Locke: Natural rights (life, liberty, property), tabula rasa.\n' +
    '   - Voltaire: Freedom of speech, religious toleration, separation of church and state.'
  );

  // Add Custom Game modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newGameTitle, setNewGameTitle] = useState('');
  const [newGameCategory, setNewGameCategory] = useState('Arcade');
  const [newGameUrl, setNewGameUrl] = useState('');
  const [newGameDesc, setNewGameDesc] = useState('');

  const iframeContainerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Load games from JSON + localStorage custom games
  useEffect(() => {
    let customGames: GameItem[] = [];
    try {
      const customStr = localStorage.getItem('unblockplay_custom_games');
      if (customStr) customGames = JSON.parse(customStr);
    } catch {
      customGames = [];
    }

    const initialGames: GameItem[] = [...(gamesData as GameItem[]), ...customGames];
    setGames(initialGames);
  }, []);

  useEffect(() => {
    setIframeLoading(true);
    setIframeError(false);
  }, [selectedGameId]);

  // Save favorites
  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('unblockplay_favorites', JSON.stringify(next));
      return next;
    });
  };

  // Keyboard shortcut for Panic Button (Press Esc or ']' to trigger)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ']' || (e.key === 'Escape' && isStealthMode)) {
        setIsStealthMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStealthMode]);

  // Update browser tab title based on stealth mode
  useEffect(() => {
    if (isStealthMode) {
      document.title = 'Untitled document - Google Docs';
    } else {
      document.title = 'UnblockPlay - Arcade & Games Portal';
    }
  }, [isStealthMode]);

  const activeGame = useMemo(() => {
    return games.find(g => g.id === selectedGameId) || null;
  }, [games, selectedGameId]);

  // Filtered games
  const filteredGames = useMemo(() => {
    return games.filter(game => {
      const matchesSearch =
        game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.category.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeCategory === 'All') return true;
      if (activeCategory === 'Favorites') return favorites.includes(game.id);
      return game.category === activeCategory;
    });
  }, [games, searchQuery, activeCategory, favorites]);

  // Fullscreen handler
  const handleToggleFullscreen = () => {
    if (!iframeContainerRef.current) return;
    if (!document.fullscreenElement) {
      iframeContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Reload iframe
  const handleReloadIframe = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  // Surprise Me / Random Game
  const handleRandomGame = () => {
    if (games.length === 0) return;
    const randomIdx = Math.floor(Math.random() * games.length);
    setSelectedGameId(games[randomIdx].id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Save new custom game
  const handleSaveCustomGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameTitle.trim() || !newGameUrl.trim()) return;

    const newGame: GameItem = {
      id: 'custom-' + Date.now(),
      title: newGameTitle.trim(),
      category: newGameCategory,
      description: newGameDesc.trim() || 'Custom added unblocked iframe game.',
      iframeUrl: newGameUrl.trim(),
      rating: 4.8,
      plays: '1.2K',
      badge: 'Custom',
      isCustom: true,
      controls: [{ key: 'Mouse / Keyboard', action: 'Standard browser controls' }],
      instructions: ['Play inside embedded sandbox iframe viewport.'],
    };

    const updated = [newGame, ...games];
    setGames(updated);

    try {
      const customStr = localStorage.getItem('unblockplay_custom_games');
      const saved = customStr ? JSON.parse(customStr) : [];
      saved.unshift(newGame);
      localStorage.setItem('unblockplay_custom_games', JSON.stringify(saved));
    } catch {}

    setSelectedGameId(newGame.id);
    setIsAddModalOpen(false);
    setNewGameTitle('');
    setNewGameUrl('');
    setNewGameDesc('');
  };

  const getGameIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Rocket': return <Rocket className="w-5 h-5" />;
      case 'Compass': return <Compass className="w-5 h-5" />;
      case 'Swords': return <Swords className="w-5 h-5" />;
      case 'Grid': return <Grid className="w-5 h-5" />;
      case 'Boxes': return <Boxes className="w-5 h-5" />;
      case 'Binary': return <Binary className="w-5 h-5" />;
      case 'Footprints': return <Footprints className="w-5 h-5" />;
      case 'Flag': return <Flag className="w-5 h-5" />;
      case 'CircleDot': return <CircleDot className="w-5 h-5" />;
      default: return <Gamepad2 className="w-5 h-5" />;
    }
  };

  // -------------------------------------------------------------
  // STEALTH / PANIC MODE (Realistic Google Docs note-taking screen)
  // -------------------------------------------------------------
  if (isStealthMode) {
    return (
      <div className="fixed inset-0 bg-[#f8f9fa] text-slate-800 z-50 flex flex-col font-sans select-text">
        {/* Docs Header */}
        <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#4285f4] rounded flex items-center justify-center text-white font-bold text-xl shadow-xs">
              📄
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900 text-base">European History - Unit 4 Notes</span>
                <span className="text-xs text-slate-400">Saved to Drive</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-600 mt-0.5">
                <span className="hover:text-slate-900 cursor-pointer">File</span>
                <span className="hover:text-slate-900 cursor-pointer">Edit</span>
                <span className="hover:text-slate-900 cursor-pointer">View</span>
                <span className="hover:text-slate-900 cursor-pointer">Insert</span>
                <span className="hover:text-slate-900 cursor-pointer">Format</span>
                <span className="hover:text-slate-900 cursor-pointer">Tools</span>
                <span className="hover:text-slate-900 cursor-pointer">Help</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:inline">Press Esc or ']' to return</span>
            <button
              onClick={() => setIsStealthMode(false)}
              className="px-3 py-1.5 bg-[#4285f4] hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors shadow-xs"
            >
              Resume Game
            </button>
          </div>
        </div>

        {/* Docs Toolbar */}
        <div className="bg-[#edf2fa] border-b border-slate-200 px-4 py-1.5 flex items-center gap-3 text-xs text-slate-700">
          <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-300">Arial · 11</span>
          <span className="font-bold cursor-pointer">B</span>
          <span className="italic cursor-pointer">I</span>
          <span className="underline cursor-pointer">U</span>
          <span className="h-4 w-px bg-slate-300 mx-1"></span>
          <span>Editing mode</span>
        </div>

        {/* Docs Document Page */}
        <div className="flex-1 overflow-auto bg-[#f0f4f9] p-6 flex justify-center">
          <div className="w-full max-w-3xl bg-white min-h-[850px] shadow-md border border-slate-200 p-12 rounded-sm text-sm leading-relaxed text-slate-800">
            <textarea
              value={stealthNotes}
              onChange={e => setStealthNotes(e.target.value)}
              className="w-full h-full min-h-[750px] resize-none outline-none font-sans text-slate-800 bg-transparent"
              placeholder="Start typing your school notes..."
            />
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // REGULAR UNBLOCKED GAMES WEBSITE VIEW
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#07090f] text-slate-100 font-sans flex flex-col">
      {/* 
        MANDATORY TOP BAR CONTRACT:
        Zone 1: Single text element wordmark
        Zone 2: 4-5 concise whitespace-nowrap nav links
        Zone 3: 1 primary action
      */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800/80 bg-[#0b0e18]/90 sticky top-0 z-40 backdrop-blur-md">
        {/* Zone 1: Brand wordmark */}
        <button
          onClick={() => setSelectedGameId(null)}
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-cyan-400 transition-colors flex items-center gap-2"
        >
          <Gamepad2 className="w-5 h-5 text-cyan-400" />
          <span>UnblockPlay</span>
        </button>

        {/* Zone 2: 4-5 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => { setSelectedGameId(null); setActiveCategory('All'); }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${activeCategory === 'All' && !selectedGameId ? 'text-cyan-400 font-semibold' : ''}`}
          >
            All Games
          </button>
          <button
            onClick={() => { setSelectedGameId(null); setActiveCategory('Arcade'); }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${activeCategory === 'Arcade' ? 'text-cyan-400 font-semibold' : ''}`}
          >
            Arcade
          </button>
          <button
            onClick={() => { setSelectedGameId(null); setActiveCategory('Action'); }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${activeCategory === 'Action' ? 'text-cyan-400 font-semibold' : ''}`}
          >
            Action
          </button>
          <button
            onClick={() => { setSelectedGameId(null); setActiveCategory('Puzzle'); }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${activeCategory === 'Puzzle' ? 'text-cyan-400 font-semibold' : ''}`}
          >
            Puzzle
          </button>
          <button
            onClick={() => { setSelectedGameId(null); setActiveCategory('Favorites'); }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${activeCategory === 'Favorites' ? 'text-cyan-400 font-semibold' : ''}`}
          >
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Favorites ({favorites.length})</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action (Panic Mode / Stealth Disguise) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsStealthMode(true)}
            title="Panic Button (Disguise as Google Docs notes - Shortcut: ])"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Panic Key ( ] )</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Iframe</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeGame ? (
          /* ==============================================================
             GAME THEATER VIEW (RUNNING GAME IN REAL IFRAME)
             ============================================================== */
          <div className="flex flex-col gap-6">
            {/* Navigation back and quick actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedGameId(null)}
                className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Games Catalog</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleFavorite(activeGame.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    favorites.includes(activeGame.id)
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${favorites.includes(activeGame.id) ? 'fill-amber-400 text-amber-400' : ''}`} />
                  <span>{favorites.includes(activeGame.id) ? 'Favorited' : 'Favorite'}</span>
                </button>

                <button
                  onClick={handleReloadIframe}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Reload Game Frame"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Restart</span>
                </button>

                <button
                  onClick={handleToggleFullscreen}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 transition-colors"
                  title="Fullscreen View"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Fullscreen</span>
                </button>
              </div>
            </div>

            {/* Iframe Viewport Container */}
            <div
              ref={iframeContainerRef}
              className="relative w-full aspect-[16/10] max-h-[640px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col items-center justify-center"
            >
              {iframeLoading && (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3 z-10">
                  <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-mono text-slate-400">Loading {activeGame.title}...</span>
                </div>
              )}

              {iframeError ? (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center z-20">
                  <ShieldAlert className="w-10 h-10 text-rose-500 mb-2" />
                  <h3 className="text-lg font-bold text-white mb-1">Could Not Load Game</h3>
                  <p className="text-xs text-slate-400 max-w-sm mb-4">
                    The game file at <code className="text-cyan-300 font-mono">{activeGame.iframeUrl}</code> could not be loaded.
                  </p>
                  <button
                    onClick={handleReloadIframe}
                    className="px-4 py-2 bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg hover:bg-cyan-300 transition-colors"
                  >
                    Retry Loading
                  </button>
                </div>
              ) : (
                <iframe
                  ref={iframeRef}
                  key={activeGame.id}
                  src={activeGame.iframeUrl}
                  title={activeGame.title}
                  className="w-full h-full border-0 block"
                  allow="autoplay; fullscreen; keyboard"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                  onLoad={() => setIframeLoading(false)}
                  onError={() => {
                    setIframeLoading(false);
                    setIframeError(true);
                  }}
                />
              )}
            </div>

            {/* Game Info Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-900/60 border border-slate-800/80 rounded-xl p-6">
              <div className="lg:col-span-2">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{activeGame.title}</h1>
                  <span className="text-xs text-cyan-400 font-mono">({activeGame.category})</span>
                </div>

                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  {activeGame.description}
                </p>

                {/* Metadata text without pill capsules (Anti-slop rule) */}
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mb-4">
                  <span>{activeGame.plays} plays</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-400">★ {activeGame.rating}</span>
                  <span aria-hidden="true">·</span>
                  <span>Direct HTML/JS/CSS Iframe</span>
                  {activeGame.isCustom && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-cyan-400">Custom Game</span>
                    </>
                  )}
                </div>

                {activeGame.instructions && activeGame.instructions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-800/80">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      How to Play
                    </h3>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {activeGame.instructions.map((inst, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-cyan-400 font-mono font-bold">{idx + 1}.</span>
                          <span>{inst}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Controls reference */}
              <div className="bg-slate-950/70 border border-slate-800/60 rounded-lg p-4 flex flex-col">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Keyboard & Touch Controls
                </h3>
                {activeGame.controls && activeGame.controls.length > 0 ? (
                  <div className="space-y-2.5">
                    {activeGame.controls.map((ctrl, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-900 last:border-none">
                        <span className="font-mono text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {ctrl.key}
                        </span>
                        <span className="text-slate-400">{ctrl.action}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Standard mouse and touch controls supported.</p>
                )}
              </div>
            </div>

            {/* More Recommended Games */}
            <div className="mt-4">
              <h2 className="text-base font-semibold text-white mb-4">Recommended Next</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {games
                  .filter(g => g.id !== activeGame.id)
                  .slice(0, 4)
                  .map(g => (
                    <div
                      key={g.id}
                      onClick={() => { setSelectedGameId(g.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="group bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-4 cursor-pointer transition-all hover:-translate-y-0.5 shadow-sm"
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-800 group-hover:bg-cyan-500/10 flex items-center justify-center text-slate-300 group-hover:text-cyan-300 mb-3 transition-colors">
                        {getGameIcon(g.icon)}
                      </div>
                      <h4 className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors truncate">
                        {g.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">{g.category} · {g.plays}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          /* ==============================================================
             GAMES CATALOG VIEW (BROWSE, SEARCH, CATEGORIES)
             ============================================================== */
          <div className="flex flex-col gap-6">
            {/* Hero / Portal Banner */}
            <div className="relative bg-gradient-to-r from-slate-900 via-[#0e1628] to-slate-900 border border-slate-800/80 rounded-2xl p-6 sm:p-8 overflow-hidden shadow-xl">
              <div className="relative z-10 max-w-2xl">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-2">
                  <span>HTML5 / JS / CSS Iframe Archive</span>
                  <span aria-hidden="true">·</span>
                  <span>100% Unblocked</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
                  Instant Play Arcade Portal
                </h1>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  Play classics like Retro Snake, Tetris, Galaxy Defender, 2048, and Pong right in your browser.
                  All games run locally inside sandboxed iframes with zero lag.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRandomGame}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-xs rounded-lg transition-colors shadow-md"
                  >
                    <Shuffle className="w-4 h-4" />
                    <span>Surprise Me</span>
                  </button>
                  <button
                    onClick={() => setActiveCategory('Favorites')}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-lg transition-colors border border-slate-700"
                  >
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span>My Favorites ({favorites.length})</span>
                  </button>
                </div>
              </div>

              {/* Decorative subtle background icon */}
              <div className="absolute -right-8 -bottom-8 text-slate-800/20 pointer-events-none select-none">
                <Gamepad2 className="w-64 h-64" />
              </div>
            </div>

            {/* Search and Category Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              {/* Category Segmented Controls (Interactive buttons allowed per anti-slop rules) */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800/80 rounded-xl overflow-x-auto">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                      activeCategory === cat
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search unblocked games..."
                  className="w-full bg-slate-900 border border-slate-800/80 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Games Grid */}
            {filteredGames.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {filteredGames.map(game => (
                  <div
                    key={game.id}
                    onClick={() => { setSelectedGameId(game.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="group relative flex flex-col bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-cyan-500/40 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 shadow-md hover:shadow-cyan-500/5"
                  >
                    {/* Card Thumbnail / Banner */}
                    <div className="relative aspect-[16/10] bg-slate-950 overflow-hidden flex items-center justify-center border-b border-slate-800/60">
                      {/* Stylized Game Pattern */}
                      <div className="absolute inset-0 bg-radial from-slate-800/40 via-slate-950 to-slate-950 opacity-80" />

                      <div className="relative z-10 w-14 h-14 rounded-2xl bg-slate-900/90 border border-slate-700/60 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:text-cyan-300 transition-all duration-200 shadow-lg">
                        {getGameIcon(game.icon)}
                      </div>

                      {/* Favorite Button */}
                      <button
                        onClick={e => toggleFavorite(game.id, e)}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors z-20"
                        title={favorites.includes(game.id) ? 'Remove Favorite' : 'Add to Favorites'}
                      >
                        <Star className={`w-4 h-4 ${favorites.includes(game.id) ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>

                      {/* Hover Play Button Overlay */}
                      <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-150 z-10 backdrop-blur-xs">
                        <span className="flex items-center gap-1.5 px-4 py-2 bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg shadow-lg">
                          <Play className="w-3.5 h-3.5 fill-current" /> Play Now
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-4 flex flex-col flex-1 justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <h3 className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors truncate">
                            {game.title}
                          </h3>
                        </div>

                        <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed mb-3">
                          {game.description}
                        </p>
                      </div>

                      {/* Unboxed Metadata text (Anti-slop rule: NO static pill capsule sandwiches) */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/60">
                        <span>{game.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-400 font-medium">★ {game.rating}</span>
                        <span aria-hidden="true">·</span>
                        <span>{game.plays}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center bg-slate-900/40 border border-slate-800/60 rounded-xl p-8">
                <Gamepad2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">No Games Found</h3>
                <p className="text-xs text-slate-400 mb-4">
                  {searchQuery ? `No results matching "${searchQuery}"` : 'No games in this category yet.'}
                </p>
                <button
                  onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-[#090b14] py-6 px-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">UnblockPlay Portal</span>
            <span>·</span>
            <span>All games stored as standalone iframes in JSON</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-slate-400">Panic shortcut: <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">]</kbd></span>
            <span>·</span>
            <button
              onClick={() => setIsStealthMode(true)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              School Disguise
            </button>
          </div>
        </div>
      </footer>

      {/* Add Custom Game Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" /> Add Custom Iframe Game
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomGame} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Game Title *
                </label>
                <input
                  type="text"
                  required
                  value={newGameTitle}
                  onChange={e => setNewGameTitle(e.target.value)}
                  placeholder="e.g., Space Odyssey"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={newGameCategory}
                  onChange={e => setNewGameCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                >
                  <option value="Arcade">Arcade</option>
                  <option value="Action">Action</option>
                  <option value="Puzzle">Puzzle</option>
                  <option value="2-Player">2-Player</option>
                  <option value="Classic">Classic</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Iframe URL / File Path *
                </label>
                <input
                  type="text"
                  required
                  value={newGameUrl}
                  onChange={e => setNewGameUrl(e.target.value)}
                  placeholder="e.g., /games/snake.html or https://..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Enter a local relative path or external unblocked game iframe URL.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  value={newGameDesc}
                  onChange={e => setNewGameDesc(e.target.value)}
                  placeholder="Brief summary of gameplay rules..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold rounded-lg shadow-md"
                >
                  Save Game to JSON
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
