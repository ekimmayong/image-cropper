# Platform Adapters (Planned)

This folder will contain non-web platform adapters (e.g., React Native / Expo) to allow using the cropping pipeline with alternative camera and rendering APIs.

## Goals
- Provide a `createNativeImageCropper` mirroring the web API but sourcing frames from native camera modules.
- Abstract drawing / pixel access so detectors can operate on a generic frame representation.

## Proposed Abstractions
```ts
export interface GenericFrame {
  width: number;
  height: number;
  // Raw RGBA or YUV converted to RGBA
  data: Uint8ClampedArray;
}

export interface FrameProvider {
  capture(): Promise<GenericFrame> | GenericFrame;
  destroy(): void;
}
```

Detectors would accept either the existing web `FrameData` or `GenericFrame` via a union, enabling reuse without major rewrites.

## React Native / Expo Plan (High-Level)
1. Use `expo-camera` or `react-native-vision-camera` to grab a frame.
2. Convert to RGBA byte array (via `expo-camera` picture base64 decode or a native plugin for zero-copy access).
3. Feed into pipeline adaptation that skips DOM/canvas and constructs minimal `FrameData` shim:
```ts
const frameShim: any = { width, height, imageData: { data: rgba, width, height } };
```
4. Run detectors that do not rely on Canvas APIs (face detection would use MLKit / native modules).
5. Output: for `blob`/`dataUrl` adapt using `expo-image-manipulator` or `react-native-fs` to write/return a path.

## Status
Not yet implemented; this is a placeholder for future work.
