import { CameraFrame, CameraTransformMatrix } from './types';

/**
 * Computes exact transformation matrix and bounding box coordinates for the Player Viewport
 * Heavy calculations performed on backend (Rust simulation engine).
 */
export function calculateCameraViewport(
  camera: CameraFrame,
  canvasWidth: number = 1920,
  canvasHeight: number = 1080
): CameraTransformMatrix {
  const rad = (camera.rotation * Math.PI) / 180;
  
  // Calculate scale required to project camera region onto player screen dimensions
  const scaleX = canvasWidth / camera.width;
  const scaleY = canvasHeight / camera.height;

  // Center point of the camera frame in workspace coordinates
  const centerX = camera.x + camera.width / 2;
  const centerY = camera.y + camera.height / 2;

  // Inverse translation for player viewport
  const translateX = canvasWidth / 2 - centerX * scaleX;
  const translateY = canvasHeight / 2 - centerY * scaleY;

  // Calculate bounding box in workspace coordinates
  const minX = camera.x;
  const minY = camera.y;
  const maxX = camera.x + camera.width;
  const maxY = camera.y + camera.height;

  return {
    scaleX,
    scaleY,
    translateX,
    translateY,
    rotationRad: rad,
    visibleBounds: {
      minX,
      minY,
      maxX,
      maxY,
    },
  };
}

/**
 * Adjust camera frame dimensions based on target aspect ratio while preserving center point
 */
export function setCameraAspectRatio(
  camera: CameraFrame,
  targetAspectRatio: number
): CameraFrame {
  const currentArea = camera.width * camera.height;
  const newWidth = Math.sqrt(currentArea * targetAspectRatio);
  const newHeight = newWidth / targetAspectRatio;

  const centerX = camera.x + camera.width / 2;
  const centerY = camera.y + camera.height / 2;

  return {
    ...camera,
    aspectRatio: targetAspectRatio,
    width: Math.round(newWidth),
    height: Math.round(newHeight),
    x: Math.round(centerX - newWidth / 2),
    y: Math.round(centerY - newHeight / 2),
  };
}
