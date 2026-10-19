import { Point, Mode, MirrorAxis } from './constants';

/**
 * Pure symmetry transformation functions.
 * All coordinates are normalized in [0, 1] with center at (0.5, 0.5).
 */

export const identity = (p: Point): Point => ({
  x: p.x,
  y: p.y,
});

/** Vertical axis mirror (x = 0.5): (x, y) -> (1 - x, y) */
export const mirrorV = (p: Point): Point => ({
  x: Number((1 - p.x).toFixed(6)),
  y: Number(p.y.toFixed(6)),
});

/** Horizontal axis mirror (y = 0.5): (x, y) -> (x, 1 - y) */
export const mirrorH = (p: Point): Point => ({
  x: Number(p.x.toFixed(6)),
  y: Number((1 - p.y).toFixed(6)),
});

/** Point symmetry around center (0.5, 0.5): (x, y) -> (1 - x, 1 - y) */
export const pointSym = (p: Point): Point => ({
  x: Number((1 - p.x).toFixed(6)),
  y: Number((1 - p.y).toFixed(6)),
});

export type TransformFn = (p: Point) => Point;

/**
 * Returns the list of transformations for the given mode and axis:
 * - mirror + vertical: [identity, mirrorV]
 * - mirror + horizontal: [identity, mirrorH]
 * - mirror + both: [identity, mirrorV, mirrorH, pointSym]
 * - spin: [identity, pointSym]
 */
export function getTransforms(mode: Mode, axis: MirrorAxis = 'vertical'): TransformFn[] {
  if (mode === 'spin') {
    return [identity, pointSym];
  }

  switch (axis) {
    case 'vertical':
      return [identity, mirrorV];
    case 'horizontal':
      return [identity, mirrorH];
    case 'both':
      return [identity, mirrorV, mirrorH, pointSym];
    default:
      return [identity, mirrorV];
  }
}

/**
 * Check if a normalized point (0..1) is inside the allowed drawing region in "짠!" (peek) mode:
 * - Vertical axis & Spin: Left half (x <= 0.5)
 * - Horizontal axis: Top half (y <= 0.5)
 * - Both axes: Top-left quarter (x <= 0.5 && y <= 0.5)
 */
export function isPointInAllowedZone(p: Point, mode: Mode, axis: MirrorAxis): boolean {
  if (mode === 'spin' || axis === 'vertical') {
    return p.x <= 0.5;
  }
  if (axis === 'horizontal') {
    return p.y <= 0.5;
  }
  if (axis === 'both') {
    return p.x <= 0.5 && p.y <= 0.5;
  }
  return true;
}

/**
 * Clamps a point within the valid drawing boundary in "짠!" mode
 * when the pointer moves beyond the allowed edge.
 */
export function clampPointToAllowedZone(p: Point, mode: Mode, axis: MirrorAxis): Point {
  let cx = Math.max(0, Math.min(1, p.x));
  let cy = Math.max(0, Math.min(1, p.y));

  if (mode === 'spin' || axis === 'vertical') {
    cx = Math.min(0.5, cx);
  } else if (axis === 'horizontal') {
    cy = Math.min(0.5, cy);
  } else if (axis === 'both') {
    cx = Math.min(0.5, cx);
    cy = Math.min(0.5, cy);
  }

  return {
    x: Number(cx.toFixed(6)),
    y: Number(cy.toFixed(6)),
  };
}
