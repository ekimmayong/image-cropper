import type { AspectRatioLike, CropRect, GenericFrame, FrameProvider } from '../types';

export interface NativeImageCropperOptions {
  frameProvider: FrameProvider;
  aspectRatio?: AspectRatioLike | AspectRatioLike[];
  outputAdapter?: (args: { frame: GenericFrame; rect: CropRect }) => Promise<any> | any;
  detectors?: string[]; // currently supports 'document'
}

export interface NativeCaptureResult {
  rect: CropRect;
  data?: Uint8ClampedArray; // Cropped RGBA buffer if no outputAdapter provided
  output?: any; // Result of custom outputAdapter
  meta?: Record<string, any>;
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
    detectors = ['document'],
  } = opts;

  const aspectList: AspectRatioLike[] = Array.isArray(aspectRatio) ? aspectRatio : [aspectRatio];

  async function captureAndCrop(override: Partial<NativeImageCropperOptions> = {}): Promise<NativeCaptureResult> {
    const effectiveFrameProvider = override.frameProvider || frameProvider;
    const frame = await Promise.resolve(effectiveFrameProvider.capture());
    const arList = override.aspectRatio ? (Array.isArray(override.aspectRatio) ? override.aspectRatio : [override.aspectRatio]) : aspectList;
    const detectorList = override.detectors || detectors;

    let chosenRect: CropRect | null = null;
    const detectorMeta: any = {};

    if (detectorList.includes('document')) {
      const doc = detectDocument(frame);
      if (doc) {
        chosenRect = doc.rect;
        detectorMeta.document = { score: doc.score, hits: doc.hits };
      }
    }

    if (!chosenRect) {
      // fallback to aspect fitting (retain largest area across provided ratios)
      let best: { rect: CropRect; retained: number } | null = null;
      for (const ar of arList) {
        const ratio = typeof ar === 'number' ? ar : ar.width / ar.height;
        const rect = fitAspect(frame.width, frame.height, ratio);
        const retained = (rect.width * rect.height) / (frame.width * frame.height);
        if (!best || retained > best.retained) best = { rect, retained };
      }
      chosenRect = best!.rect;
    }

    const adapter = override.outputAdapter || outputAdapter;
    if (adapter) {
      const output = await adapter({ frame, rect: chosenRect });
      return { rect: chosenRect, output, meta: detectorMeta };
    }

    const data = cropBuffer(frame, chosenRect);
    return { rect: chosenRect, data, meta: detectorMeta };
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
    const targetWidth = Math.round(height * aspect);
    const x = Math.round((width - targetWidth) / 2);
    return { x, y: 0, width: targetWidth, height };
  } else {
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

// Lightweight document detection on RGBA buffer mirroring browser placeholder logic.
function detectDocument(frame: GenericFrame): { rect: CropRect; score: number; hits: number } | null {
  const { data, width, height } = frame;
  if (!data) return null;
  const stepX = Math.max(8, Math.floor(width / 80));
  const stepY = Math.max(8, Math.floor(height / 80));
  let minX = width, minY = height, maxX = 0, maxY = 0, hits = 0;
  for (let y = 0; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      const i = (y * width + x) * 4;
      const r = data[i]; const g = data[i + 1]; const b = data[i + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (x + stepX < width && y + stepY < height) {
        const j = (y * width + (x + stepX)) * 4;
        const k = ((y + stepY) * width + x) * 4;
        const lumR = 0.2126 * data[j] + 0.7152 * data[j + 1] + 0.0722 * data[j + 2];
        const lumD = 0.2126 * data[k] + 0.7152 * data[k + 1] + 0.0722 * data[k + 2];
        const diff = Math.max(Math.abs(lum - lumR), Math.abs(lum - lumD));
        if (diff > 28) {
          hits++;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
  }
  if (hits < 10) return null;
  const padX = Math.min(20, width * 0.02);
  const padY = Math.min(20, height * 0.02);
  minX = Math.max(0, minX - padX);
  minY = Math.max(0, minY - padY);
  maxX = Math.min(width, maxX + padX);
  maxY = Math.min(height, maxY + padY);
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  const coverage = (w * h) / (width * height);
  const edgeDensity = hits / ((width / stepX) * (height / stepY));
  const score = Math.min(0.85, 0.3 + coverage * 0.3 + edgeDensity * 0.4);
  return { rect: { x: minX, y: minY, width: w, height: h }, score, hits };
}
