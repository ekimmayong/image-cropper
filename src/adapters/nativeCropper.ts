import type { AspectRatioLike, CropRect, GenericFrame, FrameProvider } from '../types';

export interface NativeImageCropperOptions {
  frameProvider: FrameProvider;
  aspectRatio?: AspectRatioLike | AspectRatioLike[];
  outputAdapter?: (args: { frame: GenericFrame; rect: CropRect }) => Promise<any> | any;
}

export interface NativeCaptureResult {
  rect: CropRect;
  data?: Uint8ClampedArray; // Cropped RGBA buffer if no outputAdapter provided
  output?: any; // Result of custom outputAdapter
}

export interface NativeImageCropper {
  captureAndCrop(options?: Partial<NativeImageCropperOptions>): Promise<NativeCaptureResult>;
  destroy(): void;
}

export function createNativeImageCropper(opts: NativeImageCropperOptions): NativeImageCropper {
  const {
    frameProvider,
    aspectRatio = 1,
    outputAdapter,
  } = opts;

  const aspectList: AspectRatioLike[] = Array.isArray(aspectRatio) ? aspectRatio : [aspectRatio];

  async function captureAndCrop(override: Partial<NativeImageCropperOptions> = {}): Promise<NativeCaptureResult> {
    const frame = await Promise.resolve((override.frameProvider || frameProvider).capture());
    const arList = override.aspectRatio ? (Array.isArray(override.aspectRatio) ? override.aspectRatio : [override.aspectRatio]) : aspectList;

    let best: { rect: CropRect; retained: number } | null = null;
    for (const ar of arList) {
      const ratio = typeof ar === 'number' ? ar : ar.width / ar.height;
      const rect = fitAspect(frame.width, frame.height, ratio);
      const retained = (rect.width * rect.height) / (frame.width * frame.height);
      if (!best || retained > best.retained) best = { rect, retained };
    }
    const rect = best!.rect;

    const adapter = override.outputAdapter || outputAdapter;
    if (adapter) {
      const output = await adapter({ frame, rect });
      return { rect, output };
    }

    const data = cropBuffer(frame, rect);
    return { rect, data };
  }

  function destroy() {
    frameProvider.destroy();
  }

  return { captureAndCrop, destroy };
}

function fitAspect(width: number, height: number, aspect: number): CropRect {
  const current = width / height;
  if (Math.abs(current - aspect) < 1e-6) return { x: 0, y: 0, width, height };
  if (current > aspect) {
    // too wide -> crop sides
    const targetWidth = Math.round(height * aspect);
    const x = Math.round((width - targetWidth) / 2);
    return { x, y: 0, width: targetWidth, height };
  } else {
    // too tall -> crop top/bottom
    const targetHeight = Math.round(width / aspect);
    const y = Math.round((height - targetHeight) / 2);
    return { x: 0, y, width, height: targetHeight };
  }
}

function cropBuffer(frame: GenericFrame, rect: CropRect): Uint8ClampedArray {
  const { data, width } = frame;
  const out = new Uint8ClampedArray(rect.width * rect.height * 4);
  let o = 0;
  for (let y = 0; y < rect.height; y++) {
    const srcY = rect.y + y;
    const rowStart = (srcY * width + rect.x) * 4;
    const rowEnd = rowStart + rect.width * 4;
    out.set(data.subarray(rowStart, rowEnd), o);
    o += rect.width * 4;
  }
  return out;
}
