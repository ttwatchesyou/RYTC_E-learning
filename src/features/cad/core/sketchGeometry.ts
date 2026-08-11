import * as THREE from "three";
import { SketchPlane } from "@/features/cad/types";
import { SketchClosedRegion } from "@/features/cad/lib/cadOperations";

/** Build renderer/kernel-neutral world geometry from a resolved 2D region. */
export function createSketchRegionExtrusionGeometry(
  region: SketchClosedRegion,
  plane: SketchPlane,
  baseOffsetMm: number,
  depthMm: number,
  direction: -1 | 1,
): THREE.BufferGeometry {
  const shape = new THREE.Shape(
    region.points.map((point) => new THREE.Vector2(point.u, point.v)),
  );
  const geometry = new THREE.ExtrudeGeometry(shape, {
    bevelEnabled: false,
    curveSegments: 24,
    depth: Math.max(0.1, depthMm),
    steps: 1,
  });
  geometry.clearGroups();
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const point = new THREE.Vector3();

  for (let index = 0; index < positions.count; index += 1) {
    point.fromBufferAttribute(positions, index);
    const extrusionCoordinate = baseOffsetMm + point.z * direction;
    if (plane === "front") {
      positions.setXYZ(index, point.x, point.y, extrusionCoordinate);
    } else if (plane === "right") {
      positions.setXYZ(index, extrusionCoordinate, point.y, point.x);
    } else {
      positions.setXYZ(index, point.x, extrusionCoordinate, point.y);
    }
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
