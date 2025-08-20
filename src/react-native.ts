// React Native / Expo adapter (initial minimal implementation)
import { createNativeImageCropper, type NativeImageCropperOptions, type NativeImageCropper } from './adapters/nativeCropper';

export async function createImageCropper(options: NativeImageCropperOptions): Promise<NativeImageCropper> {
  if (!options || !options.frameProvider) {
    throw new Error('[image-cropper] createImageCropper (RN) requires a frameProvider');
  }
  return createNativeImageCropper(options);
}
