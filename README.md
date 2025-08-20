# @ekimmayong/image-cropper

Auto-camera capture and smart cropping library.

## Overview

A lightweight TypeScript library that opens the user camera, grabs a frame, detects the most relevant subject area (face / salient region / edges fallback) and returns a cropped image in the format you choose (Blob, Data URL, Canvas, ImageBitmap). Minimal core (~few KB) with an extensible detector/plugin system.

## Features

- Zero-config camera capture (`getUserMedia` wrapper)
- Multi-detector pipeline (face, saliency placeholder, edges fallback)
- Auto aspect-ratio fitting (single or multiple fallback ratios)
- Output as Blob, Data URL, Canvas, or ImageBitmap
- Tree‑shakeable ESM + CJS builds
- TypeScript types included
- Plugin system for custom detectors (future expansion)
- Debug overlay (planned)

## Installation

```bash
npm install @ekimmayong/image-cropper
# or
pnpm add @ekimmayong/image-cropper
# or
yarn add @ekimmayong/image-cropper
```

## Quick Start

```ts
import { createImageCropper } from "@ekimmayong/image-cropper";

const cropper = await createImageCropper({ aspectRatio: 1 });
const { blob, rect } = await cropper.captureAndCrop();
console.log(rect, blob);
```

## Browser Usage (HTML Demo)

```html
<video id="cam" autoplay playsinline></video>
<button id="capture">Capture</button>
<div id="output"></div>
<script type="module">
  import { createImageCropper } from "https://cdn.skypack.dev/@ekimmayong/image-cropper";
  const cropper = await createImageCropper({
    videoEl: document.getElementById("cam"),
    aspectRatio: { width: 1, height: 1 },
  });
  document.getElementById("capture").onclick = async () => {
    const { dataUrl, rect, meta } = await cropper.captureAndCrop({
      output: { type: "dataUrl" },
    });
    console.log("Crop rect", rect, meta);
    const img = new Image();
    img.src = dataUrl;
    img.width = 200;
    document.getElementById("output").appendChild(img);
  };
</script>
```

## API

### createImageCropper(options)

Returns a `Promise<ImageCropper>`.

#### ImageCropper

- `captureAndCrop(overrideOptions?) => Promise<CaptureResult>`
- `destroy()` – stops camera tracks and cleans up hidden video.

#### CaptureResult

- `blob?` / `dataUrl?` / `canvas?` / `imageBitmap?`
- `rect` (x, y, width, height) – chosen crop rectangle relative to original frame
- `meta` – detection timings & scores

### Options (partial)

- `videoEl?: HTMLVideoElement` Existing video element (library will manage srcObject)
- `constraints?: MediaStreamConstraints` Camera constraints (default 1280x720 front camera)
- `aspectRatio?: number | {width:number;height:number} | (number | object)[]` Accepts list for fallbacks
- `detectors?: string[]` Ordered detector keys (default `['face','saliency','edges']`)
- `output?: { type: 'blob'|'dataUrl'|'canvas'|'imageBitmap'; mime?; quality? }`
- `maxWidth?: number` Max width for scaled output (keeps aspect)

### Output Override Example

```ts
await cropper.captureAndCrop({
  output: { type: "dataUrl", mime: "image/jpeg", quality: 0.85 },
  aspectRatio: [{ width: 4, height: 5 }, 1, 16 / 9],
});
```

## Detectors

Current built-ins (simple placeholders for now):

- `face` – Uses experimental `FaceDetector` API if available.
- `saliency` – Center-weight placeholder rectangle (to be replaced with real saliency model / worker).
- `edges` – Naive edge-density fallback (currently margin crop placeholder).
- `document` – Experimental coarse contrast-based rectangle estimation (placeholder for robust doc detection).

You can change order to prioritize: `detectors: ['saliency','face','edges']`.

Custom detector registration (planned):

```ts
import { registerDetector } from "@ekimmayong/image-cropper/dist/detectors/register";
registerDetector({
  key: "myDetector",
  supports: () => true,
  async detect(ctx) {
    return {
      rects: [
        {
          rect: {
            x: 0,
            y: 0,
            width: ctx.frame.width,
            height: ctx.frame.height,
          },
          score: 0.5,
        },
      ],
    };
  },
});
```

## Handling Permissions

Always invoke `createImageCropper` inside a user gesture (e.g., button click) for better mobile permission UX.

## Fallbacks & Graceful Degradation

If no detectors produce candidates, full-frame fallback is used. You can still constrain aspect ratio via `aspectRatio`.

## Common Patterns

### Circle Avatar From Square Crop

```ts
const { dataUrl } = await cropper.captureAndCrop({
  output: { type: "dataUrl", mime: "image/png" },
});
// Use CSS: img { border-radius: 50%; }
```

### Multiple Aspect Fallbacks

```ts
await cropper.captureAndCrop({ aspectRatio: [1, 4 / 5, 16 / 9] });
```

## Roadmap (Short)

- Real saliency (worker) implementation
- Composition scoring (rule-of-thirds weighting) – currently placeholder
- Debug overlay layer
- Document edge/perspective detection (phase 1: quad detect, phase 2: perspective crop)
- Expanded automated tests (detectors, pipeline performance)

## Development

```bash
npm install
npm run dev    # watch build
npm test       # run vitest
npm run lint   # eslint
npm run build  # build dist
```

## Limitations (Current MVP)

- Composition scoring is stubbed
- Saliency & edges detectors are simplistic placeholders
- No debug overlay yet
- Requires modern browsers with `getUserMedia`

## License

MIT

## Contributing

PRs welcome once core stabilizes. Open an issue to discuss new detector ideas.

## React Native / Expo
Currently a placeholder adapter is exported at `@ekimmayong/image-cropper/react-native` which throws a not implemented error. Planned steps:
1. Add native frame provider (expo-camera / vision-camera).
2. Provide buffer->GenericFrame conversion.
3. Implement pure JS detectors without Canvas reliance.
4. Supply output helpers using expo-image-manipulator.

Import placeholder:
```ts
import { createImageCropper } from '@ekimmayong/image-cropper/react-native';
// Throws until implemented.
```

```ts
// Example (React Native / Expo) pseudo-usage:
import { createImageCropper } from '@ekimmayong/image-cropper/react-native';
import { decodeJpegToRgba } from './your-decode-util';

const frameProvider = {
  async capture() {
    // get base64 jpeg from expo-camera / vision-camera
    const base64 = await takePictureBase64();
    const { width, height, data } = decodeJpegToRgba(base64); // returns Uint8ClampedArray RGBA
    return { width, height, data };
  },
  destroy() {}
};

const cropper = await createImageCropper({ frameProvider, aspectRatio: [1, 4/5] });
const { rect, data } = await cropper.captureAndCrop();
```
