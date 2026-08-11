import {
  Edges,
  GizmoHelper,
  GizmoViewport,
  OrbitControls,
} from "@react-three/drei";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  CadDocument,
  CadFeature,
  CadPartReference,
  CadProject,
  CadSelection,
  FeaturePreview,
  SketchPlane,
  ViewOrientation,
} from "@/features/cad/types";
import {
  getClosedSketchRegions,
  getSketchEntities,
  extrudeCutTargetsFeature,
  isExtrudeCutFeature,
  isModelFeature,
  sampleSketchArc,
  selectionFromFeature,
} from "@/features/cad/lib/cadOperations";
import { subtractFeatureGeometry } from "@/features/cad/core/ThreeCsgKernel";
import { createSketchRegionExtrusionGeometry } from "@/features/cad/core/sketchGeometry";
import {
  CAD_CAMERA_FOV_DEGREES,
  CAD_SKETCH_FOCUS_DISTANCE_MM,
} from "@/features/cad/lib/viewport";
import styles from "./CadWorkspace.module.css";

interface CadViewportProps {
  document: CadDocument;
  project: CadProject;
  partLibrary: CadPartReference[];
  selectedId?: string;
  showGrid: boolean;
  showPlanes: boolean;
  view: ViewOrientation;
  onSelect: (selection: CadSelection | null) => void;
  onFaceFocus: (selection: CadSelection) => void;
  selectedFace?: CadSelection | null;
  onPlaneFocus: (plane: SketchPlane) => void;
  planeFocused: boolean;
  focusRevision: number;
  focusNormalSign: -1 | 1;
  focusTarget: [number, number, number];
  featurePreview: FeaturePreview | null;
  cameraRevision: number;
  zoomFactor: number;
}

const cameraPositions: Record<ViewOrientation, [number, number, number]> = {
  isometric: [72, 58, 76],
  front: [0, 0, 105],
  back: [0, 0, -105],
  left: [-105, 0, 0],
  top: [0, 105, 0.01],
  bottom: [0, -105, 0.01],
  right: [105, 0, 0],
};

const numericParameter = (
  feature: CadFeature,
  key: string,
  fallback: number,
) => {
  const value = Number(feature.parameters[key]);
  return Number.isFinite(value) ? value : fallback;
};

function selectionFromPlanarFace(
  feature: CadFeature,
  event: ThreeEvent<MouseEvent | PointerEvent>,
): CadSelection | null {
  if (!event.face) return null;
  const mesh = event.object as THREE.Mesh;
  const geometryType = mesh.geometry?.type;
  if (
    geometryType === "CylinderGeometry" &&
    Math.abs(event.face.normal.y) < 0.98
  ) return null;

  const normal = event.face.normal
    .clone()
    .transformDirection(event.object.matrixWorld)
    .normalize();
  const axes = [
    { axis: "X", magnitude: Math.abs(normal.x), plane: "right" as const, value: event.point.x, sign: normal.x },
    { axis: "Y", magnitude: Math.abs(normal.y), plane: "top" as const, value: event.point.y, sign: normal.y },
    { axis: "Z", magnitude: Math.abs(normal.z), plane: "front" as const, value: event.point.z, sign: normal.z },
  ];
  const dominant = axes.sort((a, b) => b.magnitude - a.magnitude)[0];
  if (dominant.magnitude < 0.98) return null;
  const normalSign = dominant.sign < 0 ? -1 : 1;
  const side = normalSign < 0 ? "−" : "+";

  return {
    id: feature.id,
    name: `${feature.name} · ${side}${dominant.axis} planar face`,
    type: "face",
    metadata: {
      sourceFeatureId: feature.id,
      plane: dominant.plane,
      offsetMm: Math.round(dominant.value * 1000) / 1000,
      normalSign,
    },
  };
}

function buildPlanarFaceHighlight(
  event: ThreeEvent<PointerEvent | MouseEvent>,
): THREE.BufferGeometry | null {
  if (!event.face) return null;
  const mesh = event.object as THREE.Mesh<THREE.BufferGeometry>;
  const source = mesh.geometry;
  const positions = source.getAttribute("position");
  if (!positions) return null;

  const targetNormal = event.face.normal.clone().normalize();
  const localPoint = mesh.worldToLocal(event.point.clone());
  const planeConstant = targetNormal.dot(localPoint);
  const index = source.getIndex();
  const vertexCount = index ? index.count : positions.count;
  const triangle = new THREE.Triangle();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const worldNormal = targetNormal
    .clone()
    .transformDirection(mesh.matrixWorld)
    .normalize();
  const vertices: number[] = [];

  const readVertex = (offset: number, target: THREE.Vector3) => {
    const vertexIndex = index ? index.getX(offset) : offset;
    target.fromBufferAttribute(positions as THREE.BufferAttribute, vertexIndex);
  };

  for (let offset = 0; offset + 2 < vertexCount; offset += 3) {
    readVertex(offset, a);
    readVertex(offset + 1, b);
    readVertex(offset + 2, c);
    triangle.set(a, b, c).getNormal(normal);
    if (
      normal.dot(targetNormal) < 0.9995 ||
      Math.abs(targetNormal.dot(a) - planeConstant) > 0.02
    ) continue;

    [a, b, c].forEach((vertex) => {
      const world = vertex.clone().applyMatrix4(mesh.matrixWorld);
      world.addScaledVector(worldNormal, 0.035);
      vertices.push(world.x, world.y, world.z);
    });
  }

  if (!vertices.length) return null;
  const highlight = new THREE.BufferGeometry();
  highlight.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  highlight.computeVertexNormals();
  highlight.computeBoundingBox();
  return highlight;
}

