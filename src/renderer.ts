import { Stroke, Point, Mode, MirrorAxis } from './constants';
import { TransformFn } from './symmetry';
import { FISH_EYE_OFFSET } from './stamps';

export interface RenderOptions {
  showGuidelines?: boolean;
  mode?: Mode;
  axis?: MirrorAxis;
  onlyOriginals?: boolean; // When in '짠!' unrevealed mode, only draw original strokes
}

/**
 * Draws a single transformed stroke (brush or stamp) on the 2D canvas context.
 */
function drawSingleTransformedStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  transform: TransformFn,
  width: number,
  height: number
) {
  const pixelSize = stroke.size * width;

  if (stroke.kind === 'brush') {
    if (stroke.points.length === 0) return;

    const transformedPoints = stroke.points.map(transform);

    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = pixelSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (transformedPoints.length === 1) {
      // Single tap brush dot
      const pt = transformedPoints[0];
      ctx.beginPath();
      ctx.arc(pt.x * width, pt.y * height, pixelSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Smooth curve with midpoints
      ctx.beginPath();
      const p0 = transformedPoints[0];
      ctx.moveTo(p0.x * width, p0.y * height);

      for (let i = 1; i < transformedPoints.length - 1; i++) {
        const pCurr = transformedPoints[i];
        const pNext = transformedPoints[i + 1];
        const midX = (pCurr.x + pNext.x) / 2;
        const midY = (pCurr.y + pNext.y) / 2;
        ctx.quadraticCurveTo(
          pCurr.x * width,
          pCurr.y * height,
          midX * width,
          midY * height
        );
      }

      // Final point
      const last = transformedPoints[transformedPoints.length - 1];
      ctx.lineTo(last.x * width, last.y * height);
      ctx.stroke();
    }
    ctx.restore();
  } else if (stroke.kind === 'stamp') {
    if (stroke.points.length < 3) return;

    const transformedPoints = stroke.points.map(transform);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(transformedPoints[0].x * width, transformedPoints[0].y * height);

    for (let i = 1; i < transformedPoints.length; i++) {
      ctx.lineTo(transformedPoints[i].x * width, transformedPoints[i].y * height);
    }
    ctx.closePath();

    // Fill with selected color
    ctx.fillStyle = stroke.color;
    ctx.fill();

    // Dark friendly outline
    ctx.strokeStyle = '#3A3350';
    ctx.lineWidth = Math.max(2, width * 0.005);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Special detail for fish: transformed eye dot
    if (stroke.stampShape === 'fish' && stroke.points.length > 0) {
      // Calculate center of original fish
      let sumX = 0;
      let sumY = 0;
      for (const p of stroke.points) {
        sumX += p.x;
        sumY += p.y;
      }
      const cx = sumX / stroke.points.length;
      const cy = sumY / stroke.points.length;

      // Transform eye coordinate
      const origEye: Point = {
        x: cx + FISH_EYE_OFFSET.x * stroke.size,
        y: cy + FISH_EYE_OFFSET.y * stroke.size,
      };
      const transEye = transform(origEye);

      const eyeRadius = Math.max(2.5, width * stroke.size * 0.05);

      // Eye white
      ctx.beginPath();
      ctx.arc(transEye.x * width, transEye.y * height, eyeRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#3A3350';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pupil
      ctx.beginPath();
      ctx.arc(transEye.x * width, transEye.y * height, eyeRadius * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = '#3A3350';
      ctx.fill();
    }

    ctx.restore();
  }
}

/**
 * Draws symmetry guidelines (axes or center point).
 */
function drawGuidelines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mode: Mode,
  axis: MirrorAxis
) {
  ctx.save();

  if (mode === 'mirror') {
    ctx.strokeStyle = '#7FD8BE'; // Mint dashed line as requested
    ctx.lineWidth = Math.max(3, width * 0.008);
    ctx.setLineDash([10, 8]);
    ctx.lineCap = 'round';

    if (axis === 'vertical' || axis === 'both') {
      ctx.beginPath();
      ctx.moveTo(width * 0.5, 0);
      ctx.lineTo(width * 0.5, height);
      ctx.stroke();
    }

    if (axis === 'horizontal' || axis === 'both') {
      ctx.beginPath();
      ctx.moveTo(0, height * 0.5);
      ctx.lineTo(width, height * 0.5);
      ctx.stroke();
    }
  } else {
    // Spin mode: Pink center point and rotating circular arrows
    const cx = width * 0.5;
    const cy = height * 0.5;
    const r = Math.max(16, width * 0.04);

    // Rotating arrow arc
    ctx.strokeStyle = '#FF9EB5';
    ctx.lineWidth = Math.max(2.5, width * 0.007);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI * 0.7, Math.PI * 0.7);
    ctx.stroke();

    // Arrow tip
    const tipAngle = Math.PI * 0.7;
    const tipX = cx + Math.cos(tipAngle) * r;
    const tipY = cy + Math.sin(tipAngle) * r;
    ctx.fillStyle = '#FF9EB5';
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - 6, tipY - 8);
    ctx.lineTo(tipX + 4, tipY - 6);
    ctx.closePath();
    ctx.fill();

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(6, width * 0.016), 0, Math.PI * 2);
    ctx.fillStyle = '#FF9EB5';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#3A3350';
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Main render function for the HTML5 Canvas.
 */
export function renderCanvas(
  canvas: HTMLCanvasElement,
  strokes: Stroke[],
  transforms: TransformFn[],
  options: RenderOptions = {}
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas (white background)
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // If in unrevealed '짠!' mode, only the first transform (identity/original) is drawn
  const activeTransforms = options.onlyOriginals ? [transforms[0]] : transforms;

  // Render all strokes
  for (const stroke of strokes) {
    for (const transform of activeTransforms) {
      drawSingleTransformedStroke(ctx, stroke, transform, width, height);
    }
  }

  // Draw guidelines if enabled
  if (options.showGuidelines && options.mode) {
    drawGuidelines(ctx, width, height, options.mode, options.axis || 'vertical');
  }
}
