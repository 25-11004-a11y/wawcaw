import { Stroke, Point, Mode, MirrorAxis } from './constants';
import { TransformFn } from './symmetry';
import { FISH_EYE_OFFSET } from './stamps';

export interface ActiveFadingStroke {
  stroke: Stroke;
  alpha: number; // 0 to 1
  hitPoint: Point;
  transforms?: TransformFn[];
}

export interface RenderOptions {
  showGuidelines?: boolean;
  mode?: Mode;
  axis?: MirrorAxis;
  onlyOriginals?: boolean; // When in '짠!' unrevealed mode, only draw original strokes
  hasUnderlay?: boolean; // When trace underlay is shown, keep main canvas background transparent
  fadingStrokes?: ActiveFadingStroke[];
}

/**
 * Draws a single transformed stroke (brush, stamp, or eraser) on the 2D canvas context.
 */
function drawSingleTransformedStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  transform: TransformFn,
  width: number,
  height: number
) {
  const pixelSize = stroke.size * width;

  if (stroke.kind === 'brush' || stroke.kind === 'eraser') {
    if (stroke.points.length === 0) return;

    const transformedPoints = stroke.points.map(transform);

    ctx.save();
    if (stroke.kind === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
    }

    ctx.lineWidth = pixelSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (transformedPoints.length === 1) {
      // Single tap brush/eraser dot
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
    ctx.globalCompositeOperation = 'source-over';
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
      let sumX = 0;
      let sumY = 0;
      for (const p of stroke.points) {
        sumX += p.x;
        sumY += p.y;
      }
      const cx = sumX / stroke.points.length;
      const cy = sumY / stroke.points.length;

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
  ctx.globalCompositeOperation = 'source-over';

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
 * Renders all strokes on a transparent offscreen layer so eraser (destination-out)
 * never cuts away the solid white canvas background or trace pattern underlay.
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

  // 1. Transparent offscreen layer for drawing strokes
  const layerCanvas = document.createElement('canvas');
  layerCanvas.width = width;
  layerCanvas.height = height;
  const layerCtx = layerCanvas.getContext('2d');
  if (!layerCtx) return;

  // If in unrevealed '짠!' mode, only the first transform (identity/original) is drawn
  const activeTransforms = options.onlyOriginals ? [transforms[0]] : transforms;

  // Render all strokes in sequence onto layerCanvas
  for (const stroke of strokes) {
    for (const transform of activeTransforms) {
      drawSingleTransformedStroke(layerCtx, stroke, transform, width, height);
    }
  }

  // 2. Prepare destination canvas
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  if (!options.hasUnderlay) {
    // Fill solid white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  }

  // 3. Composite drawing layer
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(layerCanvas, 0, 0);

  // 3-1. Draw fading strokes and sparkles for stroke eraser (0.2s animation)
  if (options.fadingStrokes && options.fadingStrokes.length > 0) {
    for (const item of options.fadingStrokes) {
      if (item.alpha <= 0) continue;
      const transList = item.transforms || activeTransforms;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, item.alpha));
      for (const t of transList) {
        drawSingleTransformedStroke(ctx, item.stroke, t, width, height);
        // Draw sparkle at hit point
        const transHit = t(item.hitPoint);
        drawSparkle(ctx, transHit.x * width, transHit.y * height, Math.max(10, width * 0.035), item.alpha);
      }
      ctx.restore();
    }
  }

  // 4. Draw guidelines if enabled
  if (options.showGuidelines && options.mode) {
    drawGuidelines(ctx, width, height, options.mode, options.axis || 'vertical');
  }

  ctx.restore();
}

/**
 * Draws a playful 4-point star sparkle at (cx, cy).
 */
function drawSparkle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  alpha: number
) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = '#FFD23F';
  ctx.strokeStyle = '#3A3350';
  ctx.lineWidth = Math.max(1.5, size * 0.1);
  ctx.beginPath();
  const spikes = 4;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? size : size * 0.35;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