function selectionWithFaceCenter(
  selection: CadSelection,
  geometry: THREE.BufferGeometry,
): CadSelection {
  geometry.computeBoundingBox();
  const center = geometry.boundingBox?.getCenter(new THREE.Vector3()) ??
    new THREE.Vector3();
  const plane = String(selection.metadata?.plane);
  const offsetMm = Number(selection.metadata?.offsetMm) || 0;
  if (plane === "front") center.z = offsetMm;
  if (plane === "top") center.y = offsetMm;
  if (plane === "right") center.x = offsetMm;

  const pointToUv = (point: THREE.Vector3): [number, number] =>
    plane === "front"
      ? [point.x, point.y]
      : plane === "right"
        ? [point.z, point.y]
        : [point.x, point.z];
  const round = (value: number) => Math.round(value * 1000) / 1000;
  const referenceEdges: Array<[number, number, number, number]> = [];
  const seenEdges = new Set<string>();
  const edgeGeometry = new THREE.EdgesGeometry(geometry, 1);
  const edgePositions = edgeGeometry.getAttribute("position");

  for (
    let index = 0;
    index + 1 < edgePositions.count && referenceEdges.length < 2000;
    index += 2
  ) {
    const start = pointToUv(
      new THREE.Vector3().fromBufferAttribute(edgePositions, index),
    ).map(round) as [number, number];
    const end = pointToUv(
      new THREE.Vector3().fromBufferAttribute(edgePositions, index + 1),
    ).map(round) as [number, number];
    if (Math.hypot(end[0] - start[0], end[1] - start[1]) < 0.001) continue;
    const forwardKey = `${start[0]},${start[1]}:${end[0]},${end[1]}`;
    const reverseKey = `${end[0]},${end[1]}:${start[0]},${start[1]}`;
    if (seenEdges.has(forwardKey) || seenEdges.has(reverseKey)) continue;
    seenEdges.add(forwardKey);
    referenceEdges.push([start[0], start[1], end[0], end[1]]);
  }
  edgeGeometry.dispose();

  if (!referenceEdges.length && geometry.boundingBox) {
    const [minU, minV] = pointToUv(geometry.boundingBox.min);
    const [maxU, maxV] = pointToUv(geometry.boundingBox.max);
    referenceEdges.push(
      [round(minU), round(minV), round(maxU), round(minV)],
      [round(maxU), round(minV), round(maxU), round(maxV)],
      [round(maxU), round(maxV), round(minU), round(maxV)],
      [round(minU), round(maxV), round(minU), round(minV)],
    );
  }

  return {
    ...selection,
    metadata: {
      ...selection.metadata,
      centerXmm: center.x,
      centerYmm: center.y,
      centerZmm: center.z,
      referenceEdges: JSON.stringify(referenceEdges),
    },
  };
}

const faceSelectionKey = (selection: CadSelection) =>
  [
    selection.id,
    selection.metadata?.plane,
    selection.metadata?.offsetMm,
    selection.metadata?.normalSign,
  ].join(":");

function PlanarFaceHighlight({
  geometry,
  focused,
}: {
  geometry: THREE.BufferGeometry;
  focused: boolean;
}) {
  return (
    <mesh geometry={geometry} raycast={() => undefined} renderOrder={40}>
      <meshBasicMaterial
        color={focused ? "#168cda" : "#f0a33b"}
        depthWrite={false}
        opacity={focused ? 0.58 : 0.5}
        polygonOffset
        polygonOffsetFactor={-4}
        side={THREE.DoubleSide}
        transparent
      />
      <Edges
        color={focused ? "#075b98" : "#b7630a"}
        threshold={5}
      />
    </mesh>
  );
}

