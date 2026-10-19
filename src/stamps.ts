import { Point, StampShape } from './constants';

/**
 * Normalized 2D contour points around (0, 0) within [-0.5, 0.5].
 * When scaled and translated to center (cx, cy), these form a closed polygon.
 */

// Helper to generate a regular polygon or circle outline
function generateCirclePoints(steps = 28): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    points.push({
      x: Number((Math.cos(angle) * 0.48).toFixed(4)),
      y: Number((Math.sin(angle) * 0.48).toFixed(4)),
    });
  }
  return points;
}

// Triangle pointing upwards
const TRIANGLE_POINTS: Point[] = [
  { x: 0, y: -0.48 },    // Top vertex
  { x: 0.46, y: 0.42 },  // Bottom right
  { x: -0.46, y: 0.42 }, // Bottom left
];

// Square with slight roundedness in outline or classic square
const SQUARE_POINTS: Point[] = [
  { x: -0.42, y: -0.42 },
  { x: 0.42, y: -0.42 },
  { x: 0.42, y: 0.42 },
  { x: -0.42, y: 0.42 },
];

// Heart shape contour
function generateHeartPoints(steps = 32): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    // Classic heart parametric equations normalized to [-0.5, 0.5]
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    points.push({
      x: Number(((x / 17) * 0.48).toFixed(4)),
      y: Number(((y / 17) * 0.48 + 0.04).toFixed(4)),
    });
  }
  return points;
}

// 5-pointed Star contour
function generateStarPoints(): Point[] {
  const points: Point[] = [];
  const spikes = 5;
  const outerRadius = 0.48;
  const innerRadius = 0.22;
  const step = Math.PI / spikes;

  // Start with top spike pointing upwards (-PI/2)
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = i * step - Math.PI / 2;
    points.push({
      x: Number((Math.cos(angle) * radius).toFixed(4)),
      y: Number((Math.sin(angle) * radius).toFixed(4)),
    });
  }
  return points;
}

/**
 * Asymmetric Fish facing RIGHT.
 * Tail on the left, mouth on the right.
 * When mirrored vertically (x = 0.5), it faces LEFT.
 * When rotated 180° (point symmetry), it is upside down and faces LEFT.
 */
const FISH_BODY_CONTOUR: Point[] = [
  // Nose / mouth (rightmost tip)
  { x: 0.48, y: 0.0 },
  { x: 0.42, y: -0.1 },
  { x: 0.32, y: -0.2 },
  // Dorsal arch
  { x: 0.16, y: -0.26 },
  { x: 0.0, y: -0.28 },
  { x: -0.16, y: -0.25 },
  // Towards tail base
  { x: -0.3, y: -0.1 },
  // Tail fin top tip
  { x: -0.48, y: -0.3 },
  // Tail fin inner notch
  { x: -0.4, y: 0.0 },
  // Tail fin bottom tip
  { x: -0.48, y: 0.3 },
  // Towards tail base bottom
  { x: -0.3, y: 0.1 },
  // Belly arch
  { x: -0.16, y: 0.25 },
  { x: 0.0, y: 0.28 },
  { x: 0.16, y: 0.26 },
  { x: 0.32, y: 0.2 },
  { x: 0.42, y: 0.1 },
];

export const STAMP_CONTOURS: Record<StampShape, Point[]> = {
  circle: generateCirclePoints(),
  triangle: TRIANGLE_POINTS,
  square: SQUARE_POINTS,
  heart: generateHeartPoints(),
  star: generateStarPoints(),
  fish: FISH_BODY_CONTOUR,
};

/**
 * Generates the absolute contour points of a stamp placed at center (cx, cy)
 * with the specified size ratio.
 */
export function getStampPoints(shape: StampShape, center: Point, size: number): Point[] {
  const contour = STAMP_CONTOURS[shape] || STAMP_CONTOURS.circle;
  return contour.map((p) => ({
    x: Number((center.x + p.x * size).toFixed(6)),
    y: Number((center.y + p.y * size).toFixed(6)),
  }));
}

/**
 * Fish eye relative center point (for adding cute eye detail)
 */
export const FISH_EYE_OFFSET: Point = { x: 0.22, y: -0.06 };
