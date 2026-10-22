import { Stroke, ArtworkMode, ArtworkAxis } from './constants';
import { getTransforms } from './symmetry';
import { renderCanvas } from './renderer';

/**
 * Renders the artwork onto an offscreen canvas at the specified resolution
 * and exports it as a clean PNG or JPEG data URL with a solid white background.
 * All strokes (including erasers) are drawn on a transparent layer first,
 * then composited on a solid white canvas to prevent erased spots turning black in JPEG.
 * Guidelines (axes, center point) are never included.
 */
export function exportImage(
  strokes: Stroke[],
  mode: ArtworkMode,
  axis: ArtworkAxis,
  size = 1024,
  format: 'image/png' | 'image/jpeg' = 'image/png',
  quality = 0.8
): string {
  // 1. Transparent offscreen canvas layer for all strokes (including eraser destination-out)
  const layerCanvas = document.createElement('canvas');
  layerCanvas.width = size;
  layerCanvas.height = size;

  if (mode === 'together') {
    renderCanvas(layerCanvas, strokes, [(p) => p], {
      showGuidelines: false,
      onlyOriginals: false,
      hasUnderlay: true, // keeps background transparent
    });
  } else {
    const symmetryMode = mode === 'spin' ? 'spin' : 'mirror';
    const mirrorAxis = axis === 'horizontal' || axis === 'both' ? axis : 'vertical';
    const transforms = getTransforms(symmetryMode, mirrorAxis);

    renderCanvas(layerCanvas, strokes, transforms, {
      showGuidelines: false,
      mode: symmetryMode,
      axis: mirrorAxis,
      onlyOriginals: false,
      hasUnderlay: true, // keeps background transparent
    });
  }

  // 2. Solid white background canvas
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = size;
  finalCanvas.height = size;
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) {
    return layerCanvas.toDataURL(format, quality);
  }

  finalCtx.fillStyle = '#FFFFFF';
  finalCtx.fillRect(0, 0, size, size);

  // 3. Composite transparent stroke layer over solid white
  finalCtx.drawImage(layerCanvas, 0, 0);

  return finalCanvas.toDataURL(format, quality);
}