function CameraController({
  view,
  focused,
  focusRevision,
  focusNormalSign,
  focusTarget,
  cameraRevision,
  contentRef,
  controlsRef,
  zoomFactor,
}: {
  view: ViewOrientation;
  focused: boolean;
  focusRevision: number;
  focusNormalSign: -1 | 1;
  focusTarget: [number, number, number];
  cameraRevision: number;
  contentRef: RefObject<THREE.Group>;
  controlsRef: RefObject<OrbitControlsImpl>;
  zoomFactor: number;
}) {
  const { camera, invalidate } = useThree();
  const [targetX, targetY, targetZ] = focusTarget;
  const transition = useRef<{
    elapsed: number;
    duration: number;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
    startDirection: THREE.Vector3;
    directionRotation: THREE.Quaternion;
    startDistance: number;
    endDistance: number;
    startUp: THREE.Vector3;
    endUp: THREE.Vector3;
  } | null>(null);

  useEffect(() => {
    const cameraTarget = new THREE.Vector3(targetX, targetY, targetZ);
    let baseDistance = CAD_SKETCH_FOCUS_DISTANCE_MM;
    if (!focused) {
      const bounds = contentRef.current
        ? new THREE.Box3().setFromObject(contentRef.current)
        : new THREE.Box3();
      if (!bounds.isEmpty()) {
        bounds.getCenter(cameraTarget);
        const radius = Math.max(
          1,
          bounds.getSize(new THREE.Vector3()).length() / 2,
        );
        const perspectiveCamera = camera as THREE.PerspectiveCamera;
        const halfFov = THREE.MathUtils.degToRad(perspectiveCamera.fov / 2);
        baseDistance = Math.max(35, (radius / Math.sin(halfFov)) * 1.16);
      } else {
        cameraTarget.set(0, 7, 0);
        baseDistance = 105;
      }
    }
    const direction = new THREE.Vector3(...cameraPositions[view]).normalize();
    if (focused) {
      if (view === "front" || view === "back") direction.set(0, 0, view === "back" ? -focusNormalSign : focusNormalSign);
      if (view === "top" || view === "bottom") direction.set(0, view === "bottom" ? -focusNormalSign : focusNormalSign, 0);
      if (view === "right" || view === "left") direction.set(view === "left" ? -focusNormalSign : focusNormalSign, 0, 0);
    }
    const endUp = new THREE.Vector3(0, 1, 0);
    if (view === "top") endUp.set(0, 0, -1);
    if (view === "bottom") endUp.set(0, 0, 1);
    const startTarget = controlsRef.current?.target.clone() ??
      new THREE.Vector3(0, 7, 0);
    const startOffset = camera.position.clone().sub(startTarget);
    const startDistance = Math.max(0.001, startOffset.length());
    const startDirection = startOffset.normalize();
    const angularDistance = startDirection.angleTo(direction);
    const targetDistance = startTarget.distanceTo(cameraTarget);

    transition.current = {
      elapsed: 0,
      duration: THREE.MathUtils.clamp(
        0.4 + (angularDistance / Math.PI) * 0.42 + targetDistance / 420,
        0.42,
        0.9,
      ),
      startTarget,
      endTarget: cameraTarget,
      startDirection,
      directionRotation: new THREE.Quaternion().setFromUnitVectors(
        startDirection,
        direction,
      ),
      startDistance,
      endDistance: baseDistance * zoomFactor,
      startUp: camera.up.clone().normalize(),
      endUp,
    };
    invalidate();
  }, [camera, cameraRevision, contentRef, controlsRef, focusNormalSign, focusRevision, focused, invalidate, targetX, targetY, targetZ, view, zoomFactor]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const cancelTransition = () => {
      transition.current = null;
    };
    controls.addEventListener("start", cancelTransition);
    return () => controls.removeEventListener("start", cancelTransition);
  }, [controlsRef]);

  useFrame((_, delta) => {
    const activeTransition = transition.current;
    if (!activeTransition) return;
    activeTransition.elapsed += Math.min(delta, 0.05);
    const progress = Math.min(
      1,
      activeTransition.elapsed / activeTransition.duration,
    );
    const eased =
      progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    const partialRotation = new THREE.Quaternion().slerp(
      activeTransition.directionRotation,
      eased,
    );
    const target = activeTransition.startTarget
      .clone()
      .lerp(activeTransition.endTarget, eased);
    const direction = activeTransition.startDirection
      .clone()
      .applyQuaternion(partialRotation)
      .normalize();
    const distance = THREE.MathUtils.lerp(
      activeTransition.startDistance,
      activeTransition.endDistance,
      eased,
    );
    const up = activeTransition.startUp
      .clone()
      .applyQuaternion(partialRotation)
      .lerp(activeTransition.endUp, eased * eased);
    if (up.lengthSq() < 0.001) up.copy(activeTransition.endUp);
    up.normalize();

    camera.position.copy(target).addScaledVector(direction, distance);
    camera.up.copy(up);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.copy(target);
      controlsRef.current.update();
    }
    invalidate();
    if (progress >= 1) transition.current = null;
  });

  return null;
}

function ReferencePlanes({
  document,
  selectedId,
  onSelect,
  onFocus,
}: {
  document: CadDocument;
  selectedId?: string;
  onSelect: (feature: CadFeature, event: ThreeEvent<MouseEvent>) => void;
  onFocus: (plane: SketchPlane) => void;
}) {
  const planes = document.features.filter((feature) => feature.type === "plane");
  return (
    <group>
      {planes.map((planeFeature) => {
        const plane = String(planeFeature.parameters.plane);
        const selected = selectedId === planeFeature.id;
        const rotation: [number, number, number] =
          plane === "top"
            ? [-Math.PI / 2, 0, 0]
            : plane === "right"
              ? [0, Math.PI / 2, 0]
              : [0, 0, 0];
        const color =
          plane === "front" ? "#e78383" : plane === "top" ? "#77a9df" : "#7abb8b";
        return (
          <mesh
            key={planeFeature.id}
            onClick={(event) => onSelect(planeFeature, event)}
            onDoubleClick={(event) => {
              event.stopPropagation();
              onFocus(plane as SketchPlane);
            }}
            rotation={rotation}
          >
            <planeGeometry args={[62, 62]} />
            <meshBasicMaterial
              color={color}
              depthWrite={false}
              opacity={selected ? 0.22 : 0.075}
              side={THREE.DoubleSide}
              transparent
            />
            {selected && <Edges color="#2871b7" />}
          </mesh>
        );
      })}
    </group>
  );
}

