import { describe, it, expect } from 'vitest';
import { calculateTogetherMatch, getMatchFeedback } from './togetherMatch';
import { Stroke } from './constants';

describe('Together Mode Match Percentage Calculation', () => {
  it('returns 0 when strokes are empty', () => {
    expect(calculateTogetherMatch([])).toBe(0);
  });

  it('returns 0 when only left side has strokes', () => {
    const strokes: Stroke[] = [
      {
        id: '1',
        kind: 'brush',
        color: '#FF5C8A',
        size: 0.02,
        owner: 'left',
        points: [
          { x: 0.2, y: 0.2 },
          { x: 0.4, y: 0.4 },
        ],
      },
    ];
    expect(calculateTogetherMatch(strokes)).toBe(0);
  });

  it('returns 0 when only right side has strokes', () => {
    const strokes: Stroke[] = [
      {
        id: '1',
        kind: 'brush',
        color: '#3FA7FF',
        size: 0.02,
        owner: 'right',
        points: [
          { x: 0.8, y: 0.2 },
          { x: 0.6, y: 0.4 },
        ],
      },
    ];
    expect(calculateTogetherMatch(strokes)).toBe(0);
  });

  it('returns near 100 for perfectly symmetric strokes', () => {
    // Left: line from (0.4, 0.2) to (0.2, 0.8)
    // Mirrored across x=0.5 -> Right: line from (0.6, 0.2) to (0.8, 0.8)
    const strokes: Stroke[] = [
      {
        id: 'left-1',
        kind: 'brush',
        color: '#FF5C8A',
        size: 0.04,
        owner: 'left',
        points: [
          { x: 0.4, y: 0.2 },
          { x: 0.3, y: 0.5 },
          { x: 0.2, y: 0.8 },
        ],
      },
      {
        id: 'right-1',
        kind: 'brush',
        color: '#3FA7FF',
        size: 0.04,
        owner: 'right',
        points: [
          { x: 0.6, y: 0.2 },
          { x: 0.7, y: 0.5 },
          { x: 0.8, y: 0.8 },
        ],
      },
    ];
    const match = calculateTogetherMatch(strokes);
    expect(match).toBeGreaterThanOrEqual(95);
  });

  it('tolerates small hand tremors and returns a high score', () => {
    // Left line and slightly offset right line
    const strokes: Stroke[] = [
      {
        id: 'left-1',
        kind: 'brush',
        color: '#FF5C8A',
        size: 0.03,
        owner: 'left',
        points: [
          { x: 0.4, y: 0.2 },
          { x: 0.3, y: 0.5 },
          { x: 0.2, y: 0.8 },
        ],
      },
      {
        id: 'right-1',
        kind: 'brush',
        color: '#3FA7FF',
        size: 0.03,
        owner: 'right',
        points: [
          { x: 0.61, y: 0.21 },
          { x: 0.69, y: 0.51 },
          { x: 0.79, y: 0.79 },
        ],
      },
    ];
    const match = calculateTogetherMatch(strokes);
    expect(match).toBeGreaterThanOrEqual(80);
  });

  it('returns a low score for completely mismatched strokes', () => {
    // Left on top-left, right on bottom-right
    const strokes: Stroke[] = [
      {
        id: 'left-1',
        kind: 'brush',
        color: '#FF5C8A',
        size: 0.03,
        owner: 'left',
        points: [
          { x: 0.1, y: 0.1 },
          { x: 0.2, y: 0.2 },
        ],
      },
      {
        id: 'right-1',
        kind: 'brush',
        color: '#3FA7FF',
        size: 0.03,
        owner: 'right',
        points: [
          { x: 0.6, y: 0.9 },
          { x: 0.7, y: 0.8 },
        ],
      },
    ];
    const match = calculateTogetherMatch(strokes);
    expect(match).toBeLessThanOrEqual(15);
  });

  it('provides appropriate feedback messages', () => {
    expect(getMatchFeedback(95).emoji).toBe('🌟');
    expect(getMatchFeedback(80).emoji).toBe('✨');
    expect(getMatchFeedback(60).emoji).toBe('👍');
    expect(getMatchFeedback(30).emoji).toBe('🎨');
    expect(getMatchFeedback(0).emoji).toBe('🪞');
  });
});
