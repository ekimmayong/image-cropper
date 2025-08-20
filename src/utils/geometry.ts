import type { CropRect } from '../types';

export function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

export function intersect(a: CropRect, b: CropRect): CropRect | null {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x1 || y2 <= y1) return null;
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}