function SketchExtrusionVolume({
  sourceSketch,
  depthMm,
  reverse,
  mode,
  color = "#7897b8",
  selected = false,
  onClick,
  onDoubleClick,
  onPointerMove,
  onPointerOut,
}: {
  sourceSketch: CadFeature;
  depthMm: number;
  reverse: boolean;
  mode: "solid" | "extrude-preview" | "cut-preview";
  color?: string;
  selected?: boolean;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
  onDoubleClick?: (event: ThreeEvent<MouseEvent>) => void;
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (event: ThreeEvent<PointerEvent>) => void;
}) {
  const depth = Math.max(0.1, depthMm);
  const direction = reverse ? -1 : 1;
  const plane = String(sourceSketch.parameters.plane) as SketchPlane;
  const baseOffset = numericParameter(sourceSketch, "offsetMm", 0);
  const supportDirection = numericParameter(sourceSketch, "normalSign", 1) < 0 ? -1 : 1;
  const extrusionDirection: -1 | 1 = direction * supportDirection < 0 ? -1 : 1;
  const geometries = useMemo(
    () =>
      getClosedSketchRegions(getSketchEntities(sourceSketch)).map((region) =>
        createSketchRegionExtrusionGeometry(
          region,
          plane,
          baseOffset,
          depth,
          extrusionDirection,
        ),
      ),
    [baseOffset, depth, extrusionDirection, plane, sourceSketch],
  );
  useEffect(
    () => () => geometries.forEach((geometry) => geometry.dispose()),
    [geometries],
  );
  const preview = mode !== "solid";
  const cutPreview = mode === "cut-preview";
  const previewColor = cutPreview ? "#e44b4b" : "#3194d8";
  const edgeColor = cutPreview
    ? "#a91f2a"
    : preview
      ? "#1269ad"
      : selected
        ? "#164f89"
        : "#536f89";

  const material = () =>
    preview ? (
      <meshStandardMaterial
        color={previewColor}
        depthTest={!cutPreview}
        depthWrite={false}
        emissive={previewColor}
        emissiveIntensity={cutPreview ? 0.16 : 0.08}
        opacity={cutPreview ? 0.28 : 0.42}
        roughness={0.38}
        transparent
      />
    ) : (
      <meshStandardMaterial
        color={selected ? "#4f9be7" : color}
        emissive={selected ? "#174b7e" : "#000000"}
        emissiveIntensity={selected ? 0.23 : 0}
        metalness={0.22}
        roughness={0.48}
      />
    );

  return (
    <group renderOrder={preview ? 25 : 0}>
      {geometries.map((geometry, index) => (
        <mesh
          castShadow={!preview}
          geometry={geometry}
          key={`region-${index}`}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onPointerMove={onPointerMove}
          onPointerOut={onPointerOut}
          receiveShadow={!preview}
        >
          {material()}
          <Edges color={edgeColor} threshold={15} />
        </mesh>
      ))}
    </group>
  );
}

function FeatureMesh({
  feature,
  sourceSketch,
  selected,
  onClick,
  onDoubleClick,
  onPointerMove,
  onPointerOut,
}: {
  feature: CadFeature;
  sourceSketch?: CadFeature;
  selected: boolean;
  onClick: (event: ThreeEvent<MouseEvent>) => void;
  onDoubleClick?: (event: ThreeEvent<MouseEvent>) => void;
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (event: ThreeEvent<PointerEvent>) => void;
}) {
  const operation = feature.parameters.operation;
  const x = numericParameter(feature, "xMm", 0);
  const y = numericParameter(feature, "yMm", 10);
  const z = numericParameter(feature, "zMm", 0);
  const color = String(feature.parameters.color || "#7897b8");

  if (operation === "extrude" && sourceSketch) {
    return (
      <SketchExtrusionVolume
        color={color}
        depthMm={numericParameter(feature, "depthMm", 20)}
        mode="solid"
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onPointerMove={onPointerMove}
        onPointerOut={onPointerOut}
        reverse={feature.parameters.reverse === true}
        selected={selected}
        sourceSketch={sourceSketch}
      />
    );
  }

  const materialProps = {
    color: selected ? "#4f9be7" : color,
    metalness: 0.22,
    roughness: 0.48,
    emissive: selected ? "#174b7e" : "#000000",
    emissiveIntensity: selected ? 0.23 : 0,
  };

  if (operation === "cylinder") {
    const diameter = Math.max(0.1, numericParameter(feature, "diameterMm", 20));
    const height = Math.max(0.1, numericParameter(feature, "heightMm", 30));
    return (
      <mesh castShadow onClick={onClick} onDoubleClick={onDoubleClick} onPointerMove={onPointerMove} onPointerOut={onPointerOut} position={[x, y, z]} receiveShadow>
        <cylinderGeometry args={[diameter / 2, diameter / 2, height, 48]} />
        <meshStandardMaterial {...materialProps} />
        <Edges color={selected ? "#164f89" : "#536f89"} threshold={15} />
      </mesh>
    );
  }

  const width = Math.max(0.1, numericParameter(feature, "widthMm", 40));
  const height = Math.max(0.1, numericParameter(feature, "heightMm", 20));
  const depth = Math.max(0.1, numericParameter(feature, "depthMm", 30));
  return (
    <mesh castShadow onClick={onClick} onDoubleClick={onDoubleClick} onPointerMove={onPointerMove} onPointerOut={onPointerOut} position={[x, y, z]} receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial {...materialProps} />
      <Edges color={selected ? "#164f89" : "#536f89"} threshold={15} />
    </mesh>
  );
}

