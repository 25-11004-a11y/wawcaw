import { Point, Stroke } from './constants';
import { TransformFn } from './symmetry';

/**
 * Calculates the shortest distance from a point p to a line segment ab in [0, 1] space.
 */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    const px = p.x - a.x;
    const py = p.y - a.y;
    return Math.sqrt(px * px + py * py);
  }

  // Projection factor t clamped between 0 and 1
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  const ex = p.x - projX;
  const ey = p.y - projY;

  return Math.sqrt(ex * ex + ey * ey);
}

/**
 * Ray casting algorithm to determine if a point p is inside a polygon.
 */
export function isPointInPolygon(p: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > p.y !== yj > p.y &&
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Checks if a pointer at pt (within threshold 0.03) hits the given stroke
 * across any of its active symmetry transforms.
 *
 * Rules:
 * - stroke.kind === 'eraser' is ignored (rub erasers are invisible and cannot be deleted).
 * - stroke.kind === 'brush': hits if distance from pt to any segment is <= threshold + stroke.size/2.
 * - stroke.kind === 'stamp': hits if pt is inside the transformed polygon, or within threshold of any edge.
 */
export function isStrokeHit(
  pt: Point,
  stroke: Stroke,
  transforms: TransformFn[],
  threshold = 0.03
): boolean {
  if (stroke.kind === 'eraser') {
    return false;
  }

  for (const transform of transforms) {
    const transformedPoints = stroke.points.map(transform);
    if (transformedPoints.length === 0) continue;

    if (stroke.kind === 'brush') {
      const halfSize = (stroke.size || 0.02) / 2;
      const hitRadius = threshold + halfSize;

      if (transformedPoints.length === 1) {
        const p0 = transformedPoints[0];
        const dist = Math.hypot(pt.x - p0.x, pt.y - p0.y);
        if (dist <= hitRadius) return true;
      } else {
        for (let i = 0; i < transformedPoints.length - 1; i++) {
          const dist = distanceToSegment(pt, transformedPoints[i], transformedPoints[i + 1]);
          if (dist <= hitRadius) return true;
        }
      }
    } else if (stroke.kind === 'stamp') {
      // 1. Inside polygon test
      if (isPointInPolygon(pt, transformedPoints)) {
        return true;
      }

      // 2. Near boundary edges
      for (let i = 0; i < transformedPoints.length; i++) {
        const nextIdx = (i + 1) % transformedPoints.length;
        const dist = distanceToSegment(pt, transformedPoints[i], transformedPoints[nextIdx]);
        if (dist <= threshold) return true;
      }
    }
  }

  return false;
}

/**
 * History action for undo/redo
 */
export type HistoryAction =
  | { type: 'add'; stroke: Stroke; owner?: 'left' | 'right' }
  | { type: 'delete'; items: { stroke: Stroke; index: number }[]; owner?: 'left' | 'right' };

/**
 * Transient fading stroke animation info (0.2s duration)
 */
export interface FadingStroke {
  stroke: Stroke;
  startTime: number;
  duration: number; // in milliseconds (200ms)
  hitPoint: Point;
  transforms: TransformFn[];
}
