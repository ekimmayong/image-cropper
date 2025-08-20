import type { CropRect, FrameData } from '../types';

export interface OutputOptions { type: 'blob' | 'dataUrl' | 'canvas' | 'imageBitmap'; mime?: string; quality?: number; }

interface FormatParams {
  frame: FrameData;
  crop: CropRect;
  output: OutputOptions;
  maxWidth?: number;
}

export async function formatOutput({ frame, crop, output, maxWidth }: FormatParams): Promise<any> {
  const { canvas } = frame;
  const outCanvas = document.createElement('canvas');
  const scale = maxWidth ? Math.min(1, maxWidth / crop.width) : 1;
  outCanvas.width = Math.round(crop.width * scale);
  outCanvas.height = Math.round(crop.height * scale);
  const ctx = outCanvas.getContext('2d')!;
  ctx.drawImage(canvas, crop.x, crop.y, crop.width, crop.height, 0, 0, outCanvas.width, outCanvas.height);

  switch (output.type) {
    case 'canvas':
      return { canvas: outCanvas };
    case 'imageBitmap':
      return { imageBitmap: await createImageBitmap(outCanvas) };
    case 'dataUrl':
      return { dataUrl: outCanvas.toDataURL(output.mime || 'image/png', output.quality) };
    case 'blob':
    default:
      return new Promise(resolve => {
        outCanvas.toBlob(blob => resolve({ blob }), output.mime || 'image/jpeg', output.quality);
      });
  }
}
