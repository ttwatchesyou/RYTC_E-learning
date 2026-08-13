import { useEffect, useRef, useState } from "react";
import type { DragEvent, MouseEvent } from "react";
import { HiOutlineCursorArrowRays, HiOutlineBolt } from "react-icons/hi2";
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
  mode: "select" | "wire";
  wireColor: string;
  zoom: number;
  pendingTerminal: { instanceId: string; terminalId: string } | null;
  draftWirePoints: WirePoint[];
  onDropComponent: (componentId: string, x: number, y: number, instanceId?: string) => void;
  onSelect: (instanceId: string | null) => void;
  onTerminalWireStart: (instanceId: string, terminal: TerminalDefinition) => void;
  onTerminalWireEnd: (instanceId: string, terminal: TerminalDefinition) => void;
  onTerminalClick: (instanceId: string, terminal: TerminalDefinition) => void;
  onAddWirePoint: (point: WirePoint) => void;
  onCancelWire: () => void;
}

const canvasWidth = 1200;
const canvasHeight = 680;
const freehandSampleDistance = 10;

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

const smoothPath = (route: WirePoint[]) => {
  const points = simplifyRoute(route);
  if (points.length < 3) return roundedPath(points);

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(0, index - 1)];
    const current = points[index];
    const next = points[index + 1];
    const afterNext = points[Math.min(points.length - 1, index + 2)];
    const controlOne = {
      x: current.x + (next.x - previous.x) / 6,
      y: current.y + (next.y - previous.y) / 6,
    };
    const controlTwo = {
      x: next.x - (afterNext.x - current.x) / 6,
      y: next.y - (afterNext.y - current.y) / 6,
    };
    path += ` C ${controlOne.x} ${controlOne.y}, ${controlTwo.x} ${controlTwo.y}, ${next.x} ${next.y}`;
  }
  return path;
};

const roundedPath = (route: WirePoint[]) => {
  const points = route.filter((point, index) => {
    if (index === 0) return true;
    const previous = route[index - 1];
    return Math.abs(point.x - previous.x) > 0.5 || Math.abs(point.y - previous.y) > 0.5;
  });
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    const incoming = Math.hypot(current.x - previous.x, current.y - previous.y);
    const outgoing = Math.hypot(next.x - current.x, next.y - current.y);
    const radius = Math.min(10, incoming / 3, outgoing / 3);
    const before = {
      x: current.x + ((previous.x - current.x) / incoming) * radius,
      y: current.y + ((previous.y - current.y) / incoming) * radius,
    };
    const after = {
      x: current.x + ((next.x - current.x) / outgoing) * radius,
      y: current.y + ((next.y - current.y) / outgoing) * radius,
    };
    path += ` L ${before.x} ${before.y} Q ${current.x} ${current.y} ${after.x} ${after.y}`;
  }
  const last = points[points.length - 1];
  return `${path} L ${last.x} ${last.y}`;
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
  mode,
  wireColor,
  zoom,
  pendingTerminal,
  draftWirePoints,
  onDropComponent,
  onSelect,
  onTerminalWireStart,
  onTerminalWireEnd,
  onTerminalClick,
  onAddWirePoint,
  onCancelWire,
}: CircuitWorkspaceProps) {
  const [wireCursor, setWireCursor] = useState<WirePoint | null>(null);
  const lastFreehandPoint = useRef<WirePoint | null>(null);
  const definitions = new Map(components.map((item) => [item.id, item]));

  useEffect(() => {
    lastFreehandPoint.current = null;
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
    if (mode === "wire" && pendingTerminal) {
      onAddWirePoint(canvasPoint(event));
      return;
    }
    onSelect(null);
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
        <div><i /> GRID 20 PX <i /> ZOOM {Math.round(zoom * 100)}%</div>
      </div>
      <div className={styles.workspaceViewport}>
        <div
          className={`${styles.circuitCanvas} ${mode === "wire" ? styles.circuitCanvasWire : ""}`}
          style={{ transform: `scale(${zoom})` }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onMouseMove={(event) => {
            if (!pendingTerminal) return;
            const point = canvasPoint(event);
            setWireCursor(point);

            if (mode === "select" && pendingStart) {
              const previous = lastFreehandPoint.current || pendingStart;
              if (Math.hypot(point.x - previous.x, point.y - previous.y) >= freehandSampleDistance) {
                lastFreehandPoint.current = point;
                onAddWirePoint(point);
              }
            }
          }}
          onMouseLeave={() => setWireCursor(null)}
          onClick={handleCanvasClick}
          onMouseUp={() => {
            if (mode === "select" && pendingTerminal) onCancelWire();
          }}
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
              const path = wire.points && wire.points.length > 2 ? smoothPath(route) : roundedPath(route);
              return (
                <g key={wire.id}>
                  <path className={styles.wireHalo} d={path} />
                  <path className={styles.wirePath} d={path} stroke={wire.color} filter="url(#wireShadow)" />
                  <circle className={styles.wireEndpoint} cx={from.x} cy={from.y} r="4" fill={wire.color} />
                  <circle className={styles.wireEndpoint} cx={to.x} cy={to.y} r="4" fill={wire.color} />
                </g>
              );
            })}

            {pendingStart && wireCursor && (() => {
              const previewRoute = [pendingStart, ...draftWirePoints, wireCursor];
              const previewPath = mode === "select" && draftWirePoints.length > 1
                ? smoothPath(previewRoute)
                : roundedPath(previewRoute);
              return (
                <g>
                  <path className={styles.wirePreviewHalo} d={previewPath} />
                  <path className={styles.wirePreview} d={previewPath} stroke={wireColor} />
                  {mode === "wire" && draftWirePoints.map((point, index) => (
                    <circle className={styles.wireBendPoint} cx={point.x} cy={point.y} r="5" fill={wireColor} key={`${point.x}-${point.y}-${index}`} />
                  ))}
                </g>
              );
            })()}
          </svg>

          {pendingTerminal && (
            <div className={styles.wireHint}>
              {mode === "wire"
                ? "คลิกพื้นที่เพื่อเพิ่มจุดหัก · คลิก Terminal เพื่อจบสาย · คลิกขวาหรือ Esc เพื่อยกเลิก"
                : "กดค้างแล้ววาดแนวสายได้อย่างอิสระ · ปล่อยที่ Terminal ปลายทางเพื่อเชื่อมสาย"}
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
                onSelect={() => onSelect(instance.instanceId)}
                onTerminalWireStart={(terminal) => onTerminalWireStart(instance.instanceId, terminal)}
                onTerminalWireEnd={(terminal) => onTerminalWireEnd(instance.instanceId, terminal)}
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
    </section>
  );
}
