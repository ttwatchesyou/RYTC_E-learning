import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  TbArrowBackUp,
  TbCheck,
  TbChevronDown,
  TbCircle,
  TbLine,
  TbPencil,
  TbPoint,
  TbRectangle,
  TbRulerMeasure,
  TbX,
} from "react-icons/tb";
import {
  CadUnit,
  SketchProfile,
  SketchReferenceEdge,
  SketchSession,
  SketchTool,
} from "@/features/cad/types";
import {
  formatCadLength,
  fromMillimeters,
  toMillimeters,
} from "@/features/cad/lib/units";
import { sampleSketchArc } from "@/features/cad/lib/cadOperations";
import { sketchPixelsPerMillimeter } from "@/features/cad/lib/viewport";
import styles from "./CadWorkspace.module.css";

interface SketchCanvasProps {
  session: SketchSession;
  unit: CadUnit;
  onCancel: () => void;
  onFinish: () => void;
  onDraftChange: (entity: SketchProfile | null) => void;
  onEntityAdd: (entity: SketchProfile) => void;
  onEntityUpdate: (index: number, entity: SketchProfile) => void;
  onToolChange: (tool: SketchTool) => void;
  onUndo: () => void;
}

interface SketchPoint {
  u: number;
  v: number;
}

interface LineGesture {
  farthest: SketchPoint;
  maxDistance: number;
  reversed: boolean;
}

type LinearSketchProfile = Extract<
  SketchProfile,
  { kind: "line" | "centerline" }
>;

type DimensionKind =
  | "line"
  | "between-lines"
  | "rectangle-width"
  | "rectangle-height"
  | "circle-diameter";

interface DimensionSelection {
  kind: DimensionKind;
  primaryIndex: number;
  secondaryIndex?: number;
  anchorX: number;
  anchorY: number;
}

interface DimensionField {
  name: string;
  label: string;
  value: number;
  suffix: string;
  min?: number;
  max?: number;
}

const SNAP_RADIUS_MM = 3;
const ANGLE_SNAP_TOLERANCE = (7 * Math.PI) / 180;
const gridSnap = (value: number) => Math.round(value);

const createArcFromThreePoints = (
  start: SketchPoint,
  through: SketchPoint,
  end: SketchPoint,
): Extract<SketchProfile, { kind: "arc" }> | null => {
  const determinant =
    2 *
    (start.u * (through.v - end.v) +
      through.u * (end.v - start.v) +
      end.u * (start.v - through.v));
  if (Math.abs(determinant) < 0.02) return null;

  const startSquared = start.u * start.u + start.v * start.v;
  const throughSquared = through.u * through.u + through.v * through.v;
  const endSquared = end.u * end.u + end.v * end.v;
  const center = {
    u:
      (startSquared * (through.v - end.v) +
        throughSquared * (end.v - start.v) +
        endSquared * (start.v - through.v)) /
      determinant,
    v:
      (startSquared * (end.u - through.u) +
        throughSquared * (start.u - end.u) +
        endSquared * (through.u - start.u)) /
      determinant,
  };
  const radiusMm = Math.hypot(start.u - center.u, start.v - center.v);
  if (!Number.isFinite(radiusMm) || radiusMm < 0.1 || radiusMm > 10000) {
    return null;
  }

  const angle = (point: SketchPoint) =>
    (Math.atan2(point.v - center.v, point.u - center.u) * 180) / Math.PI;
  const positiveDegrees = (value: number) => ((value % 360) + 360) % 360;
  const startAngleDeg = angle(start);
  const throughAngleDeg = angle(through);
  const endAngleDeg = angle(end);
  const counterClockwiseSpan = positiveDegrees(endAngleDeg - startAngleDeg);
  const counterClockwiseToThrough = positiveDegrees(
    throughAngleDeg - startAngleDeg,
  );

  return {
    kind: "arc",
    startUMm: start.u,
    startVMm: start.v,
    endUMm: end.u,
    endVMm: end.v,
    centerUMm: center.u,
    centerVMm: center.v,
    radiusMm,
    startAngleDeg,
    endAngleDeg,
    clockwise: counterClockwiseToThrough > counterClockwiseSpan,
  };
};

const isLinearEntity = (
  entity: SketchProfile | undefined,
): entity is LinearSketchProfile =>
  entity?.kind === "line" || entity?.kind === "centerline";

const lineAngleDegrees = (line: LinearSketchProfile) => {
  const degrees =
    (Math.atan2(line.endVMm - line.startVMm, line.endUMm - line.startUMm) *
      180) /
    Math.PI;
  const normalized = (degrees + 360) % 360;
  return Math.abs(normalized - 360) < 0.0001 ? 0 : normalized;
};

const signedDegrees = (degrees: number) => {
  const normalized = ((degrees + 180) % 360 + 360) % 360 - 180;
  return Math.abs(normalized + 180) < 0.0001 ? 180 : normalized;
};

