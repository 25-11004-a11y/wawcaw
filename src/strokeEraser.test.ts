import { describe, it, expect } from 'vitest';
import { distanceToSegment, isPointInPolygon, isStrokeHit } from './strokeEraser';
import { Stroke } from './constants';
import { mirrorV, pointSym } from './symmetry';

describe('strokeEraser geometry', () => {
  it('calculates distance to line segment correctly', () => {
    const a = { x: 0.1, y: 0.1 };
    const b = { x: 0.5, y: 0.1 };

    // Point directly on segment
    expect(distanceToSegment({ x: 0.3, y: 0.1 }, a, b)).toBeCloseTo(0, 5);

    // Point perpendicular to midpoint
    expect(distanceToSegment({ x: 0.3, y: 0.14 }, a, b)).toBeCloseTo(0.04, 5);

    // Point beyond endpoint a
    expect(distanceToSegment({ x: 0.07, y: 0.1 }, a, b)).toBeCloseTo(0.03, 5);
  });

  it('determines if a point is inside a polygon', () => {
    const square = [
      { x: 0.2, y: 0.2 },
      { x: 0.4, y: 0.2 },
      { x: 0.4, y: 0.4 },
      { x: 0.2, y: 0.4 },
    ];

    expect(isPointInPolygon({ x: 0.3, y: 0.3 }, square)).toBe(true);
    expect(isPointInPolygon({ x: 0.1, y: 0.1 }, square)).toBe(false);
    expect(isPointInPolygon({ x: 0.5, y: 0.5 }, square)).toBe(false);
  });

  it('hits a brush stroke within 0.03 threshold', () => {
    const stroke: Stroke = {
      id: 'brush-1',
      kind: 'brush',
      color: '#FF5C8A',
      size: 0.02,
      points: [
        { x: 0.2, y: 0.2 },
        { x: 0.2, y: 0.6 },
      ],
    };

    // Close to line (dx = 0.02 <= 0.03 + 0.01)
    expect(isStrokeHit({ x: 0.22, y: 0.4 }, stroke, [(p) => p], 0.03)).toBe(true);

    // Far from line (dx = 0.06 > 0.04)
    expect(isStrokeHit({ x: 0.26, y: 0.4 }, stroke, [(p) => p], 0.03)).toBe(false);
  });

  it('never hits a rub-eraser stroke', () => {
    const eraserStroke: Stroke = {
      id: 'eraser-1',
      kind: 'eraser',
      color: '#000000',
      size: 0.04,
      points: [
        { x: 0.2, y: 0.2 },
        { x: 0.2, y: 0.6 },
      ],
    };

    expect(isStrokeHit({ x: 0.2, y: 0.4 }, eraserStroke, [(p) => p], 0.03)).toBe(false);
  });

  it('hits a stamp stroke both inside and near boundary', () => {
    const stampStroke: Stroke = {
      id: 'stamp-1',
      kind: 'stamp',
      color: '#FFD23F',
      size: 0.06,
      points: [
        { x: 0.3, y: 0.3 },
        { x: 0.4, y: 0.3 },
        { x: 0.4, y: 0.4 },
        { x: 0.3, y: 0.4 },
      ],
    };

    // Inside polygon
    expect(isStrokeHit({ x: 0.35, y: 0.35 }, stampStroke, [(p) => p], 0.03)).toBe(true);

    // Near outer edge within 0.03
    expect(isStrokeHit({ x: 0.42, y: 0.35 }, stampStroke, [(p) => p], 0.03)).toBe(true);

    // Too far
    expect(isStrokeHit({ x: 0.46, y: 0.35 }, stampStroke, [(p) => p], 0.03)).toBe(false);
  });

  it('hits original stroke when clicking on its symmetry reflection', () => {
    const stroke: Stroke = {
      id: 'brush-sym-1',
      kind: 'brush',
      color: '#FF5C8A',
      size: 0.02,
      points: [
        { x: 0.2, y: 0.3 },
        { x: 0.2, y: 0.7 },
      ],
    };

    // Under vertical mirror, (0.2, 0.5) reflects to (0.8, 0.5)
    const transforms = [(p: any) => p, mirrorV];

    // Touching the reflected side at (0.81, 0.5) hits the stroke!
    expect(isStrokeHit({ x: 0.81, y: 0.5 }, stroke, transforms, 0.03)).toBe(true);

    // Far from both original and reflected
    expect(isStrokeHit({ x: 0.5, y: 0.5 }, stroke, transforms, 0.03)).toBe(false);
  });
});
