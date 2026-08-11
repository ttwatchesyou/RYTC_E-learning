import {
  CadFeature,
  CadSelection,
  DrawingViewKind,
  PrimitiveKind,
  SketchPlane,
  SketchProfile,
} from "@/features/cad/types";

const createId = (prefix: string) => {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${randomPart}`;
};

export interface SketchRegionPoint {
  u: number;
  v: number;
}

export interface SketchClosedRegion {
  id: string;
  points: SketchRegionPoint[];
}

type SketchArc = Extract<SketchProfile, { kind: "arc" }>;

const distanceBetween = (left: SketchRegionPoint, right: SketchRegionPoint) =>
  Math.hypot(left.u - right.u, left.v - right.v);

const polygonArea = (points: SketchRegionPoint[]) =>
  points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length];
    return area + point.u * next.v - next.u * point.v;
  }, 0) / 2;

export function sampleSketchArc(
  arc: SketchArc,
  minimumSegments = 18,
): SketchRegionPoint[] {
  const start = (arc.startAngleDeg * Math.PI) / 180;
  const end = (arc.endAngleDeg * Math.PI) / 180;
  const positiveSpan = (value: number) =>
    ((value % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const span = arc.clockwise
    ? -positiveSpan(start - end)
    : positiveSpan(end - start);
  const segmentCount = Math.max(
    minimumSegments,
    Math.ceil((Math.abs(span) * Math.max(arc.radiusMm, 1)) / 2),
  );
  return Array.from({ length: segmentCount + 1 }, (_, index) => {
    const angle = start + (span * index) / segmentCount;
    return {
      u: arc.centerUMm + Math.cos(angle) * arc.radiusMm,
      v: arc.centerVMm + Math.sin(angle) * arc.radiusMm,
    };
  });
}

/**
 * Resolve closed regions from native Rectangle/Circle entities and from any
 * chain of Line/Arc entities whose endpoints meet. Construction lines and
 * open chains are intentionally ignored.
 */
export function getClosedSketchRegions(
  entities: SketchProfile[],
  toleranceMm = 0.25,
): SketchClosedRegion[] {
  const regions: SketchClosedRegion[] = [];

  entities.forEach((entity, index) => {
    if (entity.kind === "rectangle") {
      const halfWidth = entity.widthMm / 2;
      const halfHeight = entity.heightMm / 2;
      regions.push({
        id: `rectangle-${index}`,
        points: [
          { u: entity.centerUMm - halfWidth, v: entity.centerVMm - halfHeight },
          { u: entity.centerUMm + halfWidth, v: entity.centerVMm - halfHeight },
          { u: entity.centerUMm + halfWidth, v: entity.centerVMm + halfHeight },
          { u: entity.centerUMm - halfWidth, v: entity.centerVMm + halfHeight },
        ],
      });
    }
    if (entity.kind === "circle") {
      regions.push({
        id: `circle-${index}`,
        points: Array.from({ length: 64 }, (_, pointIndex) => {
          const angle = (pointIndex / 64) * Math.PI * 2;
          return {
            u: entity.centerUMm + Math.cos(angle) * entity.radiusMm,
            v: entity.centerVMm + Math.sin(angle) * entity.radiusMm,
          };
        }),
      });
    }
  });

  const pathSegments = entities.flatMap((entity, entityIndex) => {
    if (entity.kind === "line") {
      return [{
        entityIndex,
        points: [
          { u: entity.startUMm, v: entity.startVMm },
          { u: entity.endUMm, v: entity.endVMm },
        ],
      }];
    }
    if (entity.kind === "arc") {
      return [{ entityIndex, points: sampleSketchArc(entity) }];
    }
    return [];
  });
  const unused = new Set(pathSegments.map((_, index) => index));

  while (unused.size) {
    const seedIndex = unused.values().next().value as number;
    unused.delete(seedIndex);
    const seed = pathSegments[seedIndex];
    const chain = [...seed.points];
    const usedSegmentIndexes = [seedIndex];

    while (
      distanceBetween(chain[chain.length - 1], chain[0]) > toleranceMm
    ) {
      const currentEnd = chain[chain.length - 1];
      const nextIndex = [...unused].find((candidateIndex) => {
        const candidate = pathSegments[candidateIndex].points;
        return (
          distanceBetween(currentEnd, candidate[0]) <= toleranceMm ||
          distanceBetween(currentEnd, candidate[candidate.length - 1]) <=
            toleranceMm
        );
      });
      if (nextIndex === undefined) break;
      unused.delete(nextIndex);
      usedSegmentIndexes.push(nextIndex);
      const nextPoints = pathSegments[nextIndex].points;
      const oriented =
        distanceBetween(currentEnd, nextPoints[0]) <= toleranceMm
          ? nextPoints
          : [...nextPoints].reverse();
      chain.push(...oriented.slice(1));
    }

    const closed =
      usedSegmentIndexes.length >= 2 &&
      distanceBetween(chain[chain.length - 1], chain[0]) <= toleranceMm;
    if (!closed) continue;
    chain.pop();
    const area = polygonArea(chain);
    if (chain.length < 3 || Math.abs(area) < 0.01) continue;
    regions.push({
      id: `loop-${seed.entityIndex}`,
      points: area > 0 ? chain : [...chain].reverse(),
    });
  }

  return regions;
}

export function createPrimitiveFeature(
  kind: PrimitiveKind,
  index: number,
  parameters: Record<string, number | string | boolean> = {},
): CadFeature {
  const isBox = kind === "box";
  return {
    id: createId(kind),
    type: "feature",
    name: `${isBox ? "Extrude" : "Revolve"}${index}`,
    parameters: {
      operation: kind,
      ...(isBox
        ? { widthMm: 40, heightMm: 20, depthMm: 30 }
        : { diameterMm: 20, heightMm: 30 }),
      xMm: 0,
      yMm: isBox ? 10 : 15,
      zMm: 0,
      color: isBox ? "#7897b8" : "#8ca7c1",
      ...parameters,
    },
    parentIds: [],
    enabled: true,
    suppressed: false,
  };
}

export function createSketchFeature(
  supportFeatureId: string,
  plane: SketchPlane,
  entities: SketchProfile[],
  index: number,
  support: {
    type?: "reference-plane" | "planar-face";
    offsetMm?: number;
    normalSign?: -1 | 1;
  } = {},
): CadFeature {
  const primaryEntity = entities[0];
  const closedProfileCount = getClosedSketchRegions(entities).length;

  return {
    id: createId("sketch"),
    type: "sketch",
    name: `Sketch${index}`,
    parameters: {
      plane,
      supportType: support.type ?? "reference-plane",
      offsetMm: support.offsetMm ?? 0,
      normalSign: support.normalSign ?? 1,
      profileKind: primaryEntity.kind,
      entityCount: entities.length,
      closedProfileCount,
      ...(primaryEntity.kind === "line" || primaryEntity.kind === "centerline"
        ? {
            startUMm: primaryEntity.startUMm,
            startVMm: primaryEntity.startVMm,
            endUMm: primaryEntity.endUMm,
            endVMm: primaryEntity.endVMm,
            constraint: primaryEntity.constraint ?? "none",
          }
        : primaryEntity.kind === "arc"
          ? {
              startUMm: primaryEntity.startUMm,
              startVMm: primaryEntity.startVMm,
              endUMm: primaryEntity.endUMm,
              endVMm: primaryEntity.endVMm,
              centerUMm: primaryEntity.centerUMm,
              centerVMm: primaryEntity.centerVMm,
              radiusMm: primaryEntity.radiusMm,
              startAngleDeg: primaryEntity.startAngleDeg,
              endAngleDeg: primaryEntity.endAngleDeg,
              clockwise: primaryEntity.clockwise,
            }
        : {
            centerUMm: primaryEntity.centerUMm,
            centerVMm: primaryEntity.centerVMm,
            ...(primaryEntity.kind === "rectangle"
              ? { widthMm: primaryEntity.widthMm, heightMm: primaryEntity.heightMm }
              : primaryEntity.kind === "circle"
                ? { radiusMm: primaryEntity.radiusMm }
                : {}),
          }),
      closed: closedProfileCount > 0,
    },
    sketchEntities: entities,
    parentIds: [supportFeatureId],
    enabled: true,
    suppressed: false,
  };
}

/** Read the current multi-entity format and Sketches saved by earlier builds. */
export function getSketchEntities(sketch: CadFeature): SketchProfile[] {
  if (sketch.sketchEntities?.length) return sketch.sketchEntities;

  const kind = String(sketch.parameters.profileKind);
  const value = (key: string, fallback = 0) => {
    const parsed = Number(sketch.parameters[key]);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  if (kind === "line" || kind === "centerline") {
    const storedConstraint = String(sketch.parameters.constraint);
    const constraint =
      storedConstraint === "horizontal" ||
      storedConstraint === "vertical" ||
      storedConstraint === "diagonal45"
        ? storedConstraint
        : undefined;
    return [{
      kind,
      startUMm: value("startUMm"),
      startVMm: value("startVMm"),
      endUMm: value("endUMm"),
      endVMm: value("endVMm"),
      constraint,
    }];
  }
  if (kind === "rectangle") {
    return [{
      kind,
      centerUMm: value("centerUMm"),
      centerVMm: value("centerVMm"),
      widthMm: Math.max(0.1, value("widthMm", 40)),
      heightMm: Math.max(0.1, value("heightMm", 20)),
    }];
  }
  if (kind === "circle") {
    return [{
      kind,
      centerUMm: value("centerUMm"),
      centerVMm: value("centerVMm"),
      radiusMm: Math.max(0.1, value("radiusMm", 10)),
    }];
  }
  if (kind === "point") {
    return [{
      kind,
      centerUMm: value("centerUMm"),
      centerVMm: value("centerVMm"),
    }];
  }
  return [];
}

export function createExtrudeFromSketchFeature(
  sketch: CadFeature,
  depthMm: number,
  index: number,
  reverse = false,
): CadFeature {
  return {
    id: createId("extrude"),
    type: "feature",
    name: `Extrude${index}`,
    parameters: {
      operation: "extrude",
      sketchId: sketch.id,
      depthMm: Math.max(0.1, depthMm),
      reverse,
      color: "#7897b8",
    },
    parentIds: [sketch.id],
    enabled: true,
    suppressed: false,
  };
}

export function createExtrudeCutFromSketchFeature(
  sketch: CadFeature,
  targetFeatureIds: string[],
  depthMm: number,
  index: number,
  reverse = true,
): CadFeature {
  const uniqueTargetIds = [...new Set(targetFeatureIds)].filter(Boolean);
  const primaryTargetId = uniqueTargetIds[0] ?? "";
  return {
    id: createId("extrude-cut"),
    type: "feature",
    name: `Cut-Extrude${index}`,
    parameters: {
      operation: "extrude-cut",
      sketchId: sketch.id,
      // Keep the first target for projects saved by earlier builds and store
      // the complete feature scope separately for multi-body cuts.
      targetFeatureId: primaryTargetId,
      targetFeatureIds: JSON.stringify(uniqueTargetIds),
      depthMm: Math.max(0.1, depthMm),
      reverse,
    },
    parentIds: [sketch.id, ...uniqueTargetIds],
    enabled: true,
    suppressed: false,
  };
}

export function createComponentFeature(
  sourceProjectId: string,
  sourceDocumentId: string,
  sourceName: string,
  index: number,
): CadFeature {
  return {
    id: createId("component"),
    type: "component",
    name: `${sourceName}<${index}>`,
    parameters: {
      sourceProjectId,
      sourceDocumentId,
      xMm: (index - 1) * 48,
      yMm: 0,
      zMm: 0,
      rotationXDeg: 0,
      rotationYDeg: 0,
      rotationZDeg: 0,
      fixed: index === 1,
      visible: true,
    },
    parentIds: [sourceDocumentId],
    enabled: true,
    suppressed: false,
  };
}

export function createDrawingViewFeature(
  sourceProjectId: string,
  sourceDocumentId: string,
  sourceName: string,
  viewKind: DrawingViewKind,
  index: number,
): CadFeature {
  const positions: Array<[number, number]> = [
    [-17, 9],
    [17, 9],
    [-17, -10],
    [17, -10],
  ];
  const [xMm, yMm] = positions[(index - 1) % positions.length];

  return {
    id: createId("drawing-view"),
    type: "annotation",
    name: `${viewKind.charAt(0).toUpperCase()}${viewKind.slice(1)} View${index}`,
    parameters: {
      sourceProjectId,
      sourceDocumentId,
      sourceName,
      viewKind,
      xMm,
      yMm,
      scale: 0.42,
      visible: true,
    },
    parentIds: [sourceDocumentId],
    enabled: true,
    suppressed: false,
  };
}

export function selectionFromFeature(feature: CadFeature): CadSelection {
  const type =
    feature.type === "component"
      ? "assembly-component"
      : feature.type === "sketch"
        ? "sketch"
        : feature.type === "plane" || feature.type === "origin"
          ? "reference"
          : "feature";

  return {
    id: feature.id,
    name: feature.name,
    type,
    metadata: {
      ...feature.parameters,
      Enabled: feature.enabled,
      Suppressed: feature.suppressed,
    },
  };
}

export const isModelFeature = (feature: CadFeature) =>
  feature.type === "feature" &&
  (feature.parameters.operation === "box" ||
    feature.parameters.operation === "cylinder" ||
    feature.parameters.operation === "extrude");

export const isExtrudeCutFeature = (feature: CadFeature) =>
  feature.type === "feature" && feature.parameters.operation === "extrude-cut";

export const getExtrudeCutTargetIds = (feature: CadFeature): string[] => {
  if (!isExtrudeCutFeature(feature)) return [];
  const serialized = feature.parameters.targetFeatureIds;
  if (typeof serialized === "string") {
    try {
      const parsed: unknown = JSON.parse(serialized);
      if (Array.isArray(parsed)) {
        const ids = parsed.filter(
          (value): value is string => typeof value === "string" && value.length > 0,
        );
        if (ids.length) return [...new Set(ids)];
      }
    } catch {
      // Fall through to the legacy single-target value.
    }
  }
  const legacyTarget = feature.parameters.targetFeatureId;
  return typeof legacyTarget === "string" && legacyTarget
    ? [legacyTarget]
    : [];
};

export const extrudeCutTargetsFeature = (
  cut: CadFeature,
  featureId: string,
) => getExtrudeCutTargetIds(cut).includes(featureId);
