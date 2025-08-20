import type { Detector, DetectorContext, DetectorResult } from './base';

export const saliencyDetector: Detector = {
  key: 'saliency',
  supports: () => true,
  async detect({ frame }: DetectorContext): Promise<DetectorResult> {
    // Placeholder: center weighted rectangle
    const w = frame.width * 0.5;
    const h = frame.height * 0.5;
    const rect = { x: frame.width * 0.25, y: frame.height * 0.25, width: w, height: h };
    return { rects: [{ rect, score: 0.6 }] };
  }
};