function BooleanFeatureMesh({
  feature,
  features,
  selected,
  onClick,
  onDoubleClick,
  onPointerMove,
  onPointerOut,
}: {
  feature: CadFeature;
  features: CadFeature[];
  selected: boolean;
  onClick: (event: ThreeEvent<MouseEvent>) => void;
  onDoubleClick?: (event: ThreeEvent<MouseEvent>) => void;
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (event: ThreeEvent<PointerEvent>) => void;
}) {
  const geometries = useMemo(() => {
    const cuts = features.filter(
      (candidate) =>
        isExtrudeCutFeature(candidate) &&
        candidate.enabled &&
        !candidate.suppressed &&
        extrudeCutTargetsFeature(candidate, feature.id),
    );
    return subtractFeatureGeometry(feature, cuts, features);
  }, [feature, features]);

  useEffect(
    () => () => geometries.forEach((geometry) => geometry.dispose()),
    [geometries],
  );

  const color = String(feature.parameters.color || "#7897b8");
  return (
    <group>
      {geometries.map((geometry, index) => (
        <mesh
          castShadow
          geometry={geometry}
          key={index}
          onClick={onClick}
          onDoubleClick={onDoubleClick}
          onPointerMove={onPointerMove}
          onPointerOut={onPointerOut}
          receiveShadow
        >
          <meshStandardMaterial
            color={selected ? "#4f9be7" : color}
            emissive={selected ? "#174b7e" : "#000000"}
            emissiveIntensity={selected ? 0.23 : 0}
            metalness={0.22}
            roughness={0.48}
          />
          <Edges color={selected ? "#164f89" : "#536f89"} threshold={15} />
        </mesh>
      ))}
    </group>
  );
}

function PartFeatures({
  features,
  selectedId,
  onSelect,
  onFaceDoubleClick,
  onFaceHover,
  onFaceLeave,
}: {
  features: CadFeature[];
  selectedId?: string;
  onSelect: (feature: CadFeature, event: ThreeEvent<MouseEvent>) => void;
  onFaceDoubleClick?: (feature: CadFeature, event: ThreeEvent<MouseEvent>) => void;
  onFaceHover?: (feature: CadFeature, event: ThreeEvent<PointerEvent>) => void;
  onFaceLeave?: (event: ThreeEvent<PointerEvent>) => void;
}) {
  return (
    <group>
      {features
        .filter(
          (feature) =>
            isModelFeature(feature) &&
            feature.enabled &&
            !feature.suppressed &&
            feature.parameters.visible !== false,
        )
        .map((feature) => {
          const hasCuts = features.some(
            (candidate) =>
              isExtrudeCutFeature(candidate) &&
              candidate.enabled &&
              !candidate.suppressed &&
              extrudeCutTargetsFeature(candidate, feature.id),
          );
          return hasCuts ? (
            <BooleanFeatureMesh
              feature={feature}
              features={features}
              key={feature.id}
              onClick={(event) => onSelect(feature, event)}
              onDoubleClick={(event) => onFaceDoubleClick?.(feature, event)}
              onPointerMove={(event) => onFaceHover?.(feature, event)}
              onPointerOut={onFaceLeave}
              selected={selectedId === feature.id}
            />
          ) : (
            <FeatureMesh
              feature={feature}
              key={feature.id}
              onClick={(event) => onSelect(feature, event)}
              onDoubleClick={(event) => onFaceDoubleClick?.(feature, event)}
              onPointerMove={(event) => onFaceHover?.(feature, event)}
              onPointerOut={onFaceLeave}
              selected={selectedId === feature.id}
              sourceSketch={features.find(
                (candidate) => candidate.id === feature.parameters.sketchId,
              )}
            />
          );
        })}
    </group>
  );
}

function FeaturePreviewMesh({
  features,
  preview,
}: {
  features: CadFeature[];
  preview: FeaturePreview;
}) {
  const sourceSketch = features.find(
    (feature) => feature.id === preview.sketchId && feature.type === "sketch",
  );
  if (!sourceSketch || sourceSketch.parameters.closed !== true) return null;

  return (
    <SketchExtrusionVolume
      depthMm={preview.depthMm}
      mode={preview.operation === "extrude-cut" ? "cut-preview" : "extrude-preview"}
      reverse={preview.reverse}
      sourceSketch={sourceSketch}
    />
  );
}

