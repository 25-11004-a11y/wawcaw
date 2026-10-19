import { Stroke, ArtworkMode, ArtworkAxis } from './constants';
import { getTransforms } from './symmetry';
import { renderCanvas } from './renderer';

/**
 * Renders the artwork onto an offscreen canvas at the specified resolution
 * and exports it as a clean PNG or JPEG data URL with a solid white background.
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
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  if (mode === 'together') {
    // In 'together' mode, both users drew manually without automated symmetry
    renderCanvas(canvas, strokes, [(p) => p], {
      showGuidelines: false,
      onlyOriginals: false,
    });
  } else {
    // In 'mirror' or 'spin' mode, apply symmetry transforms
    const symmetryMode = mode === 'spin' ? 'spin' : 'mirror';
    const mirrorAxis = axis === 'horizontal' || axis === 'both' ? axis : 'vertical';
    const transforms = getTransforms(symmetryMode, mirrorAxis);

    renderCanvas(canvas, strokes, transforms, {
      showGuidelines: false,
      mode: symmetryMode,
      axis: mirrorAxis,
      onlyOriginals: false,
    });
  }

  return canvas.toDataURL(format, quality);
}
