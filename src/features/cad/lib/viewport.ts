export const CAD_CAMERA_FOV_DEGREES = 42;
export const CAD_SKETCH_FOCUS_DISTANCE_MM = 52;

export const sketchPixelsPerMillimeter = (viewportHeightPx: number) => {
  const halfFovRadians = (CAD_CAMERA_FOV_DEGREES * Math.PI) / 360;
  const visibleHeightMm =
    2 * CAD_SKETCH_FOCUS_DISTANCE_MM * Math.tan(halfFovRadians);
  return Math.max(1, viewportHeightPx / visibleHeightMm);
};