function SketchProfiles({
  features,
  selectedId,
  onSelect,
}: {
  features: CadFeature[];
  selectedId?: string;
  onSelect: (feature: CadFeature, event: ThreeEvent<MouseEvent>) => void;
}) {
  return (
    <group>
      {features
        .filter(
          (feature) =>
            feature.type === "sketch" && feature.enabled && !feature.suppressed,
        )
        .map((sketch) => {
          const plane = String(sketch.parameters.plane);
          const selected = sketch.id === selectedId;
          const offset = numericParameter(sketch, "offsetMm", 0);
          const normalSign = numericParameter(sketch, "normalSign", 1) < 0 ? -1 : 1;
          const displayOffset = offset + normalSign * 0.16;
          const pointToWorld = (uValue: number, vValue: number): [number, number, number] =>
            plane === "front"
              ? [uValue, vValue, displayOffset]
              : plane === "right"
                ? [displayOffset, vValue, uValue]
                : [uValue, displayOffset, vValue];
          return (
            <group key={sketch.id}>
              {getSketchEntities(sketch).map((entity, index) => {
                if (entity.kind === "line" || entity.kind === "centerline") {
                  const start = pointToWorld(entity.startUMm, entity.startVMm);
                  const end = pointToWorld(entity.endUMm, entity.endVMm);
                  return (
                    <lineSegments key={`line-${index}`} onClick={(event) => onSelect(sketch, event)}>
                      <bufferGeometry>
                        <bufferAttribute args={[new Float32Array([...start, ...end]), 3]} attach="attributes-position" />
                      </bufferGeometry>
                      <lineDashedMaterial
                        color={selected ? "#075ea8" : "#397eaf"}
                        dashSize={entity.kind === "centerline" ? 3 : 1000}
                        gapSize={entity.kind === "centerline" ? 2 : 0}
                      />
                    </lineSegments>
                  );
                }

                if (entity.kind === "arc") {
                  const arcVertices = sampleSketchArc(entity)
                    .map((point) => pointToWorld(point.u, point.v))
                    .flatMap((point, pointIndex, points) =>
                      pointIndex === 0
                        ? []
                        : [...points[pointIndex - 1], ...point],
                    );
                  return (
                    <lineSegments
                      key={`arc-${index}`}
                      onClick={(event) => onSelect(sketch, event)}
                    >
                      <bufferGeometry>
                        <bufferAttribute
                          args={[new Float32Array(arcVertices), 3]}
                          attach="attributes-position"
                        />
                      </bufferGeometry>
                      <lineBasicMaterial color={selected ? "#075ea8" : "#397eaf"} />
                    </lineSegments>
                  );
                }

                if (entity.kind === "point") {
                  return (
                    <mesh key={`point-${index}`} onClick={(event) => onSelect(sketch, event)} position={pointToWorld(entity.centerUMm, entity.centerVMm)}>
                      <sphereGeometry args={[selected ? 1.2 : 0.8, 18, 18]} />
                      <meshBasicMaterial color={selected ? "#075ea8" : "#397eaf"} />
                    </mesh>
                  );
                }

                const position: [number, number, number] =
                  plane === "front"
                    ? [entity.centerUMm, entity.centerVMm, displayOffset]
                    : plane === "right"
                      ? [displayOffset, entity.centerVMm, entity.centerUMm]
                      : [entity.centerUMm, displayOffset, entity.centerVMm];
                const rotation: [number, number, number] =
                  plane === "front"
                    ? [0, 0, 0]
                    : plane === "right"
                      ? [0, Math.PI / 2, 0]
                      : [-Math.PI / 2, 0, 0];
                return (
                  <mesh key={`${entity.kind}-${index}`} onClick={(event) => onSelect(sketch, event)} position={position} rotation={rotation}>
                    {entity.kind === "circle" ? (
                      <circleGeometry args={[entity.radiusMm, 64]} />
                    ) : (
                      <planeGeometry args={[entity.widthMm, entity.heightMm]} />
                    )}
                    <meshBasicMaterial color={selected ? "#0878d1" : "#4a91c9"} depthWrite={false} opacity={selected ? 0.2 : 0.07} side={THREE.DoubleSide} transparent />
                    <Edges color={selected ? "#075ea8" : "#397eaf"} />
                  </mesh>
                );
              })}
            </group>
          );
        })}
    </group>
  );
}

function AssemblyModel({
  document,
  partLibrary,
  project,
  selectedId,
  onSelect,
}: {
  document: CadDocument;
  partLibrary: CadPartReference[];
  project: CadProject;
  selectedId?: string;
  onSelect: (selection: CadSelection, event: ThreeEvent<MouseEvent>) => void;
}) {
  return (
    <group>
      {document.features
        .filter(
          (feature) =>
            feature.type === "component" &&
            feature.enabled &&
            !feature.suppressed &&
            feature.parameters.visible !== false,
        )
        .map((component) => {
          const sourceDocumentId = String(component.parameters.sourceDocumentId);
          const sourceProjectId = String(component.parameters.sourceProjectId ?? "");
          const sourceDocument =
            partLibrary.find(
              (entry) =>
                entry.document.id === sourceDocumentId &&
                (!sourceProjectId || entry.projectId === sourceProjectId),
            )?.document ??
            project.documents.find((item) => item.id === sourceDocumentId);
          if (!sourceDocument) return null;
          const rotation: [number, number, number] = [
            THREE.MathUtils.degToRad(numericParameter(component, "rotationXDeg", 0)),
            THREE.MathUtils.degToRad(numericParameter(component, "rotationYDeg", 0)),
            THREE.MathUtils.degToRad(numericParameter(component, "rotationZDeg", 0)),
          ];
          const componentSelection = selectionFromFeature(component);

          return (
            <group
              key={component.id}
              position={[
                numericParameter(component, "xMm", 0),
                numericParameter(component, "yMm", 0),
                numericParameter(component, "zMm", 0),
              ]}
              rotation={rotation}
            >
              <PartFeatures
                features={sourceDocument.features}
                onSelect={(_, event) => onSelect(componentSelection, event)}
                selectedId={selectedId === component.id ? sourceDocument.features.find(isModelFeature)?.id : undefined}
              />
            </group>
          );
        })}
    </group>
  );
}

