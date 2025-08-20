import type { CropRect, FrameData } from '../types';

export interface DetectorContext { frame: FrameData; abortSignal: AbortSignal; }
export interface DetectorResult { rects: { rect: CropRect; score: number }[]; meta?: any; }
export interface Detector { key: string; supports(env: any): boolean; detect(ctx: DetectorContext): Promise<DetectorResult>; }

export type DetectorRegistry = Map<string, Detector>;