const linePairGeometry = (
  primary: LinearSketchProfile,
  secondary: LinearSketchProfile,
) => {
  const primaryPoints = [
    { point: { u: primary.startUMm, v: primary.startVMm }, isStart: true },
    { point: { u: primary.endUMm, v: primary.endVMm }, isStart: false },
  ];
  const secondaryPoints = [
    { point: { u: secondary.startUMm, v: secondary.startVMm }, isStart: true },
    { point: { u: secondary.endUMm, v: secondary.endVMm }, isStart: false },
  ];
  const closestPair = primaryPoints
    .flatMap((primaryPoint) =>
      secondaryPoints.map((secondaryPoint) => ({
        primaryPoint,
        secondaryPoint,
        distance: Math.hypot(
          primaryPoint.point.u - secondaryPoint.point.u,
          primaryPoint.point.v - secondaryPoint.point.v,
        ),
      })),
    )
    .sort((left, right) => left.distance - right.distance)[0];
  const primaryOther = closestPair.primaryPoint.isStart
    ? { u: primary.endUMm, v: primary.endVMm }
    : { u: primary.startUMm, v: primary.startVMm };
  const secondaryOther = closestPair.secondaryPoint.isStart
    ? { u: secondary.endUMm, v: secondary.endVMm }
    : { u: secondary.startUMm, v: secondary.startVMm };
  const primaryAngle = Math.atan2(
    primaryOther.v - closestPair.primaryPoint.point.v,
    primaryOther.u - closestPair.primaryPoint.point.u,
  );
  const secondaryAngle = Math.atan2(
    secondaryOther.v - closestPair.secondaryPoint.point.v,
    secondaryOther.u - closestPair.secondaryPoint.point.u,
  );
  return {
    primaryAngle,
    secondaryAngle,
    signedAngleDegrees: signedDegrees(
      ((secondaryAngle - primaryAngle) * 180) / Math.PI,
    ),
    secondaryLength: Math.hypot(
      secondaryOther.u - closestPair.secondaryPoint.point.u,
      secondaryOther.v - closestPair.secondaryPoint.point.v,
    ),
    secondaryPivot: closestPair.secondaryPoint.point,
    secondaryPivotIsStart: closestPair.secondaryPoint.isStart,
  };
};

const constraintForAngle = (
  degrees: number,
): LinearSketchProfile["constraint"] => {
  const normalized = ((degrees % 180) + 180) % 180;
  if (Math.min(normalized, 180 - normalized) < 0.001) return "horizontal";
  if (Math.abs(normalized - 90) < 0.001) return "vertical";
  if (
    Math.abs(normalized - 45) < 0.001 ||
    Math.abs(normalized - 135) < 0.001
  ) return "diagonal45";
  return undefined;
};

const constrainLineEnd = (
  start: SketchPoint,
  current: SketchPoint,
  allowMove: boolean,
): {
  point: SketchPoint;
  constraint?: "horizontal" | "vertical" | "diagonal45";
} => {
  const deltaU = current.u - start.u;
  const deltaV = current.v - start.v;
  const length = Math.hypot(deltaU, deltaV);
  if (length < 0.1) return { point: current };

  const angle = Math.atan2(deltaV, deltaU);
  const step = Math.round(angle / (Math.PI / 4));
  const snappedAngle = step * (Math.PI / 4);
  const difference = Math.abs(
    Math.atan2(Math.sin(angle - snappedAngle), Math.cos(angle - snappedAngle)),
  );
  if (difference > (allowMove ? ANGLE_SNAP_TOLERANCE : 0.001)) {
    return { point: current };
  }

  const normalizedStep = ((step % 8) + 8) % 8;
  if (normalizedStep === 0 || normalizedStep === 4) {
    return {
      point: allowMove ? { u: current.u, v: start.v } : current,
      constraint: "horizontal",
    };
  }
  if (normalizedStep === 2 || normalizedStep === 6) {
    return {
      point: allowMove ? { u: start.u, v: current.v } : current,
      constraint: "vertical",
    };
  }

  const component = length / Math.sqrt(2);
  return {
    point: allowMove
      ? {
          u: start.u + Math.sign(Math.cos(snappedAngle)) * component,
          v: start.v + Math.sign(Math.sin(snappedAngle)) * component,
        }
      : current,
    constraint: "diagonal45",
  };
};

const entitySnapPoints = (entity: SketchProfile): SketchPoint[] => {
  if (entity.kind === "line" || entity.kind === "centerline") {
    return [
      { u: entity.startUMm, v: entity.startVMm },
      { u: entity.endUMm, v: entity.endVMm },
      {
        u: (entity.startUMm + entity.endUMm) / 2,
        v: (entity.startVMm + entity.endVMm) / 2,
      },
    ];
  }
  if (entity.kind === "rectangle") {
    const halfWidth = entity.widthMm / 2;
    const halfHeight = entity.heightMm / 2;
    return [
      { u: entity.centerUMm - halfWidth, v: entity.centerVMm - halfHeight },
      { u: entity.centerUMm - halfWidth, v: entity.centerVMm + halfHeight },
      { u: entity.centerUMm + halfWidth, v: entity.centerVMm - halfHeight },
      { u: entity.centerUMm + halfWidth, v: entity.centerVMm + halfHeight },
    ];
  }
  if (entity.kind === "arc") {
    return [
      { u: entity.startUMm, v: entity.startVMm },
      { u: entity.endUMm, v: entity.endVMm },
      { u: entity.centerUMm, v: entity.centerVMm },
    ];
  }
  return [{ u: entity.centerUMm, v: entity.centerVMm }];
};

const closestPointOnEdge = (
  point: SketchPoint,
  edge: SketchReferenceEdge,
): SketchPoint => {
  const deltaU = edge.endUMm - edge.startUMm;
  const deltaV = edge.endVMm - edge.startVMm;
  const lengthSquared = deltaU * deltaU + deltaV * deltaV;
  if (lengthSquared < 0.000001) {
    return { u: edge.startUMm, v: edge.startVMm };
  }
  const ratio = Math.max(
    0,
    Math.min(
      1,
      ((point.u - edge.startUMm) * deltaU +
        (point.v - edge.startVMm) * deltaV) /
        lengthSquared,
    ),
  );
  return {
    u: edge.startUMm + deltaU * ratio,
    v: edge.startVMm + deltaV * ratio,
  };
};

