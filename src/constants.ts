export type Mode = 'mirror' | 'spin';
export type ArtworkMode = 'mirror' | 'spin' | 'together';
export type MirrorAxis = 'vertical' | 'horizontal' | 'both';
export type ArtworkAxis = 'vertical' | 'horizontal' | 'both' | 'point' | 'none';
export type ViewMode = 'instant' | 'peek';
export type ToolType = 'brush' | 'stamp';
export type StampShape = 'circle' | 'triangle' | 'square' | 'heart' | 'star' | 'fish';

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  kind: ToolType;
  color: string;
  size: number; // Ratio relative to canvas size
  points: Point[]; // Brush points or single center point for stamp
  stampShape?: StampShape;
  owner?: 'left' | 'right'; // For '같이 만들기' mode
}

export interface ArtCard {
  title: string;
  description: string;
  symmetrySentence: string;
  question: string;
  isDefault: boolean;
  source?: 'ai' | 'default';
}

export interface Artwork {
  id: string;
  createdAt: number;
  mode: ArtworkMode;
  axis: ArtworkAxis;
  strokes: Stroke[];
  card: ArtCard;
}

export interface Session {
  date: string;
  mode: ArtworkMode;
  axis: ArtworkAxis;
  durationSec: number;
  strokeCount: number;
  stampCount: number;
  revealUsed: boolean;
  axisChanges: number;
  aiUsed: boolean;
}

// 8 Palette Colors as specified
export const PALETTE_COLORS = [
  '#FF5C8A', // Cherry Pink
  '#FF9F43', // Orange
  '#FFD23F', // Yellow
  '#4CD38A', // Mint Green
  '#3FA7FF', // Sky Blue
  '#8C6CFF', // Purple
  '#8B5E3C', // Earth Brown
  '#3A3350', // Ink Navy
] as const;

// Together mode colors (4 for left person, 4 for right person)
export const TOGETHER_LEFT_COLORS = ['#3FA7FF', '#4CD38A', '#8C6CFF', '#3A3350'] as const;
export const TOGETHER_RIGHT_COLORS = ['#FF9F43', '#FF5C8A', '#FFD23F', '#8B5E3C'] as const;

// 3 Brush Sizes (canvas ratio)
export const BRUSH_SIZES = {
  thin: 0.01,
  medium: 0.02,
  thick: 0.037,
} as const;

// 3 Stamp Sizes (canvas ratio)
export const STAMP_SIZES = {
  thin: 0.06,
  medium: 0.1,
  thick: 0.15,
} as const;

export type SizeLevel = 'thin' | 'medium' | 'thick';

// UI Palette
export const UI_COLORS = {
  cream: '#FFF8EE',
  mint: '#7FD8BE',
  pink: '#FF9EB5',
  yellow: '#FFD66B',
  sky: '#8EC9FF',
  purple: '#B9A3FF',
  ink: '#3A3350',
} as const;
