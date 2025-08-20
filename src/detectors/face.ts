import type { Detector, DetectorContext, DetectorResult } from './base';

const hasFaceDetector = () => 'FaceDetector' in window;

export const faceDetector: Detector = {
  key: 'face',
  supports: () => hasFaceDetector(),
  async detect({ frame }: DetectorContext): Promise<DetectorResult> {
    if (!hasFaceDetector()) return { rects: [] };
    // @ts-expect-error FaceDetector is experimental browser API
    const fd = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    const detections = await fd.detect(frame.canvas);
    const rects = detections.map((d: any) => ({ rect: { x: d.boundingBox.x, y: d.boundingBox.y, width: d.boundingBox.width, height: d.boundingBox.height }, score: 0.9 }));
    return { rects };
  }
};