const dimensionEditorModel = (
  selection: DimensionSelection,
  entities: SketchProfile[],
  unit: CadUnit,
): { title: string; fields: DimensionField[] } | null => {
  const primary = entities[selection.primaryIndex];
  if (selection.kind === "line" && isLinearEntity(primary)) {
    return {
      title: "Line Dimension",
      fields: [
        {
          name: "length",
          label: "Length",
          value: fromMillimeters(
            Math.hypot(
              primary.endUMm - primary.startUMm,
              primary.endVMm - primary.startVMm,
            ),
            unit,
          ),
          suffix: unit,
          min: 0.001,
        },
        {
          name: "angle",
          label: "Angle",
          value: lineAngleDegrees(primary),
          suffix: "deg",
          min: 0,
          max: 360,
        },
      ],
    };
  }
  if (selection.kind === "between-lines" && isLinearEntity(primary)) {
    const secondary = entities[selection.secondaryIndex ?? -1];
    if (!isLinearEntity(secondary)) return null;
    return {
      title: "Angle Between Lines",
      fields: [
        {
          name: "angle",
          label: "Included angle",
          value: Math.abs(linePairGeometry(primary, secondary).signedAngleDegrees),
          suffix: "deg",
          min: 0,
          max: 180,
        },
      ],
    };
  }
  if (primary?.kind === "rectangle") {
    const width = selection.kind === "rectangle-width";
    if (!width && selection.kind !== "rectangle-height") return null;
    return {
      title: width ? "Rectangle Width" : "Rectangle Height",
      fields: [{
        name: "length",
        label: width ? "Width" : "Height",
        value: fromMillimeters(width ? primary.widthMm : primary.heightMm, unit),
        suffix: unit,
        min: 0.001,
      }],
    };
  }
  if (selection.kind === "circle-diameter" && primary?.kind === "circle") {
    return {
      title: "Circle Dimension",
      fields: [{
        name: "diameter",
        label: "Diameter",
        value: fromMillimeters(primary.radiusMm * 2, unit),
        suffix: unit,
        min: 0.001,
      }],
    };
  }
  return null;
};

function DimensionEditor({
  selection,
  entities,
  unit,
  onApply,
  onClose,
}: {
  selection: DimensionSelection;
  entities: SketchProfile[];
  unit: CadUnit;
  onApply: (values: Record<string, number>) => void;
  onClose: () => void;
}) {
  const model = dimensionEditorModel(selection, entities, unit);
  if (!model) return null;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values = Object.fromEntries(
      model.fields.map((field) => [field.name, Number(data.get(field.name))]),
    );
    if (Object.values(values).some((value) => !Number.isFinite(value))) return;
    onApply(values);
  };

  return (
    <form
      className={styles.dimensionEditor}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
          return;
        }
        if (event.key === "Enter" && !event.nativeEvent.isComposing) {
          event.preventDefault();
          event.currentTarget.requestSubmit();
        }
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onSubmit={submit}
      style={{ left: selection.anchorX, top: selection.anchorY }}
    >
      <div className={styles.dimensionEditorHeader}>
        <span><TbRulerMeasure /> {model.title}</span>
        <button onClick={onClose} type="button"><TbX /></button>
      </div>
      {model.fields.map((field, index) => (
        <label key={field.name}>
          <span>{field.label}</span>
          <div>
            <input
              autoFocus={index === 0}
              defaultValue={Number(field.value.toFixed(3))}
              max={field.max}
              min={field.min}
              name={field.name}
              step="any"
              type="number"
            />
            <b>{field.suffix}</b>
          </div>
        </label>
      ))}
      <small>
        {selection.kind === "line"
          ? "Length keeps the first endpoint fixed. Angle is measured from +X."
          : selection.kind === "between-lines"
            ? "The second selected line rotates around the nearest corner."
            : "The entity center remains fixed."}
      </small>
      <div className={styles.dimensionKeyboardHint}>
        <span><kbd>Enter</kbd> Confirm dimension</span>
        <span><kbd>Esc</kbd> Cancel</span>
      </div>
      <button className={styles.dimensionApplyButton} type="submit">
        <TbCheck /> Confirm dimension
      </button>
    </form>
  );
}

