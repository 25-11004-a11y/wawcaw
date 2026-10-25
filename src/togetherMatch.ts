import { Stroke, Point } from './constants';

const GRID_SIZE = 64; // 64x64 grid is ideal for fast, accurate matching (<0.2ms)

/**
 * Dilates a binary mask on a grid with a given pixel radius.
 */
function dilate(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const result = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]) {
        for (let dy = -radius; dy <= radius; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= height) continue;
          for (let dx = -radius; dx <= radius; dx++) {
            if (dx * dx + dy * dy <= radius * radius) {
              const nx = x + dx;
              if (nx >= 0 && nx < width) {
                result[ny * width + nx] = 1;
              }
            }
          }
        }
      }
    }
  }
  return result;
}

/**
 * Renders a disk of radius r at (cx, cy) on the grid mask.
 */
function stampDisk(
  mask: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
  val: number
) {
  const rInt = Math.ceil(radius);
  const minX = Math.max(0, Math.floor(cx - rInt));
  const maxX = Math.min(width - 1, Math.ceil(cx + rInt));
  const minY = Math.max(0, Math.floor(cy - rInt));
  const maxY = Math.min(height - 1, Math.ceil(cy + rInt));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        mask[y * width + x] = val;
      }
    }
  }
}

/**
 * Rasterizes a stroke onto a grid mask (val = 1 for brush, val = 0 for eraser).
 */
function rasterizeStroke(
  mask: Uint8Array,
  width: number,
  height: number,
  points: Point[],
  radius: number,
  val: number
) {
  if (points.length === 0) return;

  if (points.length === 1) {
    stampDisk(mask, width, height, points[0].x, points[0].y, radius, val);
    return;
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const steps = Math.max(1, Math.ceil(dist / 0.8));

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = p0.x + (p1.x - p0.x) * t;
      const y = p0.y + (p1.y - p0.y) * t;
      stampDisk(mask, width, height, x, y, radius, val);
    }
  }
}

/**
 * Calculates the symmetry match percentage (0 to 100) between the left drawing
 * (mirrored vertically across the center line x = 0.5) and the right drawing.
 */
export function calculateTogetherMatch(strokes: Stroke[]): number {
  const leftStrokes = strokes.filter((s) => s.owner === 'left');
  const rightStrokes = strokes.filter((s) => s.owner === 'right');

  // Verify both sides have at least one brush stroke
  const hasLeft = leftStrokes.some((s) => s.kind === 'brush' && s.points.length > 0);
  const hasRight = rightStrokes.some((s) => s.kind === 'brush' && s.points.length > 0);
  if (!hasLeft || !hasRight) return 0;

  const width = GRID_SIZE;
  const height = GRID_SIZE;
  const mask1 = new Uint8Array(width * height);
  const mask2 = new Uint8Array(width * height);

  // 1. Rasterize left strokes mirrored across x = 0.5 onto [0, width]
  // In normalized coords on left side [0, 0.5]:
  // Mirrored x = 1 - x in [0.5, 1.0].
  // Normalized in half-space [0, 1]: u = (1 - x - 0.5) / 0.5 = 1 - 2x.
  for (const stroke of leftStrokes) {
    if (stroke.points.length === 0) continue;
    const val = stroke.kind === 'eraser' ? 0 : 1;
    const radius = Math.max(1.2, stroke.size * width);
    const mapped = stroke.points.map((p) => ({
      x: (1 - 2 * p.x) * (width - 1),
      y: p.y * (height - 1),
    }));
    rasterizeStroke(mask1, width, height, mapped, radius, val);
  }

  // 2. Rasterize right strokes onto [0, width]
  // In normalized coords on right side [0.5, 1.0]:
  // Normalized in half-space [0, 1]: u = (x - 0.5) / 0.5 = 2x - 1.
  for (const stroke of rightStrokes) {
    if (stroke.points.length === 0) continue;
    const val = stroke.kind === 'eraser' ? 0 : 1;
    const radius = Math.max(1.2, stroke.size * width);
    const mapped = stroke.points.map((p) => ({
      x: (2 * p.x - 1) * (width - 1),
      y: p.y * (height - 1),
    }));
    rasterizeStroke(mask2, width, height, mapped, radius, val);
  }

  // Count active pixels
  let count1 = 0;
  let count2 = 0;
  for (let i = 0; i < width * height; i++) {
    if (mask1[i]) count1++;
    if (mask2[i]) count2++;
  }

  if (count1 === 0 || count2 === 0) return 0;

  // Tolerance dilation of 2 pixels
  const dilated1 = dilate(mask1, width, height, 2);
  const dilated2 = dilate(mask2, width, height, 2);

  let match1in2 = 0;
  for (let i = 0; i < width * height; i++) {
    if (mask1[i] && dilated2[i]) match1in2++;
  }

  let match2in1 = 0;
  for (let i = 0; i < width * height; i++) {
    if (mask2[i] && dilated1[i]) match2in1++;
  }

  const recall1 = match1in2 / count1;
  const recall2 = match2in1 / count2;

  // Harmonic mean (F1 score) of reciprocal coverage
  const f1 = (2 * recall1 * recall2) / (recall1 + recall2 + 1e-6);
  return Math.min(100, Math.max(0, Math.round(f1 * 100)));
}

/**
 * Returns friendly feedback message and emoji for a match score.
 */
export function getMatchFeedback(percent: number): { emoji: string; message: string } {
  if (percent >= 90) return { emoji: '🌟', message: '완벽한 거울 대칭이에요!' };
  if (percent >= 75) return { emoji: '✨', message: '거의 똑같이 맞췄어요!' };
  if (percent >= 50) return { emoji: '👍', message: '점점 닮아가고 있어요!' };
  if (percent >= 25) return { emoji: '🎨', message: '조금 더 맞춰 볼까요?' };
  if (percent > 0) return { emoji: '🌱', message: '반대쪽 선을 보고 따라 그려 봐요!' };
  return { emoji: '🪞', message: '양쪽에 그림을 그려서 맞춰 봐요!' };
}
