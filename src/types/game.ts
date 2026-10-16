export type GameCategory = 'All' | 'Arcade' | 'Action' | 'Puzzle' | 'Classic' | '2-Player' | 'Favorites';

export interface GameControl {
  key: string;
  action: string;
}

export interface GameInfo {
  id: string;
  title: string;
  category: 'Arcade' | 'Action' | 'Puzzle' | 'Classic' | '2-Player';
  description: string;
  tags: string[];
  controls: GameControl[];
  badge?: string;
  playsCount: number;
  rating: number;
  instructions: string[];
  colorAccent: string;
}
