import type { Detector, DetectorContext, DetectorResult } from './base';

// Experimental quad-based document detector (classical, no ML):
// 1. Downscale
// 2. Grayscale + blur
// 3. Gradient magnitude (Sobel)
// 4. Threshold edges
// 5. Bounding quad approximation (convex hull -> simplify to 4 points)
// NOTE: This is a lightweight placeholder; refine for production.
export const documentQuadDetector: Detector = {
  key: 'document-quad',
  supports: () => true,
  async detect({ frame }: DetectorContext): Promise<DetectorResult> {
    const { imageData, width, height } = frame as any;
    if (!imageData) return { rects: [] };
    const targetMax = 800;
    const scale = Math.min(1, targetMax / Math.max(width, height));
    const dw = Math.max(1, Math.round(width * scale));
    const dh = Math.max(1, Math.round(height * scale));

    // Downscale via canvas draw (already have full-res imageData in frame.canvas)
    const tmp = document.createElement('canvas');
    tmp.width = dw; tmp.height = dh;
    const tctx = tmp.getContext('2d')!;
    tctx.drawImage(frame.canvas, 0, 0, width, height, 0, 0, dw, dh);
    const small = tctx.getImageData(0, 0, dw, dh);
    const g = new Float32Array(dw * dh);

    // Grayscale + simple blur (box 3x3)
    for (let i = 0; i < dw * dh; i++) {
      const idx = i * 4; const r = small.data[idx]; const gg = small.data[idx + 1]; const b = small.data[idx + 2];
      g[i] = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
    }
    const blur = new Float32Array(dw * dh);
    for (let y = 1; y < dh - 1; y++) {
      for (let x = 1; x < dw - 1; x++) {
        let sum = 0; for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) sum += g[(y + yy) * dw + (x + xx)];
        blur[y * dw + x] = sum / 9;
      }
    }

    // Sobel
    const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    const mag = new Float32Array(dw * dh);
    for (let y = 1; y < dh - 1; y++) {
      for (let x = 1; x < dw - 1; x++) {
        let sx = 0, sy = 0, k = 0;
        for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) {
          const val = blur[(y + yy) * dw + (x + xx)];
          sx += gx[k] * val; sy += gy[k] * val; k++;
        }
        mag[y * dw + x] = Math.hypot(sx, sy);
      }
    }

    // Threshold (adaptive simple: mean * factor)
    let sum = 0; for (let i = 0; i < mag.length; i++) sum += mag[i];
    const mean = sum / mag.length;
    const thresh = mean * 2.5; // heuristic
    const pts: { x: number; y: number }[] = [];
    for (let y = 1; y < dh - 1; y += 2) {
      for (let x = 1; x < dw - 1; x += 2) {
        if (mag[y * dw + x] > thresh) pts.push({ x, y });
      }
    }
    if (pts.length < 20) return { rects: [] };

    // Convex hull (Graham scan)
    pts.sort((a, b) => a.y === b.y ? a.x - b.x : a.y - b.y);
    function cross(o: any, a: any, b: any) { return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x); }
    const lower: any[] = [];
    for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
    const upper: any[] = [];
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
    upper.pop(); lower.pop();
    const hull = lower.concat(upper);
    if (hull.length < 4) return { rects: [] };

    // Simplify hull to 4 extremes (min x+y, max x-y, max x+y, min x-y) as crude quad
    let tl = hull[0], tr = hull[0], br = hull[0], bl = hull[0];
    for (const p of hull) {
      if (p.x + p.y < tl.x + tl.y) tl = p;
      if (p.x - p.y > tr.x - tr.y) tr = p;
      if (p.x + p.y > br.x + br.y) br = p;
      if (p.x - p.y < bl.x - bl.y) bl = p;
    }
    const quadSmall = [tl, tr, br, bl];

    // Map back to original coordinates
    const quad = quadSmall.map(p => ({ x: p.x / scale, y: p.y / scale }));
    // Bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of quad) { if (c.x < minX) minX = c.x; if (c.y < minY) minY = c.y; if (c.x > maxX) maxX = c.x; if (c.y > maxY) maxY = c.y; }
    const rect = { x: Math.max(0, Math.round(minX)), y: Math.max(0, Math.round(minY)), width: Math.round(maxX - minX), height: Math.round(maxY - minY) };

    const coverage = (rect.width * rect.height) / (width * height);
    const score = Math.min(0.95, 0.4 + Math.min(0.4, coverage * 0.6) + 0.15);

    return { rects: [{ rect, score }], meta: { quad } };
  }
};
