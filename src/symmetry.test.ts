import { describe, it, expect } from 'vitest';
import { mirrorV, mirrorH, pointSym, getTransforms, identity } from './symmetry';
import { Point } from './constants';

describe('Symmetry Pure Functions', () => {
  const samplePoint: Point = { x: 0.2, y: 0.3 };

  it('(0.2, 0.3) translates to (0.8, 0.3) with mirrorV', () => {
    const result = mirrorV(samplePoint);
    expect(result.x).toBeCloseTo(0.8);
    expect(result.y).toBeCloseTo(0.3);
  });

  it('(0.2, 0.3) translates to (0.2, 0.7) with mirrorH', () => {
    const result = mirrorH(samplePoint);
    expect(result.x).toBeCloseTo(0.2);
    expect(result.y).toBeCloseTo(0.7);
  });

  it('(0.2, 0.3) translates to (0.8, 0.7) with pointSym', () => {
    const result = pointSym(samplePoint);
    expect(result.x).toBeCloseTo(0.8);
    expect(result.y).toBeCloseTo(0.7);
  });

  it('applying the same transform twice returns the original point (involution)', () => {
    expect(mirrorV(mirrorV(samplePoint))).toEqual(samplePoint);
    expect(mirrorH(mirrorH(samplePoint))).toEqual(samplePoint);
    expect(pointSym(pointSym(samplePoint))).toEqual(samplePoint);
    expect(identity(samplePoint)).toEqual(samplePoint);
  });

  it('mirrorV followed by mirrorH produces the same point as pointSym', () => {
    const step1 = mirrorV(samplePoint);
    const step2 = mirrorH(step1);
    const directPointSym = pointSym(samplePoint);

    expect(step2.x).toBeCloseTo(directPointSym.x);
    expect(step2.y).toBeCloseTo(directPointSym.y);
  });

  it('getTransforms returns the correct transforms according to mode and axis', () => {
    // mirror + vertical: [original, mirrorV]
    const mirrorVTransforms = getTransforms('mirror', 'vertical');
    expect(mirrorVTransforms).toHaveLength(2);
    expect(mirrorVTransforms[0](samplePoint)).toEqual(samplePoint);
    expect(mirrorVTransforms[1](samplePoint)).toEqual({ x: 0.8, y: 0.3 });

    // mirror + horizontal: [original, mirrorH]
    const mirrorHTransforms = getTransforms('mirror', 'horizontal');
    expect(mirrorHTransforms).toHaveLength(2);
    expect(mirrorHTransforms[0](samplePoint)).toEqual(samplePoint);
    expect(mirrorHTransforms[1](samplePoint)).toEqual({ x: 0.2, y: 0.7 });

    // mirror + both: [original, mirrorV, mirrorH, pointSym]
    const mirrorBothTransforms = getTransforms('mirror', 'both');
    expect(mirrorBothTransforms).toHaveLength(4);

    // spin: [original, pointSym]
    const spinTransforms = getTransforms('spin');
    expect(spinTransforms).toHaveLength(2);
    expect(spinTransforms[0](samplePoint)).toEqual(samplePoint);
    expect(spinTransforms[1](samplePoint)).toEqual({ x: 0.8, y: 0.7 });
  });
});