export default function SketchCanvas({
  session,
  unit,
  onCancel,
  onFinish,
  onDraftChange,
  onEntityAdd,
  onEntityUpdate,
  onToolChange,
  onUndo,
}: SketchCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<SketchPoint | null>(null);
  const lineGesture = useRef<LineGesture | null>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [snapIndicator, setSnapIndicator] = useState<SketchPoint | null>(null);
  const [dimensionSelection, setDimensionSelection] =
    useState<DimensionSelection | null>(null);
  const [openToolFlyout, setOpenToolFlyout] = useState<
    "line" | "rectangle" | null
  >(null);
  const [lastLineTool, setLastLineTool] = useState<
    "line" | "centerline" | "midpoint-line"
  >("line");
  const [lastRectangleTool, setLastRectangleTool] = useState<
    "rectangle" | "center-rectangle"
  >("rectangle");
  const pixelsPerMm = sketchPixelsPerMillimeter(size.height);
  const uScreenSign =
    session.plane === "right" ? -session.normalSign : session.normalSign;
  const vScreenSign = session.plane === "top" ? -1 : 1;

  useEffect(() => {
    if (!canvasRef.current) return;
    const updateSize = () => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (
      session.tool !== "smart-dimension" ||
      (dimensionSelection &&
        (dimensionSelection.primaryIndex >= session.entities.length ||
          (dimensionSelection.secondaryIndex !== undefined &&
            dimensionSelection.secondaryIndex >= session.entities.length)))
    ) {
      setDimensionSelection(null);
    }
  }, [dimensionSelection, session.entities.length, session.tool]);

  useEffect(() => {
    if (
      session.tool === "line" ||
      session.tool === "centerline" ||
      session.tool === "midpoint-line"
    ) {
      setLastLineTool(session.tool);
    }
    if (
      session.tool === "rectangle" ||
      session.tool === "center-rectangle"
    ) {
      setLastRectangleTool(session.tool);
    }
  }, [session.tool]);

  const chooseTool = (tool: SketchTool) => {
    onToolChange(tool);
    setOpenToolFlyout(null);
  };

  const rawPointerToSketch = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      u:
        session.viewCenterUMm +
        (uScreenSign * (event.clientX - rect.left - rect.width / 2)) /
          pixelsPerMm,
      v:
        session.viewCenterVMm -
        (vScreenSign * (event.clientY - rect.top - rect.height / 2)) /
          pixelsPerMm,
    };
  };

  const pointerToSketch = (event: ReactPointerEvent<HTMLDivElement>) => {
    const raw = rawPointerToSketch(event);
    const edgeTargets = session.referenceEdges.flatMap((edge) => [
      { u: edge.startUMm, v: edge.startVMm },
      { u: edge.endUMm, v: edge.endVMm },
      {
        u: (edge.startUMm + edge.endUMm) / 2,
        v: (edge.startVMm + edge.endVMm) / 2,
      },
      closestPointOnEdge(raw, edge),
    ]);
    const targets = [
      { u: 0, v: 0 },
      ...(session.supportType === "planar-face"
        ? [{ u: session.viewCenterUMm, v: session.viewCenterVMm }]
        : []),
      ...edgeTargets,
      ...session.entities.flatMap(entitySnapPoints),
    ];
    const nearest = targets.reduce<{ point: SketchPoint; distance: number } | null>(
      (best, point) => {
        const distance = Math.hypot(raw.u - point.u, raw.v - point.v);
        return !best || distance < best.distance ? { point, distance } : best;
      },
      null,
    );
    if (nearest && nearest.distance <= SNAP_RADIUS_MM) {
      return { point: nearest.point, snapped: nearest.point };
    }
    return {
      point: { u: gridSnap(raw.u), v: gridSnap(raw.v) },
      snapped: null,
    };
  };

  const findDimensionTarget = (point: SketchPoint) => {
    const hitRadiusMm = Math.max(0.75, 10 / pixelsPerMm);
    const candidates: Array<{
      kind: Exclude<DimensionKind, "between-lines">;
      index: number;
      distance: number;
    }> = [];
    const distanceToEdge = (edge: SketchReferenceEdge) => {
      const closest = closestPointOnEdge(point, edge);
      return Math.hypot(point.u - closest.u, point.v - closest.v);
    };

    session.entities.forEach((entity, index) => {
      if (isLinearEntity(entity)) {
        candidates.push({
          kind: "line",
          index,
          distance: distanceToEdge({
            startUMm: entity.startUMm,
            startVMm: entity.startVMm,
            endUMm: entity.endUMm,
            endVMm: entity.endVMm,
          }),
        });
        return;
      }
      if (entity.kind === "circle") {
        candidates.push({
          kind: "circle-diameter",
          index,
          distance: Math.abs(
            Math.hypot(point.u - entity.centerUMm, point.v - entity.centerVMm) -
              entity.radiusMm,
          ),
        });
        return;
      }
      if (entity.kind !== "rectangle") return;
      const minU = entity.centerUMm - entity.widthMm / 2;
      const maxU = entity.centerUMm + entity.widthMm / 2;
      const minV = entity.centerVMm - entity.heightMm / 2;
      const maxV = entity.centerVMm + entity.heightMm / 2;
      [minV, maxV].forEach((v) =>
        candidates.push({
          kind: "rectangle-width",
          index,
          distance: distanceToEdge({
            startUMm: minU,
            startVMm: v,
            endUMm: maxU,
            endVMm: v,
          }),
        }),
      );
      [minU, maxU].forEach((u) =>
        candidates.push({
          kind: "rectangle-height",
          index,
          distance: distanceToEdge({
            startUMm: u,
            startVMm: minV,
            endUMm: u,
            endVMm: maxV,
          }),
        }),
      );
    });

    const closest = candidates.sort(
      (left, right) => left.distance - right.distance,
    )[0];
    return closest && closest.distance <= hitRadiusMm ? closest : null;
  };

  const applyDimension = (values: Record<string, number>) => {
    if (!dimensionSelection) return;
    const primary = session.entities[dimensionSelection.primaryIndex];
    if (dimensionSelection.kind === "line" && isLinearEntity(primary)) {
      const lengthMm = toMillimeters(values.length, unit);
      const angleDegrees = values.angle;
      if (!(lengthMm > 0) || !Number.isFinite(angleDegrees)) return;
      const angleRadians = (angleDegrees * Math.PI) / 180;
      onEntityUpdate(dimensionSelection.primaryIndex, {
        ...primary,
        endUMm: primary.startUMm + Math.cos(angleRadians) * lengthMm,
        endVMm: primary.startVMm + Math.sin(angleRadians) * lengthMm,
        constraint: constraintForAngle(angleDegrees),
      });
      setDimensionSelection(null);
      return;
    }
    if (
      dimensionSelection.kind === "between-lines" &&
      isLinearEntity(primary)
    ) {
      const secondaryIndex = dimensionSelection.secondaryIndex ?? -1;
      const secondary = session.entities[secondaryIndex];
      if (!isLinearEntity(secondary)) return;
      const requestedAngle = Math.max(0, Math.min(180, values.angle));
      if (!Number.isFinite(requestedAngle)) return;
      const pair = linePairGeometry(primary, secondary);
      const directionSign = pair.signedAngleDegrees < 0 ? -1 : 1;
      const targetAngle =
        pair.primaryAngle +
        directionSign * (requestedAngle * Math.PI) / 180;
      const movedPoint = {
        u: pair.secondaryPivot.u + Math.cos(targetAngle) * pair.secondaryLength,
        v: pair.secondaryPivot.v + Math.sin(targetAngle) * pair.secondaryLength,
      };
      onEntityUpdate(secondaryIndex, {
        ...secondary,
        ...(pair.secondaryPivotIsStart
          ? { endUMm: movedPoint.u, endVMm: movedPoint.v }
          : { startUMm: movedPoint.u, startVMm: movedPoint.v }),
        constraint: constraintForAngle((targetAngle * 180) / Math.PI),
      });
      setDimensionSelection(null);
      return;
    }
    if (primary?.kind === "rectangle") {
      const lengthMm = toMillimeters(values.length, unit);
      if (!(lengthMm > 0)) return;
      onEntityUpdate(dimensionSelection.primaryIndex, {
        ...primary,
        ...(dimensionSelection.kind === "rectangle-width"
          ? { widthMm: lengthMm }
          : { heightMm: lengthMm }),
      });
      setDimensionSelection(null);
      return;
    }
    if (
      dimensionSelection.kind === "circle-diameter" &&
      primary?.kind === "circle"
    ) {
      const diameterMm = toMillimeters(values.diameter, unit);
      if (!(diameterMm > 0)) return;
      onEntityUpdate(dimensionSelection.primaryIndex, {
        ...primary,
        radiusMm: diameterMm / 2,
      });
      setDimensionSelection(null);
    }
  };

  const createEntity = (
    current: SketchPoint,
    lockedToSnapPoint = false,
  ): SketchProfile | null => {
    const start = dragStart.current;
    if (!start) return null;
    if (session.tool === "rectangle") {
      return {
        kind: "rectangle",
        centerUMm: (start.u + current.u) / 2,
        centerVMm: (start.v + current.v) / 2,
        widthMm: Math.max(0.1, Math.abs(current.u - start.u)),
        heightMm: Math.max(0.1, Math.abs(current.v - start.v)),
      };
    }
    if (session.tool === "center-rectangle") {
      return {
        kind: "rectangle",
        centerUMm: start.u,
        centerVMm: start.v,
        widthMm: Math.max(0.1, Math.abs(current.u - start.u) * 2),
        heightMm: Math.max(0.1, Math.abs(current.v - start.v) * 2),
      };
    }
    if (session.tool === "midpoint-line") {
      const constrained = constrainLineEnd(start, current, !lockedToSnapPoint);
      const deltaU = constrained.point.u - start.u;
      const deltaV = constrained.point.v - start.v;
      return {
        kind: "line",
        startUMm: start.u - deltaU,
        startVMm: start.v - deltaV,
        endUMm: start.u + deltaU,
        endVMm: start.v + deltaV,
        constraint: constrained.constraint,
        creationMode: "midpoint",
      };
    }
    if (session.tool === "line" || session.tool === "centerline") {
      if (session.tool === "line" && lineGesture.current?.reversed) {
        let arc = createArcFromThreePoints(
          start,
          current,
          lineGesture.current.farthest,
        );
        if (!arc) {
          const end = lineGesture.current.farthest;
          const deltaU = end.u - start.u;
          const deltaV = end.v - start.v;
          const chordLength = Math.hypot(deltaU, deltaV);
          const reversedDistance = Math.max(
            0,
            lineGesture.current.maxDistance -
              Math.hypot(current.u - start.u, current.v - start.v),
          );
          if (chordLength >= 0.2) {
            const bulge = Math.max(
              0.75,
              Math.min(chordLength * 0.45, reversedDistance * 0.35),
            );
            arc = createArcFromThreePoints(
              start,
              {
                u: (start.u + end.u) / 2 - (deltaV / chordLength) * bulge,
                v: (start.v + end.v) / 2 + (deltaU / chordLength) * bulge,
              },
              end,
            );
          }
        }
        if (arc) return arc;
      }
      const constrained = constrainLineEnd(start, current, !lockedToSnapPoint);
      return {
        kind: session.tool,
        startUMm: start.u,
        startVMm: start.v,
        endUMm: constrained.point.u,
        endVMm: constrained.point.v,
        constraint: constrained.constraint,
      };
    }
    if (session.tool === "circle") {
      return {
        kind: "circle",
        centerUMm: start.u,
        centerVMm: start.v,
        radiusMm: Math.max(
          0.1,
          Math.hypot(current.u - start.u, current.v - start.v),
        ),
      };
    }
    return null;
  };

  const updateLineGesture = (point: SketchPoint) => {
    const start = dragStart.current;
    const gesture = lineGesture.current;
    if (!start || !gesture || session.tool !== "line") return;
    const distance = Math.hypot(point.u - start.u, point.v - start.v);
    if (!gesture.reversed && distance > gesture.maxDistance) {
      gesture.farthest = point;
      gesture.maxDistance = distance;
      return;
    }
    if (
      !gesture.reversed &&
      gesture.maxDistance >= 6 &&
      distance <= gesture.maxDistance * 0.72
    ) {
      gesture.reversed = true;
    }
  };

  const toScreenX = (u: number) =>
    size.width / 2 +
    uScreenSign * (u - session.viewCenterUMm) * pixelsPerMm;
  const toScreenY = (v: number) =>
    size.height / 2 -
    vScreenSign * (v - session.viewCenterVMm) * pixelsPerMm;

  const renderLinearDimension = (
    start: SketchPoint,
    end: SketchPoint,
    label: string,
    key: string,
    offsetPixels = 18,
  ): ReactNode => {
    const startX = toScreenX(start.u);
    const startY = toScreenY(start.v);
    const endX = toScreenX(end.u);
    const endY = toScreenY(end.v);
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const length = Math.hypot(deltaX, deltaY);
    if (length < 0.5) return null;
    const tangentX = deltaX / length;
    const tangentY = deltaY / length;
    const normalX = -tangentY;
    const normalY = tangentX;
    const dimensionStartX = startX + normalX * offsetPixels;
    const dimensionStartY = startY + normalY * offsetPixels;
    const dimensionEndX = endX + normalX * offsetPixels;
    const dimensionEndY = endY + normalY * offsetPixels;
    const arrowLength = Math.min(6, Math.max(3.5, length / 4));
    const arrowWidth = 3;
    const startArrow = [
      [dimensionStartX, dimensionStartY],
      [
        dimensionStartX + tangentX * arrowLength + normalX * arrowWidth,
        dimensionStartY + tangentY * arrowLength + normalY * arrowWidth,
      ],
      [
        dimensionStartX + tangentX * arrowLength - normalX * arrowWidth,
        dimensionStartY + tangentY * arrowLength - normalY * arrowWidth,
      ],
    ]
      .map((point) => point.join(","))
      .join(" ");
    const endArrow = [
      [dimensionEndX, dimensionEndY],
      [
        dimensionEndX - tangentX * arrowLength + normalX * arrowWidth,
        dimensionEndY - tangentY * arrowLength + normalY * arrowWidth,
      ],
      [
        dimensionEndX - tangentX * arrowLength - normalX * arrowWidth,
        dimensionEndY - tangentY * arrowLength - normalY * arrowWidth,
      ],
    ]
      .map((point) => point.join(","))
      .join(" ");
    const offsetSign = offsetPixels < 0 ? -1 : 1;

    return (
      <g className={styles.sketchDimensionGuide} key={key}>
        {offsetPixels !== 0 && (
          <>
            <line
              className={styles.sketchDimensionExtension}
              x1={startX + normalX * 4 * offsetSign}
              x2={dimensionStartX + normalX * 4 * offsetSign}
              y1={startY + normalY * 4 * offsetSign}
              y2={dimensionStartY + normalY * 4 * offsetSign}
            />
            <line
              className={styles.sketchDimensionExtension}
              x1={endX + normalX * 4 * offsetSign}
              x2={dimensionEndX + normalX * 4 * offsetSign}
              y1={endY + normalY * 4 * offsetSign}
              y2={dimensionEndY + normalY * 4 * offsetSign}
            />
          </>
        )}
        <line
          className={styles.sketchDimensionLine}
          x1={dimensionStartX}
          x2={dimensionEndX}
          y1={dimensionStartY}
          y2={dimensionEndY}
        />
        <polygon className={styles.sketchDimensionArrow} points={startArrow} />
        <polygon className={styles.sketchDimensionArrow} points={endArrow} />
        <text
          className={styles.sketchDimensionValue}
          textAnchor="middle"
          x={(dimensionStartX + dimensionEndX) / 2 - normalX * 6}
          y={(dimensionStartY + dimensionEndY) / 2 - normalY * 6}
        >
          {label}
        </text>
      </g>
    );
  };

  const renderEntity = (
    entity: SketchProfile,
    key: string,
    isDraft = false,
    entityIndex?: number,
  ): ReactNode => {
    const dimensionSelected =
      !isDraft &&
      entityIndex !== undefined &&
      (dimensionSelection?.primaryIndex === entityIndex ||
        dimensionSelection?.secondaryIndex === entityIndex);
    const className = [
      isDraft ? styles.sketchDraft : "",
      dimensionSelected ? styles.sketchDimensionSelected : "",
    ].filter(Boolean).join(" ") || undefined;
    if (entity.kind === "rectangle") {
      const minU = entity.centerUMm - entity.widthMm / 2;
      const maxU = entity.centerUMm + entity.widthMm / 2;
      const minV = entity.centerVMm - entity.heightMm / 2;
      const maxV = entity.centerVMm + entity.heightMm / 2;
      const left = Math.min(
        toScreenX(minU),
        toScreenX(maxU),
      );
      const top = Math.min(
        toScreenY(minV),
        toScreenY(maxV),
      );
      return (
        <g className={className} key={key}>
          <rect
            className={styles.sketchProfileShape}
            height={entity.heightMm * pixelsPerMm}
            width={entity.widthMm * pixelsPerMm}
            x={left}
            y={top}
          />
          {renderLinearDimension(
            { u: minU, v: minV },
            { u: maxU, v: minV },
            formatCadLength(entity.widthMm, unit),
            `${key}-width`,
          )}
          {renderLinearDimension(
            { u: maxU, v: minV },
            { u: maxU, v: maxV },
            formatCadLength(entity.heightMm, unit),
            `${key}-height`,
          )}
        </g>
      );
    }
    if (entity.kind === "circle") {
      return (
        <g className={className} key={key}>
          <circle className={styles.sketchProfileShape} cx={toScreenX(entity.centerUMm)} cy={toScreenY(entity.centerVMm)} r={entity.radiusMm * pixelsPerMm} />
          {renderLinearDimension(
            { u: entity.centerUMm - entity.radiusMm, v: entity.centerVMm },
            { u: entity.centerUMm + entity.radiusMm, v: entity.centerVMm },
            `Ø ${formatCadLength(entity.radiusMm * 2, unit)}`,
            `${key}-diameter`,
            0,
          )}
        </g>
      );
    }
    if (entity.kind === "arc") {
      const arcPoints = sampleSketchArc(entity);
      const radiusTarget = arcPoints[Math.floor(arcPoints.length / 2)];
      return (
        <g className={className} key={key}>
          <polyline
            className={styles.sketchProfileLine}
            fill="none"
            points={arcPoints
              .map((point) => `${toScreenX(point.u)},${toScreenY(point.v)}`)
              .join(" ")}
          />
          <circle className={styles.sketchEndpoint} cx={toScreenX(entity.startUMm)} cy={toScreenY(entity.startVMm)} r={3} />
          <circle className={styles.sketchEndpoint} cx={toScreenX(entity.endUMm)} cy={toScreenY(entity.endVMm)} r={3} />
          <circle className={styles.sketchArcCenter} cx={toScreenX(entity.centerUMm)} cy={toScreenY(entity.centerVMm)} r={2.5} />
          {renderLinearDimension(
            { u: entity.centerUMm, v: entity.centerVMm },
            radiusTarget,
            `R ${formatCadLength(entity.radiusMm, unit)}`,
            `${key}-radius`,
            0,
          )}
        </g>
      );
    }
    if (entity.kind === "line" || entity.kind === "centerline") {
      return (
        <g className={className} key={key}>
          <line
            className={`${styles.sketchProfileLine} ${entity.kind === "centerline" ? styles.sketchCenterline : ""}`}
            x1={toScreenX(entity.startUMm)}
            x2={toScreenX(entity.endUMm)}
            y1={toScreenY(entity.startVMm)}
            y2={toScreenY(entity.endVMm)}
          />
          <circle className={styles.sketchEndpoint} cx={toScreenX(entity.startUMm)} cy={toScreenY(entity.startVMm)} r={3} />
          <circle className={styles.sketchEndpoint} cx={toScreenX(entity.endUMm)} cy={toScreenY(entity.endVMm)} r={3} />
          {entity.kind === "line" && entity.creationMode === "midpoint" && (
            <>
              <rect
                className={styles.sketchMidpointMarker}
                height={7}
                transform={`rotate(45 ${(toScreenX(entity.startUMm) + toScreenX(entity.endUMm)) / 2} ${(toScreenY(entity.startVMm) + toScreenY(entity.endVMm)) / 2})`}
                width={7}
                x={(toScreenX(entity.startUMm) + toScreenX(entity.endUMm)) / 2 - 3.5}
                y={(toScreenY(entity.startVMm) + toScreenY(entity.endVMm)) / 2 - 3.5}
              />
              <text
                className={styles.sketchMidpointLabel}
                x={(toScreenX(entity.startUMm) + toScreenX(entity.endUMm)) / 2 + 8}
                y={(toScreenY(entity.startVMm) + toScreenY(entity.endVMm)) / 2 + 4}
              >M</text>
            </>
          )}
          {renderLinearDimension(
            { u: entity.startUMm, v: entity.startVMm },
            { u: entity.endUMm, v: entity.endVMm },
            `${formatCadLength(Math.hypot(entity.endUMm - entity.startUMm, entity.endVMm - entity.startVMm), unit)} · ${Number(lineAngleDegrees(entity).toFixed(1))}°`,
            `${key}-length`,
          )}
          {entity.constraint && (
            <text className={styles.sketchConstraintText} textAnchor="middle" x={(toScreenX(entity.startUMm) + toScreenX(entity.endUMm)) / 2} y={(toScreenY(entity.startVMm) + toScreenY(entity.endVMm)) / 2 + 12}>
              {entity.constraint === "horizontal" ? "H" : entity.constraint === "vertical" ? "V" : "45°"}
            </text>
          )}
        </g>
      );
    }
    return (
      <g className={className} key={key}>
        <circle className={styles.sketchPoint} cx={toScreenX(entity.centerUMm)} cy={toScreenY(entity.centerVMm)} r={5} />
        <line className={styles.sketchPointCross} x1={toScreenX(entity.centerUMm) - 8} x2={toScreenX(entity.centerUMm) + 8} y1={toScreenY(entity.centerVMm)} y2={toScreenY(entity.centerVMm)} />
        <line className={styles.sketchPointCross} x1={toScreenX(entity.centerUMm)} x2={toScreenX(entity.centerUMm)} y1={toScreenY(entity.centerVMm) - 8} y2={toScreenY(entity.centerVMm) + 8} />
      </g>
    );
  };

  return (
    <div
      className={styles.sketchCanvas}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest("button")) return;
        if (session.tool === "smart-dimension") {
          const target = findDimensionTarget(rawPointerToSketch(event));
          if (!target) {
            setDimensionSelection(null);
            return;
          }
          const rect = event.currentTarget.getBoundingClientRect();
          const anchorX = Math.max(
            125,
            Math.min(rect.width - 125, event.clientX - rect.left + 14),
          );
          const anchorY = Math.max(
            72,
            Math.min(rect.height - 190, event.clientY - rect.top + 14),
          );
          if (
            target.kind === "line" &&
            dimensionSelection?.kind === "line" &&
            dimensionSelection.primaryIndex !== target.index
          ) {
            setDimensionSelection({
              kind: "between-lines",
              primaryIndex: dimensionSelection.primaryIndex,
              secondaryIndex: target.index,
              anchorX,
              anchorY,
            });
          } else {
            setDimensionSelection({
              kind: target.kind,
              primaryIndex: target.index,
              anchorX,
              anchorY,
            });
          }
          setSnapIndicator(null);
          return;
        }
        const { point, snapped } = pointerToSketch(event);
        setSnapIndicator(snapped);
        if (session.tool === "point") {
          onEntityAdd({ kind: "point", centerUMm: point.u, centerVMm: point.v });
          return;
        }
        event.currentTarget.setPointerCapture(event.pointerId);
        dragStart.current = point;
        lineGesture.current =
          session.tool === "line"
            ? { farthest: point, maxDistance: 0, reversed: false }
            : null;
      }}
      onPointerMove={(event) => {
        if (session.tool === "smart-dimension") return;
        const { point, snapped } = pointerToSketch(event);
        setSnapIndicator(snapped);
        if (dragStart.current) {
          updateLineGesture(point);
          onDraftChange(createEntity(point, Boolean(snapped)));
        }
      }}
      onPointerUp={(event) => {
        if (session.tool === "smart-dimension") return;
        if (dragStart.current) {
          const { point, snapped } = pointerToSketch(event);
          updateLineGesture(point);
          const entity = createEntity(point, Boolean(snapped));
          if (entity) onEntityAdd(entity);
        }
        dragStart.current = null;
        lineGesture.current = null;
        onDraftChange(null);
      }}
      onPointerCancel={() => {
        dragStart.current = null;
        lineGesture.current = null;
        onDraftChange(null);
      }}
      ref={canvasRef}
    >
      <svg className={styles.sketchSvg} height={size.height} width={size.width}>
        {session.supportType === "planar-face" && (
          <g>
            {session.referenceEdges.map((edge, index) => (
              <line
                className={styles.sketchReferenceEdge}
                key={`reference-edge-${index}`}
                x1={toScreenX(edge.startUMm)}
                x2={toScreenX(edge.endUMm)}
                y1={toScreenY(edge.startVMm)}
                y2={toScreenY(edge.endVMm)}
              />
            ))}
            <circle
              className={styles.sketchFaceCenterTarget}
              cx={toScreenX(session.viewCenterUMm)}
              cy={toScreenY(session.viewCenterVMm)}
              r={9}
            />
            <line
              className={styles.sketchFaceCenterCross}
              x1={toScreenX(session.viewCenterUMm) - 12}
              x2={toScreenX(session.viewCenterUMm) + 12}
              y1={toScreenY(session.viewCenterVMm)}
              y2={toScreenY(session.viewCenterVMm)}
            />
            <line
              className={styles.sketchFaceCenterCross}
              x1={toScreenX(session.viewCenterUMm)}
              x2={toScreenX(session.viewCenterUMm)}
              y1={toScreenY(session.viewCenterVMm) - 12}
              y2={toScreenY(session.viewCenterVMm) + 12}
            />
            <text
              className={styles.sketchFaceCenterLabel}
              x={toScreenX(session.viewCenterUMm) + 12}
              y={toScreenY(session.viewCenterVMm) - 12}
            >
              FACE CENTER
            </text>
          </g>
        )}
        <line className={styles.sketchAxisXLine} x1={0} x2={size.width} y1={toScreenY(0)} y2={toScreenY(0)} />
        <line className={styles.sketchAxisYLine} x1={toScreenX(0)} x2={toScreenX(0)} y1={0} y2={size.height} />
        <circle className={styles.sketchOriginTarget} cx={toScreenX(0)} cy={toScreenY(0)} r={8} />
        <circle className={styles.sketchOrigin} cx={toScreenX(0)} cy={toScreenY(0)} r={3.5} />
        <text className={styles.sketchOriginLabel} x={toScreenX(0) + 8} y={toScreenY(0) - 8}>ORIGIN</text>
        {session.entities.map((entity, index) =>
          renderEntity(entity, `entity-${index}`, false, index),
        )}
        {session.draftEntity && renderEntity(session.draftEntity, "draft", true)}
        {snapIndicator && (
          <circle className={styles.sketchSnapIndicator} cx={toScreenX(snapIndicator.u)} cy={toScreenY(snapIndicator.v)} r={7} />
        )}
      </svg>

      <div className={styles.sketchModeBadge}>
        <TbPencil />
        <span><small>{session.supportType === "planar-face" ? "SKETCH ON SOLID FACE" : "EDITING SKETCH"}</small><strong>{session.planeName} · {session.entities.length} entities</strong></span>
      </div>

      <div className={styles.sketchToolbar}>
        <div>
          <span>CREATE</span>
          <div className={styles.sketchToolFlyout}>
            <button
              className={(["line", "centerline", "midpoint-line"] as SketchTool[]).includes(session.tool) ? styles.sketchToolActive : ""}
              onClick={() => chooseTool(lastLineTool)}
              title="Use the last selected Line tool"
            >
              <TbLine /> {lastLineTool === "line" ? "Line" : lastLineTool === "centerline" ? "Centerline" : "Midpoint Line"}
            </button>
            <button
              aria-label="Open Line tools"
              className={styles.sketchFlyoutArrow}
              onClick={() => setOpenToolFlyout((current) => current === "line" ? null : "line")}
              title="Line tools"
            ><TbChevronDown /></button>
            {openToolFlyout === "line" && (
              <div className={styles.sketchToolFlyoutMenu}>
                <button onClick={() => chooseTool("line")}><TbLine /><span><strong>Line</strong><small>Draw from one endpoint to another</small></span></button>
                <button onClick={() => chooseTool("centerline")}><TbLine /><span><strong>Centerline</strong><small>Construction line for references</small></span></button>
                <button onClick={() => chooseTool("midpoint-line")}><TbLine /><span><strong>Midpoint Line</strong><small>Start at the center and extend both ends</small></span></button>
              </div>
            )}
          </div>
          <div className={styles.sketchToolFlyout}>
            <button
              className={(["rectangle", "center-rectangle"] as SketchTool[]).includes(session.tool) ? styles.sketchToolActive : ""}
              onClick={() => chooseTool(lastRectangleTool)}
              title="Use the last selected Rectangle tool"
            >
              <TbRectangle /> {lastRectangleTool === "rectangle" ? "Rectangle" : "Center Rectangle"}
            </button>
            <button
              aria-label="Open Rectangle tools"
              className={styles.sketchFlyoutArrow}
              onClick={() => setOpenToolFlyout((current) => current === "rectangle" ? null : "rectangle")}
              title="Rectangle tools"
            ><TbChevronDown /></button>
            {openToolFlyout === "rectangle" && (
              <div className={styles.sketchToolFlyoutMenu}>
                <button onClick={() => chooseTool("rectangle")}><TbRectangle /><span><strong>Corner Rectangle</strong><small>Pick two opposite corners</small></span></button>
                <button onClick={() => chooseTool("center-rectangle")}><TbRectangle /><span><strong>Center Rectangle</strong><small>Pick the center, then a corner</small></span></button>
              </div>
            )}
          </div>
          <button className={session.tool === "circle" ? styles.sketchToolActive : ""} onClick={() => chooseTool("circle")}><TbCircle /> Circle</button>
          <button className={session.tool === "point" ? styles.sketchToolActive : ""} onClick={() => chooseTool("point")}><TbPoint /> Point</button>
          <span>DIMENSION</span>
          <button className={session.tool === "smart-dimension" ? styles.sketchToolActive : ""} disabled={!session.entities.length} onClick={() => chooseTool("smart-dimension")}><TbRulerMeasure /> Smart Dimension</button>
        </div>
        <div className={styles.sketchToolbarActions}>
          <button disabled={!session.entities.length} onClick={onUndo} title="Remove last entity"><TbArrowBackUp /> Undo</button>
          <button onClick={onCancel}><TbX /> Cancel</button>
          <button disabled={!session.entities.length} onClick={onFinish}><TbCheck /> Finish sketch</button>
        </div>
      </div>

      {dimensionSelection && (
        <DimensionEditor
          entities={session.entities}
          onApply={applyDimension}
          onClose={() => setDimensionSelection(null)}
          selection={dimensionSelection}
          unit={unit}
        />
      )}

      {session.tool === "smart-dimension" && session.entities.length ? (
        <div className={styles.sketchHint}>
          Click a line, rectangle edge, or circle. Select two lines to set their included angle.
        </div>
      ) : !session.entities.length && !session.draftEntity ? (
        <div className={styles.sketchHint}>
          {session.tool === "point" ? "Click" : "Click and drag"} {session.supportType === "planar-face" ? "directly on the solid face" : "to draw"}. With Line, drag outward then back to turn the line into an arc. Move near ORIGIN to snap exactly to 0, 0.
        </div>
      ) : null}
    </div>
  );
}
