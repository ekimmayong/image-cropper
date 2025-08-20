import type { AspectRatioLike, CandidateRect, CropRect, FrameData } from '../types';
import { clamp } from '../utils/geometry';

interface ComputeCropParams {
  frame: FrameData;
  candidates: CandidateRect[];
  aspectRatios: AspectRatioLike[];
}

export function computeCrop({ frame, candidates, aspectRatios }: Omit<ComputeCropParams, 'composition'>): { rect: CropRect; score: number; } {
  const ars = aspectRatios.map(ar => typeof ar === 'number' ? { width: ar, height: 1 } : ar);
  let best: { rect: CropRect; score: number } | null = null;
  for (const ar of ars) {
    const targetRatio = ar.width / ar.height;
    for (const cand of candidates) {
      const fitted = fitRectToAspect(cand.rect, targetRatio, frame.width, frame.height);
      const composed = adjustForComposition(fitted);
      const score = cand.score * 0.6 + compositionScore() * 0.3 + sizeCoverage(composed, frame) * 0.1;
      if (!best || score > best.score) best = { rect: composed, score };
    }
  }
  return best || { rect: { x: 0, y: 0, width: frame.width, height: frame.height }, score: 0 };
}

function fitRectToAspect(subject: CropRect, ratio: number, maxW: number, maxH: number): CropRect {
  let w = subject.width; let h = subject.height;
  const current = w / h;
  if (current > ratio) {
    // too wide, increase height
    h = w / ratio;
  } else {
    // too tall, increase width
    w = h * ratio;
  }
  const cx = subject.x + subject.width / 2;
  const cy = subject.y + subject.height / 2;
  let x = cx - w / 2;
  let y = cy - h / 2;
  x = clamp(x, 0, maxW - w);
  y = clamp(y, 0, maxH - h);
  if (w > maxW) { w = maxW; x = 0; }
  if (h > maxH) { h = maxH; y = 0; }
  return { x, y, width: w, height: h };
}

function adjustForComposition(fitted: CropRect): CropRect {
  return fitted;
}

function compositionScore(): number {
  return 0.5;
}

function sizeCoverage(rect: CropRect, frame: FrameData): number {
  const coverage = (rect.width * rect.height) / (frame.width * frame.height);
  return Math.min(1, coverage);
}
