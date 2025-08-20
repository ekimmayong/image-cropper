import { describe, it, expect } from 'vitest';
import { computeCrop } from '../core/crop';
import type { CandidateRect, FrameData } from '../types';

describe('computeCrop', () => {
  function mockFrame(w: number, h: number): FrameData {
    const imageData = { data: new Uint8ClampedArray(w * h * 4), width: w, height: h } as unknown as ImageData;
    return { width: w, height: h, canvas: {} as any, ctx: {} as any, imageData };
  }

  it('selects highest score candidate', () => {
    const frame = mockFrame(1000, 1000);
    const candidates: CandidateRect[] = [
      { rect: { x: 0, y: 0, width: 400, height: 400 }, score: 0.4, source: 'a' },
      { rect: { x: 100, y: 100, width: 300, height: 300 }, score: 0.8, source: 'b' }
    ];
    const result = computeCrop({ frame, candidates, aspectRatios: [1] });
    expect(result.rect.width).toBeGreaterThan(0);
  });
});
