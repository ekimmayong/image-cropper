import type { FrameData } from '../types';

interface CameraOptions {
  videoEl?: HTMLVideoElement | null;
  constraints?: MediaStreamConstraints;
}

export interface CameraHandle {
  captureFrame(): FrameData;
  destroy(): void;
}

export async function createCamera(opts: CameraOptions): Promise<CameraHandle> {
  const { videoEl = null, constraints = { video: { facingMode: 'user', width: 1280, height: 720 } } } = opts;
  const stream = await navigator.mediaDevices.getUserMedia(constraints as MediaStreamConstraints);
  const video = videoEl || Object.assign(document.createElement('video'), { playsInline: true, autoplay: true }) as HTMLVideoElement;
  video.srcObject = stream;
  if (!videoEl) {
    video.style.position = 'absolute';
    video.style.left = '-9999px';
    document.body.appendChild(video);
  }
  await video.play();

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  function captureFrame(): FrameData {
    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w; canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    return { width: w, height: h, canvas, ctx, imageData };
  }

  function destroy() {
    stream.getTracks().forEach(t => t.stop());
    if (!videoEl && video.parentNode) video.parentNode.removeChild(video);
  }

  return { captureFrame, destroy };
}
