export type AspectRatioLike = number | { width: number; height: number };
export interface CropRect { x: number; y: number; width: number; height: number; }
export interface CandidateRect { rect: CropRect; score: number; source: string; }
export interface DetectionMeta { detectorChain: string[]; timings: Record<string, number>; scores: Record<string, number>; }
export type DetectorKey = 'face' | 'saliency' | 'edges' | 'document' | string;

export interface FrameData {
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  imageData: ImageData;
}

export interface GenericFrame { width: number; height: number; data: Uint8ClampedArray; }
export interface FrameProvider { capture(): Promise<GenericFrame> | GenericFrame; destroy(): void; }
