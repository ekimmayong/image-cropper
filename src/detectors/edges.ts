import type { Detector, DetectorContext, DetectorResult } from './base';

export const edgesDetector: Detector = {
  key: 'edges',
  supports: () => true,
  async detect({ frame }: DetectorContext): Promise<DetectorResult> {
    // Extremely naive placeholder: return nearly full frame with moderate score
    const margin = Math.round(Math.min(frame.width, frame.height) * 0.05);
    return {
      rects: [
        { rect: { x: margin, y: margin, width: frame.width - margin * 2, height: frame.height - margin * 2 }, score: 0.4 }
      ]
    };
  }
};
