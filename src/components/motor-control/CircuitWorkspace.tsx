import { useEffect, useState } from "react";
import type { DragEvent, MouseEvent } from "react";
import { HiOutlineCursorArrowRays, HiOutlineBolt, HiOutlinePlay } from "react-icons/hi2";
import type {
  ComponentDefinition,
  PlacedComponent,
  TerminalDefinition,
  WireConnection,
  WirePoint,
} from "@/types/motorControl";
import ElectricalComponent from "./ElectricalComponent";
import { componentSize, terminalOffset } from "./componentGeometry";
import styles from "@/styles/MotorControl.module.css";

interface CircuitWorkspaceProps {
  components: ComponentDefinition[];
  placed: PlacedComponent[];
  wires: WireConnection[];
  selectedId: string | null;
  selectedWireId: string | null;
  mode: "select" | "wire";
  wireColor: string;
  zoom: number;
  pendingTerminal: { instanceId: string; terminalId: string } | null;
  draftWirePoints: WirePoint[];
  onDropComponent: (componentId: string, x: number, y: number, instanceId?: string) => void;
  onSelect: (instanceId: string | null) => void;
  onSelectWire: (wireId: string | null) => void;
  onBeginWireEdit: () => void;
  onUpdateWirePoints: (wireId: string, points: WirePoint[]) => void;
  onToggleComponent: (instanceId: string) => void;
  onTerminalClick: (instanceId: string, terminal: TerminalDefinition) => void;
  onAddWirePoint: (point: WirePoint) => void;
  onCancelWire: () => void;
  isSimulating: boolean;
  onStartSimulation: () => void;
  energizedTerminals: Set<string>;
  energizedWires: Set<string>;
}

const canvasWidth = 1200;
const canvasHeight = 680;
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const pointDistanceToLine = (point: WirePoint, start: WirePoint, end: WirePoint) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const ratio = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(point.x - (start.x + ratio * dx), point.y - (start.y + ratio * dy));
};

const simplifyRoute = (points: WirePoint[], tolerance = 3.5): WirePoint[] => {
  if (points.length <= 2) return points;
  let furthestDistance = 0;
  let furthestIndex = 0;

  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = pointDistanceToLine(points[index], points[0], points[points.length - 1]);
    if (distance > furthestDistance) {
      furthestDistance = distance;
      furthestIndex = index;
    }
  }

  if (furthestDistance <= tolerance) return [points[0], points[points.length - 1]];
  const left = simplifyRoute(points.slice(0, furthestIndex + 1), tolerance);
  const right = simplifyRoute(points.slice(furthestIndex), tolerance);
  return [...left.slice(0, -1), ...right];
};

const straightPath = (route: WirePoint[]) => {
  const points = simplifyRoute(route);
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  return points.slice(1).reduce(
    (path, point) => `${path} L ${point.x} ${point.y}`,
    `M ${points[0].x} ${points[0].y}`,
  );
};

function terminalPoint(
  placed: PlacedComponent,
  definition: ComponentDefinition,
  terminalId: string,
) {
  const terminal = definition.terminals.find((item) => item.id === terminalId);
  if (!terminal) return { x: placed.x, y: placed.y };
  const offset = terminalOffset(definition, terminal);
  return { x: placed.x + offset.x, y: placed.y + offset.y };
}

