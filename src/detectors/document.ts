import type { Detector, DetectorContext, DetectorResult } from './base';

// Simple placeholder document detector:
// Scans a coarse grid for strong luminance variance to approximate document bounds.
export const documentDetector: Detector = {
  key: 'document',
  supports: () => true,
  async detect({ frame }: DetectorContext): Promise<DetectorResult> {
    const { imageData, width, height } = frame as any;
    const data: Uint8ClampedArray | undefined = (imageData && (imageData.data as any)) || undefined;
    if (!data) return { rects: [] };

    // Coarse sampling
    const stepX = Math.max(8, Math.floor(width / 80));
    const stepY = Math.max(8, Math.floor(height / 80));
    let minX = width, minY = height, maxX = 0, maxY = 0;
    let hits = 0;
    for (let y = 0; y < height; y += stepY) {
      for (let x = 0; x < width; x += stepX) {
        const i = (y * width + x) * 4;
        const r = data[i]; const g = data[i + 1]; const b = data[i + 2];
        // luminance
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        // crude edge / contrast heuristic: sample right+down if possible
        if (x + stepX < width && y + stepY < height) {
          const j = (y * width + (x + stepX)) * 4;
          const k = ((y + stepY) * width + x) * 4;
          const lumR = 0.2126 * data[j] + 0.7152 * data[j + 1] + 0.0722 * data[j + 2];
          const lumD = 0.2126 * data[k] + 0.7152 * data[k + 1] + 0.0722 * data[k + 2];
          const diff = Math.max(Math.abs(lum - lumR), Math.abs(lum - lumD));
          if (diff > 28) { // arbitrary threshold
            hits++;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
    }

    if (hits < 10) {
      return { rects: [] }; // not enough contrast evidence
    }

    // Pad bounds slightly
    const padX = Math.min(20, width * 0.02);
    const padY = Math.min(20, height * 0.02);
    minX = Math.max(0, minX - padX);
    minY = Math.max(0, minY - padY);
    maxX = Math.min(width, maxX + padX);
    maxY = Math.min(height, maxY + padY);
    const w = Math.max(1, maxX - minX);
    const h = Math.max(1, maxY - minY);
    const corners = [
      { x: minX, y: minY },
      { x: minX + w, y: minY },
      { x: minX + w, y: minY + h },
      { x: minX, y: minY + h }
    ];
    // Score: coverage * edge density factor
    const coverage = (w * h) / (width * height);
    const edgeDensity = hits / ((width / stepX) * (height / stepY));
    const score = Math.min(0.85, 0.3 + coverage * 0.3 + edgeDensity * 0.4);

    return { rects: [{ rect: { x: minX, y: minY, width: w, height: h }, score }], meta: { corners } };
  }
};