function DrawingSheet({
  document,
  selectedId,
  onSelect,
}: {
  document: CadDocument;
  selectedId?: string;
  onSelect: (feature: CadFeature, event: ThreeEvent<MouseEvent>) => void;
}) {
  const views = document.features.filter(
    (feature) =>
      feature.type === "annotation" && feature.parameters.visible !== false,
  );

  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, 0]}>
      <mesh receiveShadow>
        <planeGeometry args={[78, 55]} />
        <meshStandardMaterial color="#fbfcfd" roughness={0.92} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments position={[0, 0, 0.06]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(71, 48)]} />
        <lineBasicMaterial color="#607b99" />
      </lineSegments>
      {views.map((drawingView) => {
        const kind = drawingView.parameters.viewKind;
        const scale = numericParameter(drawingView, "scale", 0.42);
        const baseSize: [number, number] =
          kind === "top"
            ? [42, 25]
            : kind === "right"
              ? [25, 32]
              : [42, 32];
        const width = baseSize[0] * scale;
        const height = baseSize[1] * scale;
        const selected = drawingView.id === selectedId;

        return (
          <group
            key={drawingView.id}
            position={[
              numericParameter(drawingView, "xMm", 0),
              numericParameter(drawingView, "yMm", 0),
              0.12,
            ]}
            rotation={[0, 0, kind === "isometric" ? Math.PI / 12 : 0]}
          >
            <mesh onClick={(event) => onSelect(drawingView, event)}>
              <planeGeometry args={[width + 3, height + 3]} />
              <meshBasicMaterial opacity={0} transparent />
            </mesh>
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(width, height, 0.08)]} />
              <lineBasicMaterial color={selected ? "#176bc1" : "#274e72"} />
            </lineSegments>
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(width * 0.4, height * 0.42, 0.09)]} />
              <lineBasicMaterial color={selected ? "#176bc1" : "#5f7790"} />
            </lineSegments>
          </group>
        );
      })}
    </group>
  );
}

