import { createCamera } from './core/camera';
import { runPipeline } from './core/pipeline';
import { computeCrop } from './core/crop';
import { formatOutput, OutputOptions } from './core/output';
import { registerBuiltInDetectors } from './detectors/register';
import type { CropRect, DetectionMeta, DetectorKey, AspectRatioLike } from './types';

export interface CropperOptions {
  videoEl?: HTMLVideoElement | null;
  constraints?: MediaStreamConstraints;
  aspectRatio?: AspectRatioLike | AspectRatioLike[];
  detectors?: DetectorKey[];
  output?: OutputOptions;
  maxWidth?: number;
  composition?: { ruleOfThirdsWeight?: number; centerBias?: number };
  debug?: boolean;
}

export interface CaptureResult {
  blob?: Blob;
  dataUrl?: string;
  canvas?: HTMLCanvasElement;
  imageBitmap?: ImageBitmap;
  rect: CropRect;
  meta: DetectionMeta;
}

export interface ImageCropper {
  captureAndCrop(options?: Partial<CropperOptions>): Promise<CaptureResult>;
  destroy(): void;
}

export async function createImageCropper(options: CropperOptions = {}): Promise<ImageCropper> {
  const {
    videoEl = null,
    constraints = { video: { facingMode: 'user', width: 1280, height: 720 } },
    aspectRatio = 1,
    detectors = ['document', 'face', 'saliency', 'edges'],
    output = { type: 'blob', mime: 'image/jpeg', quality: 0.9 },
    maxWidth,
  } = options;

  registerBuiltInDetectors();

  const camera = await createCamera({ videoEl, constraints });

  async function captureAndCrop(override: Partial<CropperOptions> = {}): Promise<CaptureResult> {
    const frame = camera.captureFrame();
    const detectorKeys = override.detectors || detectors;
    const pipelineResult = await runPipeline({ frame, detectors: detectorKeys });

    const crop = computeCrop({
      frame,
      candidates: pipelineResult.candidates,
      aspectRatios: Array.isArray(aspectRatio) ? aspectRatio : [aspectRatio],
    });

    const formatted = await formatOutput({
      frame,
      crop: crop.rect,
      output: override.output || output,
      maxWidth: override.maxWidth || maxWidth,
    });

    return { ...formatted, rect: crop.rect, meta: pipelineResult.meta };
  }

  function destroy() {
    camera.destroy();
  }

  return { captureAndCrop, destroy };
}
