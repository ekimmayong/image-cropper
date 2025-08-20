import { getDetector } from '../detectors/register';
import type { CandidateRect, DetectionMeta, DetectorKey, FrameData } from '../types';

interface PipelineParams {
  frame: FrameData;
  detectors: DetectorKey[];
}

export async function runPipeline({ frame, detectors }: PipelineParams): Promise<{ candidates: CandidateRect[]; meta: DetectionMeta; }> {
  const candidates: CandidateRect[] = [];
  const timings: Record<string, number> = {};
  const scores: Record<string, number> = {};
  const chain: string[] = [];

  for (const key of detectors) {
    const detector = getDetector(key);
    if (!detector || !detector.supports?.(window)) continue;
    chain.push(key);
    const start = performance.now();
    try {
      const result = await detector.detect({ frame, abortSignal: new AbortController().signal } as any);
      timings[key] = performance.now() - start;
      result.rects.forEach(r => {
        candidates.push({ ...r, source: key });
        scores[key] = Math.max(scores[key] || 0, r.score);
      });
      if (scores[key] >= 0.9) break; // early exit
    } catch (e) {
      timings[key] = performance.now() - start;
    }
  }

  if (candidates.length === 0) {
    // fallback: full frame
    candidates.push({ rect: { x: 0, y: 0, width: frame.width, height: frame.height }, score: 0.1, source: 'fallback' });
  }

  const meta: DetectionMeta = { detectorChain: chain, timings, scores };
  return { candidates, meta };
}