export default function CircuitWorkspace({
  components,
  placed,
  wires,
  selectedId,
  selectedWireId,
  mode,
  wireColor,
  zoom,
  pendingTerminal,
  draftWirePoints,
  onDropComponent,
  onSelect,
  onSelectWire,
  onBeginWireEdit,
  onUpdateWirePoints,
  onToggleComponent,
  onTerminalClick,
  onAddWirePoint,
  onCancelWire,
  isSimulating,
  onStartSimulation,
  energizedTerminals,
  energizedWires,
}: CircuitWorkspaceProps) {
  const [wireCursor, setWireCursor] = useState<WirePoint | null>(null);
  const [draggingWirePoint, setDraggingWirePoint] = useState<{ wireId: string; pointIndex: number } | null>(null);
  const definitions = new Map(components.map((item) => [item.id, item]));

  useEffect(() => {
    if (!pendingTerminal) setWireCursor(null);
  }, [pendingTerminal]);

  useEffect(() => {
    if (!pendingTerminal) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancelWire();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancelWire, pendingTerminal]);

  const canvasPoint = (event: MouseEvent<HTMLDivElement>): WirePoint => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: clamp((event.clientX - bounds.left) / zoom, 0, canvasWidth),
      y: clamp((event.clientY - bounds.top) / zoom, 0, canvasHeight),
    };
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const newComponentId = event.dataTransfer.getData("application/motor-component");
    const movedInstanceId = event.dataTransfer.getData("application/motor-instance");
    const rawOffset = event.dataTransfer.getData("application/motor-drag-offset");
    let offset = { x: componentSize.width / 2, y: componentSize.height / 2 };

    if (movedInstanceId && rawOffset) {
      try {
        const parsed = JSON.parse(rawOffset) as { x?: number; y?: number };
        offset = {
          x: typeof parsed.x === "number" ? parsed.x / zoom : offset.x,
          y: typeof parsed.y === "number" ? parsed.y / zoom : offset.y,
        };
      } catch {
        // ใช้ตำแหน่งกึ่งกลางเป็นค่าเริ่มต้น หากข้อมูลจุดจับไม่สมบูรณ์
      }
    }

    const x = clamp(
      (event.clientX - bounds.left) / zoom - offset.x,
      12,
      canvasWidth - componentSize.width - 12,
    );
    const y = clamp(
      (event.clientY - bounds.top) / zoom - offset.y,
      12,
      canvasHeight - componentSize.height - 12,
    );

    if (newComponentId) onDropComponent(newComponentId, x, y);
    if (movedInstanceId) {
      const existing = placed.find((item) => item.instanceId === movedInstanceId);
      if (existing) onDropComponent(existing.componentId, x, y, movedInstanceId);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const isMovingPlacedComponent = Array.from(event.dataTransfer.types).includes(
      "application/motor-instance",
    );
    event.dataTransfer.dropEffect = isMovingPlacedComponent ? "move" : "copy";
  };

  const handleCanvasClick = (event: MouseEvent<HTMLDivElement>) => {
    if (pendingTerminal) {
      onAddWirePoint(canvasPoint(event));
      return;
    }
    onSelect(null);
    onSelectWire(null);
  };

  const pointFromClient = (clientX: number, clientY: number, element: Element): WirePoint => {
    const bounds = element.getBoundingClientRect();
    return {
      x: clamp((clientX - bounds.left) / zoom, 0, canvasWidth),
      y: clamp((clientY - bounds.top) / zoom, 0, canvasHeight),
    };
  };

  const materializedPoints = (wire: WireConnection, from: WirePoint, to: WirePoint) => wire.points?.length
    ? wire.points
    : [{ x: from.x, y: from.y + (to.y - from.y) / 2 }, { x: to.x, y: from.y + (to.y - from.y) / 2 }];

  const selectWire = (event: MouseEvent<SVGPathElement>, wire: WireConnection) => {
    event.stopPropagation();
    onSelectWire(wire.id);
    onSelect(null);
  };

  const addWirePoint = (event: MouseEvent<SVGPathElement>, wire: WireConnection, from: WirePoint, to: WirePoint) => {
    event.stopPropagation();
    const point = pointFromClient(event.clientX, event.clientY, event.currentTarget.ownerSVGElement as SVGSVGElement);
    const points = materializedPoints(wire, from, to);
    const route = [from, ...points, to];
    let closestSegment = 0;
    let closestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < route.length - 1; index += 1) {
      const distance = pointDistanceToLine(point, route[index], route[index + 1]);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSegment = index;
      }
    }
    onBeginWireEdit();
    onUpdateWirePoints(wire.id, [...points.slice(0, closestSegment), point, ...points.slice(closestSegment)]);
    onSelectWire(wire.id);
  };

  const pendingInstance = pendingTerminal
    ? placed.find((item) => item.instanceId === pendingTerminal.instanceId)
    : null;
  const pendingDefinition = pendingInstance ? definitions.get(pendingInstance.componentId) : null;
  const pendingStart = pendingInstance && pendingDefinition && pendingTerminal
    ? terminalPoint(pendingInstance, pendingDefinition, pendingTerminal.terminalId)
    : null;

  return (
    <section className={styles.workspacePanel}>
      <div className={styles.workspaceHeader}>
        <div>
          <span>CIRCUIT WORKSPACE</span>
          <strong>CONTROL SCHEMATIC · SHEET 01</strong>
        </div>
        <div className={styles.workspaceHeaderActions}>
          <span><i /> GRID 20 PX <i /> ZOOM {Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className={styles.workspaceStartButton}
            onClick={onStartSimulation}
            disabled={isSimulating}
          >
            <HiOutlinePlay /> {isSimulating ? "กำลังจำลอง" : "เริ่มซิม"}
          </button>
        </div>
      </div>
      <div className={styles.workspaceViewport}>
        <div className={styles.circuitCanvasStage} style={{ width: canvasWidth * zoom, height: canvasHeight * zoom }}>
          <div
            className={`${styles.circuitCanvas} ${mode === "wire" || pendingTerminal ? styles.circuitCanvasWire : ""}`}
            style={{ transform: `scale(${zoom})` }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onMouseMove={(event) => {
              if (draggingWirePoint) {
                const wire = wires.find((item) => item.id === draggingWirePoint.wireId);
                if (wire?.points) {
                  const point = canvasPoint(event);
                  onUpdateWirePoints(wire.id, wire.points.map((item, index) => index === draggingWirePoint.pointIndex ? point : item));
                }
                return;
              }
              if (!pendingTerminal) return;
              const point = canvasPoint(event);
              setWireCursor(point);
            }}
            onMouseLeave={() => { setWireCursor(null); setDraggingWirePoint(null); }}
            onMouseUp={() => setDraggingWirePoint(null)}
            onClick={handleCanvasClick}
            onContextMenu={(event) => {
              if (!pendingTerminal) return;
              event.preventDefault();
              onCancelWire();
            }}
          >
            <svg className={styles.wireLayer} viewBox="0 0 1200 680" preserveAspectRatio="none" aria-label="Circuit wires">
            <defs>
              <filter id="wireShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.25" />
              </filter>
            </defs>
            {wires.map((wire) => {
              const fromInstance = placed.find((item) => item.instanceId === wire.from.instanceId);
              const toInstance = placed.find((item) => item.instanceId === wire.to.instanceId);
              if (!fromInstance || !toInstance) return null;
              const fromDefinition = definitions.get(fromInstance.componentId);
              const toDefinition = definitions.get(toInstance.componentId);
              if (!fromDefinition || !toDefinition) return null;
              const from = terminalPoint(fromInstance, fromDefinition, wire.from.terminalId);
              const to = terminalPoint(toInstance, toDefinition, wire.to.terminalId);
              const route = wire.points?.length
                ? [from, ...wire.points, to]
                : [from, { x: from.x, y: from.y + (to.y - from.y) / 2 }, { x: to.x, y: from.y + (to.y - from.y) / 2 }, to];
              const path = straightPath(route);
              const selected = selectedWireId === wire.id;
              return (
                <g key={wire.id}>
                  <path className={styles.wireHalo} d={path} />
                  <path className={`${styles.wirePath} ${energizedWires.has(wire.id) ? styles.wirePathEnergized : ""}`} d={path} stroke={wire.color} filter="url(#wireShadow)" />
                  <path
                    className={`${styles.wireHitArea} ${selected ? styles.wireHitAreaSelected : ""}`}
                    d={path}
                    onClick={(event) => selectWire(event, wire)}
                    onDoubleClick={(event) => addWirePoint(event, wire, from, to)}
                  />
                  <circle className={styles.wireEndpoint} cx={from.x} cy={from.y} r="4" fill={wire.color} />
                  <circle className={styles.wireEndpoint} cx={to.x} cy={to.y} r="4" fill={wire.color} />
                  {selected && materializedPoints(wire, from, to).map((point, index) => (
                    <g key={`${wire.id}-handle-${index}`}>
                      <circle className={styles.wireControlHandleHalo} cx={point.x} cy={point.y} r="10" />
                      <circle
                        className={styles.wireControlHandle}
                        cx={point.x}
                        cy={point.y}
                        r="6"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onBeginWireEdit();
                          if (!wire.points?.length) onUpdateWirePoints(wire.id, materializedPoints(wire, from, to));
                          setDraggingWirePoint({ wireId: wire.id, pointIndex: index });
                        }}
                        onClick={(event) => event.stopPropagation()}
                      />
                    </g>
                  ))}
                </g>
              );
            })}

            {pendingStart && wireCursor && (() => {
              const previewRoute = [pendingStart, ...draftWirePoints, wireCursor];
              const previewPath = straightPath(previewRoute);
              return (
                <g>
                  <path className={styles.wirePreviewHalo} d={previewPath} />
                  <path className={styles.wirePreview} d={previewPath} stroke={wireColor} />
                  {draftWirePoints.map((point, index) => (
                    <circle className={styles.wireBendPoint} cx={point.x} cy={point.y} r="5" fill={wireColor} key={`${point.x}-${point.y}-${index}`} />
                  ))}
                </g>
              );
            })()}
          </svg>

          {pendingTerminal && (
            <div className={styles.wireHint}>
              คลิกพื้นที่เพื่อเพิ่มจุดหัก · คลิก Terminal ปลายทางเพื่อจบสาย · คลิกขวาหรือ Esc เพื่อยกเลิก
            </div>
          )}

          {placed.length === 0 && (
            <div className={styles.workspaceEmpty}>
              <span><HiOutlineCursorArrowRays /><HiOutlineBolt /></span>
              <strong>DROP COMPONENTS HERE</strong>
              <p>ลากอุปกรณ์จาก Component Library มาวางบนพื้นที่ หรือกดปุ่ม + เพื่อเพิ่ม</p>
              <small>ลากจาก Terminal ต้นทางไปปล่อยที่ Terminal ปลายทางเพื่อเชื่อมสาย</small>
            </div>
          )}

          {placed.map((instance) => {
            const definition = definitions.get(instance.componentId);
            if (!definition) return null;
            return (
              <ElectricalComponent
                key={instance.instanceId}
                definition={definition}
                instance={instance}
                selected={selectedId === instance.instanceId}
                wireMode={mode === "wire"}
                pendingTerminal={pendingTerminal}
                wires={wires}
                energizedTerminals={energizedTerminals}
                onSelect={() => onSelect(instance.instanceId)}
                onActivate={() => onToggleComponent(instance.instanceId)}
                onTerminalClick={(terminal) => onTerminalClick(instance.instanceId, terminal)}
                onDragStart={(event) => {
                  event.dataTransfer.setData("application/motor-instance", instance.instanceId);
                  const bounds = event.currentTarget.getBoundingClientRect();
                  event.dataTransfer.setData(
                    "application/motor-drag-offset",
                    JSON.stringify({
                      x: event.clientX - bounds.left,
                      y: event.clientY - bounds.top,
                    }),
                  );
                  event.dataTransfer.effectAllowed = "move";
                }}
              />
            );
          })}
          </div>
        </div>
      </div>
    </section>
  );
}
