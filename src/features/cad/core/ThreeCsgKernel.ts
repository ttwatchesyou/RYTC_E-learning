import * as THREE from "three";
import {
  Brush,
  Evaluator,
  SUBTRACTION,
} from "three-bvh-csg";
import { CadFeature, SketchPlane } from "@/features/cad/types";
import {
  getClosedSketchRegions,
  getSketchEntities,
} from "@/features/cad/lib/cadOperations";
import { createSketchRegionExtrusionGeometry } from "@/features/cad/core/sketchGeometry";

const numberParameter = (
  feature: CadFeature,
  key: string,
  fallback: number,
) => {
  const value = Number(feature.parameters[key]);
  return Number.isFinite(value) ? value : fallback;
};

const prepareBrush = (
  geometry: THREE.BufferGeometry,
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0],
) => {
  geometry.clearGroups();
  const brush = new Brush(geometry);
  brush.position.set(...position);
  brush.rotation.set(...rotation);
  brush.updateMatrixWorld(true);
  return brush;
};

function extrusionBrushes(
  feature: CadFeature,
  features: CadFeature[],
): Brush[] {
  const sketch = features.find(
    (candidate) => candidate.id === feature.parameters.sketchId,
  );
  if (!sketch) return [];

  const depth = Math.max(0.1, numberParameter(feature, "depthMm", 20));
  const direction = feature.parameters.reverse === true ? -1 : 1;
  const plane = String(sketch.parameters.plane) as SketchPlane;
  const baseOffset = numberParameter(sketch, "offsetMm", 0);
  const supportDirection = numberParameter(sketch, "normalSign", 1) < 0 ? -1 : 1;
  const extrusionDirection: -1 | 1 =
    direction * supportDirection < 0 ? -1 : 1;

  return getClosedSketchRegions(getSketchEntities(sketch)).map((region) =>
    prepareBrush(
      createSketchRegionExtrusionGeometry(
        region,
        plane,
        baseOffset,
        depth,
        extrusionDirection,
      ),
      [0, 0, 0],
    ),
  );
}

function featureBrushes(feature: CadFeature, features: CadFeature[]): Brush[] {
  const operation = String(feature.parameters.operation);
  if (operation === "extrude" || operation === "extrude-cut") {
    return extrusionBrushes(feature, features);
  }
  if (operation === "cylinder") {
    const diameter = Math.max(0.1, numberParameter(feature, "diameterMm", 20));
    const height = Math.max(0.1, numberParameter(feature, "heightMm", 30));
    return [
      prepareBrush(
        new THREE.CylinderGeometry(diameter / 2, diameter / 2, height, 48),
        [
          numberParameter(feature, "xMm", 0),
          numberParameter(feature, "yMm", 15),
          numberParameter(feature, "zMm", 0),
        ],
      ),
    ];
  }

  return [
    prepareBrush(
      new THREE.BoxGeometry(
        Math.max(0.1, numberParameter(feature, "widthMm", 40)),
        Math.max(0.1, numberParameter(feature, "heightMm", 20)),
        Math.max(0.1, numberParameter(feature, "depthMm", 30)),
      ),
      [
        numberParameter(feature, "xMm", 0),
        numberParameter(feature, "yMm", 10),
        numberParameter(feature, "zMm", 0),
      ],
    ),
  ];
}

/**
 * Temporary Three.js CSG adapter. Feature data remains kernel-neutral so this
 * implementation can later be replaced by OpenCascade without changing UI.
 */
export function subtractFeatureGeometry(
  baseFeature: CadFeature,
  cutFeatures: CadFeature[],
  allFeatures: CadFeature[],
): THREE.BufferGeometry[] {
  const baseBrushes = featureBrushes(baseFeature, allFeatures);
  const cutterBrushes = cutFeatures.flatMap((cut) =>
    featureBrushes(cut, allFeatures),
  );
  const evaluator = new Evaluator();
  evaluator.useGroups = false;
  evaluator.attributes = ["position", "normal"];
  const temporaryGeometries = new Set<THREE.BufferGeometry>([
    ...baseBrushes.map((brush) => brush.geometry),
    ...cutterBrushes.map((brush) => brush.geometry),
  ]);
  const outputGeometries: THREE.BufferGeometry[] = [];

  for (const baseBrush of baseBrushes) {
    let result = baseBrush;
    for (const cutter of cutterBrushes) {
      const next = evaluator.evaluate(result, cutter, SUBTRACTION);
      if (result !== baseBrush) temporaryGeometries.add(result.geometry);
      result = next;
    }

    const geometry = result.geometry;
    if (geometry.attributes.position?.count) {
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      outputGeometries.push(geometry);
    } else {
      temporaryGeometries.add(geometry);
    }
  }

  const outputs = new Set(outputGeometries);
  temporaryGeometries.forEach((geometry) => {
    if (!outputs.has(geometry)) geometry.dispose();
  });
  return outputGeometries;
}
