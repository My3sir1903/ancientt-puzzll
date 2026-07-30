// Core game logic for the 8x8 Match-3 puzzle

export const GRID_SIZE = 8;
export const NUM_PIECES = 3;

export type BlockColor = 'sun' | 'moon' | 'pyramid' | 'star' | 'eye' | 'fire';

// Blok tipleri ve durumları
export type BlockType = 'normal' | 'chained' | 'frozen' | 'treasure';

export interface CellData {
  color: BlockColor;
  type?: BlockType;
  health?: number; // Zincirli blok için can (örn: 2 patlamada kırılır)
}

export type Grid = (CellData | null)[][];

export const COLOR_CONFIG: Record<
  BlockColor,
  { hex: string; darker: string; lighter: string; icon: string; name: string }
> = {
  sun: {
    hex: '#f39c12',
    darker: '#8a5906',
    lighter: '#ffc971',
    icon: 'wb-sunny',
    name: 'Sun',
  },
  moon: {
    hex: '#3498db',
    darker: '#1a5480',
    lighter: '#7ec4ea',
    icon: 'brightness-3',
    name: 'Moon',
  },
  pyramid: {
    hex: '#d35400',
    darker: '#7d3200',
    lighter: '#ff8c42',
    icon: 'change-history',
    name: 'Pyramid',
  },
  star: {
    hex: '#9b59b6',
    darker: '#5b356b',
    lighter: '#c894dc',
    icon: 'star',
    name: 'Star',
  },
  eye: {
    hex: '#16a085',
    darker: '#0a5548',
    lighter: '#4ecdc4',
    icon: 'visibility',
    name: 'Eye',
  },
  fire: {
    hex: '#c0392b',
    darker: '#7a221a',
    lighter: '#e57373',
    icon: 'local-fire-department',
    name: 'Fire',
  },
};

export const COLORS: BlockColor[] = ['sun', 'moon', 'pyramid', 'star', 'eye', 'fire'];

export interface Piece {
  id: string;
  shape: [number, number][]; // list of [row, col] offsets from top-left
  color: BlockColor;
  width: number; // bounding box width in cells
  height: number; // bounding box height in cells
}

// Shape definitions (relative [row, col] offsets)
const RAW_SHAPES: [number, number][][] = [
  // 1x1
  [[0, 0]],
  // 2x1 horizontal
  [[0, 0], [0, 1]],
  // 1x2 vertical
  [[0, 0], [1, 0]],
  // 2x2 square
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  // 3x1 horizontal
  [[0, 0], [0, 1], [0, 2]],
  // 1x3 vertical
  [[0, 0], [1, 0], [2, 0]],
  // L shape
  [[0, 0], [1, 0], [1, 1]],
  // Reverse L
  [[0, 1], [1, 0], [1, 1]],
  // T shape (small)
  [[0, 0], [0, 1], [0, 2], [1, 1]],
];

const getBoundingBox = (shape: [number, number][]) => {
  const maxRow = Math.max(...shape.map((s) => s[0]));
  const maxCol = Math.max(...shape.map((s) => s[1]));
  return { width: maxCol + 1, height: maxRow + 1 };
};

export const createEmptyGrid = (): Grid => {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null)
  );
};

let pieceCounter = 0;
const uniqueId = () => `p_${Date.now()}_${pieceCounter++}`;

export const generateRandomPiece = (): Piece => {
  const shape = RAW_SHAPES[Math.floor(Math.random() * RAW_SHAPES.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const { width, height } = getBoundingBox(shape);
  return {
    id: uniqueId(),
    shape,
    color,
    width,
    height,
  };
};

export const generatePieces = (count: number = NUM_PIECES): Piece[] => {
  return Array.from({ length: count }, () => generateRandomPiece());
};

export const canPlacePiece = (
  grid: Grid,
  piece: Piece,
  row: number,
  col: number
): boolean => {
  for (const [dr, dc] of piece.shape) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
    if (grid[r][c] !== null) return false;
  }
  return true;
};

export const placePiece = (
  grid: Grid,
  piece: Piece,
  row: number,
  col: number
): Grid => {
  const newGrid = grid.map((r) => [...r]);
  for (const [dr, dc] of piece.shape) {
    newGrid[row + dr][col + dc] = { color: piece.color, type: 'normal' };
  }
  return newGrid;
};

// Find matches: full horizontal rows or full vertical columns
export const findMatches = (grid: Grid): Set<string> => {
  const matches = new Set<string>();

  // 1. Tüm satırı kontrol et (Satırın tamamı dolu mu?)
  for (let r = 0; r < GRID_SIZE; r++) {
    let rowFull = true;
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === null) {
        rowFull = false;
        break;
      }
    }
    if (rowFull) {
      for (let c = 0; c < GRID_SIZE; c++) {
        matches.add(`${r},${c}`);
      }
    }
  }

  // 2. Tüm sütunu kontrol et (Sütunun tamamı dolu mu?)
  for (let c = 0; c < GRID_SIZE; c++) {
    let colFull = true;
    for (let r = 0; r < GRID_SIZE; r++) {
      if (grid[r][c] === null) {
        colFull = false;
        break;
      }
    }
    if (colFull) {
      for (let r = 0; r < GRID_SIZE; r++) {
        matches.add(`${r},${c}`);
      }
    }
  }

  return matches;
};

export const clearMatches = (grid: Grid, matches: Set<string>): Grid => {
  const newGrid = grid.map((r) => [...r]);
  matches.forEach((key) => {
    const [r, c] = key.split(',').map(Number);
    newGrid[r][c] = null;
  });
  return newGrid;
};

// Check if any piece can be placed anywhere on the grid
export const canPlaceAnyPiece = (grid: Grid, pieces: Piece[]): boolean => {
  const activePieces = pieces.filter((p) => p !== null);
  if (activePieces.length === 0) return true; // waiting for new pieces
  for (const piece of activePieces) {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (canPlacePiece(grid, piece, r, c)) return true;
      }
    }
  }
  return false;
};