export default function CadViewport({
  document,
  project,
  partLibrary,
  selectedId,
  showGrid,
  showPlanes,
  view,
  onSelect,
  onFaceFocus,
  selectedFace,
  onPlaneFocus,
  planeFocused,
  focusRevision,
  focusNormalSign,
  focusTarget,
  featurePreview,
  cameraRevision,
  zoomFactor,
}: CadViewportProps) {
  const contentRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const hoveredFaceKey = useRef("");
  const [hoveredFace, setHoveredFace] = useState<{
    key: string;
    geometry: THREE.BufferGeometry;
    selection: CadSelection;
  } | null>(null);
  const [focusedFace, setFocusedFace] = useState<{
    key: string;
    geometry: THREE.BufferGeometry;
    selection: CadSelection;
  } | null>(null);

  useEffect(
    () => () => hoveredFace?.geometry.dispose(),
    [hoveredFace],
  );
  useEffect(
    () => () => focusedFace?.geometry.dispose(),
    [focusedFace],
  );

  const selectedFaceKey = selectedFace ? faceSelectionKey(selectedFace) : "";
  useEffect(() => {
    setFocusedFace((current) =>
      current && faceSelectionKey(current.selection) === selectedFaceKey
        ? current
        : null,
    );
  }, [selectedFaceKey]);

  useEffect(() => {
    hoveredFaceKey.current = "";
    setHoveredFace(null);
    setFocusedFace(null);
  }, [document.id, document.features]);

  const clearFaceHover = (event?: ThreeEvent<PointerEvent>) => {
    event?.stopPropagation();
    hoveredFaceKey.current = "";
    setHoveredFace(null);
  };

  const hoverFace = (
    feature: CadFeature,
    event: ThreeEvent<PointerEvent>,
  ) => {
    event.stopPropagation();
    const selection = selectionFromPlanarFace(feature, event);
    if (!selection) {
      clearFaceHover();
      return;
    }
    const key = [
      feature.id,
      event.object.uuid,
      selection.metadata?.plane,
      selection.metadata?.offsetMm,
      selection.metadata?.normalSign,
    ].join(":");
    if (hoveredFaceKey.current === key) return;
    const geometry = buildPlanarFaceHighlight(event);
    if (!geometry) return;
    const centeredSelection = selectionWithFaceCenter(selection, geometry);
    hoveredFaceKey.current = key;
    setHoveredFace({ key, geometry, selection: centeredSelection });
  };

  const doubleClickFace = (
    feature: CadFeature,
    event: ThreeEvent<MouseEvent>,
  ) => {
    event.stopPropagation();
    const selection = selectionFromPlanarFace(feature, event);
    if (!selection) return;
    const geometry = buildPlanarFaceHighlight(event);
    const centeredSelection = geometry
      ? selectionWithFaceCenter(selection, geometry)
      : selection;
    if (geometry) {
      setFocusedFace({
        key: `${faceSelectionKey(centeredSelection)}:${event.object.uuid}`,
        geometry,
        selection: centeredSelection,
      });
    }
    clearFaceHover();
    onFaceFocus(centeredSelection);
  };

  const selectFeature = (feature: CadFeature, event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (feature.type === "feature") {
      const faceSelection = selectionFromPlanarFace(feature, event);
      if (faceSelection) {
        const geometry = buildPlanarFaceHighlight(event);
        const centeredSelection = geometry
          ? selectionWithFaceCenter(faceSelection, geometry)
          : faceSelection;
        geometry?.dispose();
        onSelect(centeredSelection);
        return;
      }
    }
    onSelect(selectionFromFeature(feature));
  };

  const indicatedFace = hoveredFace ?? focusedFace;
  const hoveringFocusedFace = Boolean(
    hoveredFace &&
      focusedFace &&
      faceSelectionKey(hoveredFace.selection) ===
        faceSelectionKey(focusedFace.selection),
  );

  return (
    <div className={`${styles.viewport} ${hoveredFace ? styles.viewportFaceHover : ""}`}>
      <Canvas
        camera={{
          fov: CAD_CAMERA_FOV_DEGREES,
          near: 0.1,
          far: 1000,
          position: cameraPositions[view],
        }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: false }}
        onPointerMissed={() => {
          clearFaceHover();
          onSelect(null);
        }}
        shadows
      >
        <color attach="background" args={["#edf1f5"]} />
        <CameraController
          cameraRevision={cameraRevision}
          contentRef={contentRef}
          controlsRef={controlsRef}
          focusNormalSign={focusNormalSign}
          focusRevision={focusRevision}
          focusTarget={focusTarget}
          focused={planeFocused}
          view={view}
          zoomFactor={zoomFactor}
        />
        <ambientLight intensity={1.2} />
        <hemisphereLight color="#ffffff" groundColor="#75879a" intensity={1.05} />
        <directionalLight castShadow intensity={1.6} position={[45, 70, 36]} shadow-mapSize={[1024, 1024]} />

        {showGrid && document.type !== "drawing" && (
          <gridHelper args={[220, 44, "#9eacba", "#cfd7df"]} position={[0, 0, 0]} />
        )}
        {document.type !== "drawing" && <axesHelper args={[20]} position={[0, 0.08, 0]} />}
        {showPlanes && document.type === "part" && (
          <ReferencePlanes
            document={document}
            onFocus={onPlaneFocus}
            onSelect={selectFeature}
            selectedId={selectedId}
          />
        )}

        <group ref={contentRef}>
          {document.type === "part" && (
            <>
            <PartFeatures
              features={document.features}
              onFaceDoubleClick={doubleClickFace}
              onFaceHover={hoverFace}
              onFaceLeave={clearFaceHover}
              onSelect={selectFeature}
              selectedId={selectedId}
            />
            {focusedFace && (
              <PlanarFaceHighlight focused geometry={focusedFace.geometry} />
            )}
            {hoveredFace && !hoveringFocusedFace && (
              <PlanarFaceHighlight focused={false} geometry={hoveredFace.geometry} />
            )}
            {featurePreview && (
              <FeaturePreviewMesh
                features={document.features}
                preview={featurePreview}
              />
            )}
            <SketchProfiles
              features={document.features}
              onSelect={selectFeature}
              selectedId={selectedId}
            />
            </>
          )}
          {document.type === "assembly" && (
            <AssemblyModel
            document={document}
            onSelect={(selection, event) => {
              event.stopPropagation();
              onSelect(selection);
            }}
            partLibrary={partLibrary}
            project={project}
            selectedId={selectedId}
            />
          )}
          {document.type === "drawing" && (
            <DrawingSheet
            document={document}
            onSelect={selectFeature}
            selectedId={selectedId}
            />
          )}
        </group>

        <OrbitControls
          dampingFactor={0.08}
          enableDamping
          makeDefault
          maxDistance={280}
          minDistance={24}
          ref={controlsRef}
          screenSpacePanning
        />
        <GizmoHelper alignment="bottom-right" margin={[68, 62]}>
          <GizmoViewport
            axisColors={["#d95858", "#3f9b67", "#377fd1"]}
            labelColor="#17283c"
          />
        </GizmoHelper>
      </Canvas>

      <div className={styles.viewportBadge}>
        {view.toUpperCase()} · {Math.round(100 / zoomFactor)}%
      </div>
      {indicatedFace && (
        <div className={styles.faceHoverHint}>
          <span>{hoveredFace ? "PLANAR FACE" : "FOCUSED FACE"}</span>
          <strong>{indicatedFace.selection.name}</strong>
          <small>{hoveredFace ? "Double-click to focus this face" : "Choose a Sketch tool to draw on this face"}</small>
        </div>
      )}
      <div className={styles.viewportHint}>
        <span>LEFT</span> Select
        <span>RIGHT</span> Orbit
        <span>WHEEL</span> Zoom
      </div>
      {document.type !== "drawing" && (
        <div className={styles.axisLegend}>
          <span className={styles.axisX}>X</span>
          <span className={styles.axisY}>Y</span>
          <span className={styles.axisZ}>Z</span>
        </div>
      )}
    </div>
  );
}
