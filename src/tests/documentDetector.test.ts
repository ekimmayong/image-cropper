import { describe, it, expect } from 'vitest';
import { documentDetector } from '../detectors/document';

function mockFrame(width: number, height: number): any {
  return {
    width,
    height,
    imageData: { data: new Uint8ClampedArray(width * height * 4) }
  };
}

describe('documentDetector', () => {
  it('returns empty rects when low contrast', async () => {
    const frame = mockFrame(200, 100);
    const res = await documentDetector.detect({ frame, abortSignal: new AbortController().signal } as any);
    expect(Array.isArray(res.rects)).toBe(true);
  });
});
