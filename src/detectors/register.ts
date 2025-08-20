import type { Detector } from './base';
import { edgesDetector } from './edges';
import { saliencyDetector } from './saliency';
import { faceDetector } from './face';
import { documentDetector } from './document';

const registry = new Map<string, Detector>();

export function registerDetector(detector: Detector) {
  registry.set(detector.key, detector);
}

export function getDetector(key: string): Detector | undefined {
  return registry.get(key);
}

let builtInRegistered = false;
export function registerBuiltInDetectors() {
  if (builtInRegistered) return;
  [edgesDetector, saliencyDetector, faceDetector, documentDetector].forEach(registerDetector);
  builtInRegistered = true;
}
