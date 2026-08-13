import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  HiOutlineArrowPath,
  HiOutlineArrowUturnLeft,
  HiOutlineArrowUturnRight,
  HiOutlineCursorArrowRays,
  HiOutlineMinus,
  HiOutlinePlus,
  HiOutlineTrash,
} from "react-icons/hi2";
import { TbCircuitSwitchOpen } from "react-icons/tb";
import { electricalComponents, exercises } from "@/data/motorControl";
import type {
  CircuitValidationResult,
  PlacedComponent,
  TerminalDefinition,
  WireConnection,
  WirePoint,
} from "@/types/motorControl";
import CircuitWorkspace from "./CircuitWorkspace";
import ComponentLibrary from "./ComponentLibrary";
import PropertiesPanel from "./PropertiesPanel";
import SimulationControls from "./SimulationControls";
import styles from "@/styles/MotorControl.module.css";

type Snapshot = { placed: PlacedComponent[]; wires: WireConnection[] };
type ToolMode = "select" | "wire";

const wireColors = [
  { name: "Red", value: "#ef4444" },
  { name: "Yellow", value: "#facc15" },
  { name: "Blue", value: "#2563eb" },
  { name: "Green", value: "#16a34a" },
  { name: "Black", value: "#111827" },
  { name: "Brown", value: "#92400e" },
  { name: "Orange", value: "#f97316" },
  { name: "Violet", value: "#7c3aed" },
] as const;

const componentById = new Map(electricalComponents.map((item) => [item.id, item]));
const componentByType = new Map(electricalComponents.map((item) => [item.type, item]));

const runningState: Record<string, string> = {
  breaker: "ON",
  contactor: "ENERGIZED",
  overload: "NORMAL",
  motor: "RUNNING",
  indicator: "ON",
  relay: "ENERGIZED",
  vfd: "RUN 35 Hz",
  startButton: "PRESSED",
};

export default function PracticeLab() {
  const [exerciseId, setExerciseId] = useState(exercises[0].id);
  const [placed, setPlaced] = useState<PlacedComponent[]>([]);
  const [wires, setWires] = useState<WireConnection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<ToolMode>("select");
  const [wireColor, setWireColor] = useState<string>(wireColors[0].value);
  const [zoom, setZoom] = useState(1);
  const [pendingTerminal, setPendingTerminal] = useState<{ instanceId: string; terminalId: string } | null>(null);
  const [draftWirePoints, setDraftWirePoints] = useState<WirePoint[]>([]);
  const [validation, setValidation] = useState<CircuitValidationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [undoStack, setUndoStack] = useState<Snapshot[]>([]);
  const [redoStack, setRedoStack] = useState<Snapshot[]>([]);
  const sequenceRef = useRef(0);

  const exercise = exercises.find((item) => item.id === exerciseId) || exercises[0];
  const selected = placed.find((item) => item.instanceId === selectedId) || null;
  const selectedDefinition = selected ? componentById.get(selected.componentId) || null : null;

  const cancelPendingWire = () => {
    setPendingTerminal(null);
    setDraftWirePoints([]);
  };

  const commit = (nextPlaced: PlacedComponent[], nextWires: WireConnection[]) => {
    setUndoStack((stack) => [...stack.slice(-29), { placed, wires }]);
    setRedoStack([]);
    setPlaced(nextPlaced);
    setWires(nextWires);
    setValidation(null);
    setIsSimulating(false);
  };

  const addComponent = (componentId: string, x?: number, y?: number) => {
    const definition = componentById.get(componentId);
    if (!definition) return;
    sequenceRef.current += 1;
    const offset = placed.length * 24;
    const instance: PlacedComponent = {
      instanceId: `${definition.type}-${Date.now()}-${sequenceRef.current}`,
      componentId,
      x: x ?? 45 + (offset % 620),
      y: y ?? 55 + (Math.floor(offset / 620) * 135),
      state: definition.defaultState,
    };
    commit([...placed, instance], wires);
    setSelectedId(instance.instanceId);
  };

  const dropComponent = (componentId: string, x: number, y: number, instanceId?: string) => {
    if (instanceId) {
      commit(placed.map((item) => item.instanceId === instanceId ? { ...item, x, y } : item), wires);
      setSelectedId(instanceId);
      return;
    }
    addComponent(componentId, x, y);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    commit(
      placed.filter((item) => item.instanceId !== selectedId),
      wires.filter((wire) => wire.from.instanceId !== selectedId && wire.to.instanceId !== selectedId),
    );
    setSelectedId(null);
    cancelPendingWire();
  };

  const removeComponent = (instanceId: string) => {
    if (!placed.some((item) => item.instanceId === instanceId)) return;
    commit(
      placed.filter((item) => item.instanceId !== instanceId),
      wires.filter((wire) => wire.from.instanceId !== instanceId && wire.to.instanceId !== instanceId),
    );
    if (selectedId === instanceId) setSelectedId(null);
    if (pendingTerminal?.instanceId === instanceId) cancelPendingWire();
  };

  const clearWorkspace = () => {
    if (!placed.length && !wires.length) return;
    commit([], []);
    setSelectedId(null);
    cancelPendingWire();
  };

  const undo = () => {
    const snapshot = undoStack[undoStack.length - 1];
    if (!snapshot) return;
    setRedoStack((stack) => [...stack, { placed, wires }]);
    setUndoStack((stack) => stack.slice(0, -1));
    setPlaced(snapshot.placed);
    setWires(snapshot.wires);
    setValidation(null);
    setIsSimulating(false);
  };

  const redo = () => {
    const snapshot = redoStack[redoStack.length - 1];
    if (!snapshot) return;
    setUndoStack((stack) => [...stack, { placed, wires }]);
    setRedoStack((stack) => stack.slice(0, -1));
    setPlaced(snapshot.placed);
    setWires(snapshot.wires);
    setValidation(null);
    setIsSimulating(false);
  };

  const startWire = (instanceId: string, terminal: TerminalDefinition) => {
    setPendingTerminal({ instanceId, terminalId: terminal.id });
    setDraftWirePoints([]);
  };

  const finishWire = (instanceId: string, terminal: TerminalDefinition) => {
    if (!pendingTerminal) return;
    if (pendingTerminal.instanceId === instanceId && pendingTerminal.terminalId === terminal.id) {
      cancelPendingWire();
      return;
    }
    const duplicate = wires.some((wire) =>
      (wire.from.instanceId === pendingTerminal.instanceId && wire.from.terminalId === pendingTerminal.terminalId &&
        wire.to.instanceId === instanceId && wire.to.terminalId === terminal.id) ||
      (wire.to.instanceId === pendingTerminal.instanceId && wire.to.terminalId === pendingTerminal.terminalId &&
        wire.from.instanceId === instanceId && wire.from.terminalId === terminal.id),
    );
    if (!duplicate) {
      const nextWire: WireConnection = {
        id: `wire-${Date.now()}-${wires.length}`,
        from: pendingTerminal,
        to: { instanceId, terminalId: terminal.id },
        color: wireColor,
        points: draftWirePoints,
      };
      commit(placed, [...wires, nextWire]);
    }
    cancelPendingWire();
  };

  const handleTerminalClick = (instanceId: string, terminal: TerminalDefinition) => {
    if (pendingTerminal) finishWire(instanceId, terminal);
    else startWire(instanceId, terminal);
  };

  const addDraftWirePoint = (point: WirePoint) => {
    if (!pendingTerminal) return;
    setDraftWirePoints((points) => points.length < 240 ? [...points, point] : points);
  };

  const loadRequired = () => {
    const countOverrides: Record<string, Record<string, number>> = {
      "forward-reverse": { contactor: 2 },
      "star-delta": { contactor: 3 },
    };
    const desired = new Map<string, number>();
    exercise.requiredComponents.forEach((type) => desired.set(type, Math.max(desired.get(type) || 0, 1)));
    Object.entries(countOverrides[exercise.id] || {}).forEach(([type, count]) => desired.set(type, count));
    const existingCounts = new Map<string, number>();
    placed.forEach((instance) => {
      const type = componentById.get(instance.componentId)?.type;
      if (type) existingCounts.set(type, (existingCounts.get(type) || 0) + 1);
    });
    const additions: PlacedComponent[] = [];
    Array.from(desired.entries()).forEach(([type, desiredCount]) => {
      const definition = componentByType.get(type);
      if (!definition) return;
      const missing = Math.max(0, desiredCount - (existingCounts.get(type) || 0));
      for (let index = 0; index < missing; index += 1) {
        sequenceRef.current += 1;
        const slot = placed.length + additions.length;
        additions.push({
          instanceId: `${type}-${Date.now()}-${sequenceRef.current}`,
          componentId: definition.id,
          x: 45 + (slot % 6) * 155,
          y: 60 + Math.floor(slot / 6) * 145,
          state: definition.defaultState,
        });
      }
    });
    if (additions.length) commit([...placed, ...additions], wires);
  };

  const validateCircuit = () => {
    const placedTypes = placed.map((item) => componentById.get(item.componentId)?.type).filter(Boolean) as string[];
    const missingTypes = Array.from(new Set(exercise.requiredComponents.filter((type) => !placedTypes.includes(type))));
    const passed: string[] = [];
    const hints: string[] = [];
    const minimumCounts: Record<string, Record<string, number>> = {
      "forward-reverse": { contactor: 2 },
      "star-delta": { contactor: 3 },
    };
    const missingCounts = Object.entries(minimumCounts[exercise.id] || {}).filter(([type, count]) =>
      placedTypes.filter((placedType) => placedType === type).length < count,
    );

    if (!missingTypes.length) passed.push("Required components are present");
    else missingTypes.forEach((type) => hints.push(`Add ${componentByType.get(type)?.name || type} to the workspace`));
    missingCounts.forEach(([type, count]) => hints.push(`This exercise requires ${count} × ${componentByType.get(type)?.name || type}`));

    const connectedPairs = exercise.expectedConnections.filter((expected) => wires.some((wire) => {
      const from = placed.find((item) => item.instanceId === wire.from.instanceId);
      const to = placed.find((item) => item.instanceId === wire.to.instanceId);
      const fromType = from ? componentById.get(from.componentId)?.type : undefined;
      const toType = to ? componentById.get(to.componentId)?.type : undefined;
      return (fromType === expected.fromType && toType === expected.toType) ||
        (fromType === expected.toType && toType === expected.fromType);
    }));

    connectedPairs.forEach((connection) => passed.push(connection.label));
    exercise.expectedConnections
      .filter((expected) => !connectedPairs.includes(expected))
      .forEach((expected) => hints.push(`Check connection: ${expected.label}`));

    const hasContactor = placedTypes.includes("contactor");
    if (hasContactor) {
      const contactorInstances = placed.filter((item) => componentById.get(item.componentId)?.type === "contactor");
      const coilConnected = contactorInstances.some((instance) => wires.some((wire) =>
        (wire.from.instanceId === instance.instanceId && ["a1", "a2"].includes(wire.from.terminalId)) ||
        (wire.to.instanceId === instance.instanceId && ["a1", "a2"].includes(wire.to.terminalId)),
      ));
      if (!coilConnected && ["start-stop", "dol"].includes(exercise.id)) hints.push("Contactor Coil A1 is not connected");
      else if (coilConnected) passed.push("Contactor coil has a control connection");
    }

    const valid = missingTypes.length === 0 && missingCounts.length === 0 && connectedPairs.length === exercise.expectedConnections.length &&
      !hints.some((hint) => hint.includes("Coil A1"));
    const result: CircuitValidationResult = {
      valid,
      title: valid ? "Circuit Correct" : "Circuit Incomplete",
      summary: valid
        ? "ลำดับการเชื่อมต่อหลักตรงตามเงื่อนไข พร้อมเริ่ม Logic Simulation"
        : "วงจรยังไม่ครบตามเงื่อนไข ตรวจรายการ Hint แล้วแก้ไขการเชื่อมต่อ",
      passed,
      hints,
    };
    setValidation(result);
    return result;
  };

  const startSimulation = () => {
    const result = validation?.valid ? validation : validateCircuit();
    if (!result.valid) return;
    setPlaced((items) => items.map((item) => {
      const type = componentById.get(item.componentId)?.type || "";
      return { ...item, state: runningState[type] || item.state };
    }));
    setIsSimulating(true);
  };

  const stopSimulation = () => {
    setPlaced((items) => items.map((item) => {
      const definition = componentById.get(item.componentId);
      const stopStates: Record<string, string> = { contactor: "OFF", motor: "STOPPED", indicator: "OFF", relay: "OFF", vfd: "STOPPED", startButton: "RELEASED" };
      return { ...item, state: stopStates[definition?.type || ""] || item.state };
    }));
    setIsSimulating(false);
  };

  const resetSimulation = () => {
    setPlaced((items) => items.map((item) => ({ ...item, state: componentById.get(item.componentId)?.defaultState || item.state })));
    setIsSimulating(false);
    setValidation(null);
    cancelPendingWire();
  };

  const switchExercise = (id: string) => {
    setExerciseId(id);
    setValidation(null);
    setIsSimulating(false);
    cancelPendingWire();
  };

  const statusText = useMemo(() => {
    if (isSimulating) return "SIMULATION RUNNING · MOTOR LOGIC ACTIVE";
    if (pendingTerminal) return `WIRE MODE · ${draftWirePoints.length} BEND POINTS · CLICK CANVAS OR DESTINATION TERMINAL`;
    if (validation?.valid) return "CIRCUIT VALIDATED · READY TO SIMULATE";
    return "READY · SELECT A COMPONENT OR CHOOSE WIRE TOOL";
  }, [draftWirePoints.length, isSimulating, pendingTerminal, validation]);

  return (
    <div className={styles.practicePage}>
      <section className={styles.practiceHeader}>
        <div>
          <span>VIRTUAL ELECTRICAL LAB</span>
          <h1>Motor Control Practice</h1>
        </div>
        <label className={styles.exerciseSelector}>
          <small>SELECT EXERCISE</small>
          <select value={exerciseId} onChange={(event) => switchExercise(event.target.value)}>
            {exercises.map((item) => <option value={item.id} key={item.id}>{String(item.number).padStart(2, "0")} · {item.title}</option>)}
          </select>
        </label>
        <div className={styles.exerciseDifficulty}>
          <small>DIFFICULTY</small>
          <strong className={styles[`difficulty${exercise.difficulty}`]}>{exercise.difficulty.toUpperCase()}</strong>
        </div>
      </section>

      <div className={styles.labToolbar}>
        <div className={styles.toolGroup}>
          <span>TOOLS</span>
          <button type="button" className={mode === "select" ? styles.toolActive : ""} onClick={() => { setMode("select"); cancelPendingWire(); }}><HiOutlineCursorArrowRays /> Select</button>
          <button type="button" className={mode === "wire" ? styles.toolActive : ""} onClick={() => setMode("wire")}><TbCircuitSwitchOpen /> Wire</button>
          <button type="button" onClick={deleteSelected} disabled={!selectedId}><HiOutlineTrash /> Delete</button>
        </div>
        <span className={styles.toolbarDivider} />
        <div className={styles.wireColorGroup}>
          <span>WIRE COLOR</span>
          <div className={styles.wireColorPalette} role="group" aria-label="เลือกสีสายไฟ">
            {wireColors.map((color) => (
              <button
                type="button"
                className={wireColor === color.value ? styles.wireColorActive : ""}
                style={{ "--wire-swatch": color.value } as CSSProperties}
                aria-label={`เลือกสายไฟสี ${color.name}`}
                aria-pressed={wireColor === color.value}
                title={color.name}
                onClick={() => setWireColor(color.value)}
                key={color.value}
              />
            ))}
            <label className={styles.customWireColor} title="เลือกสีเพิ่มเติม">
              <input
                type="color"
                value={wireColor}
                aria-label="เลือกสีสายไฟเพิ่มเติม"
                onChange={(event) => setWireColor(event.target.value)}
              />
              <span style={{ backgroundColor: wireColor }} />
            </label>
          </div>
        </div>
        <span className={styles.toolbarDivider} />
        <div className={styles.toolGroup}>
          <span>HISTORY</span>
          <button type="button" onClick={undo} disabled={!undoStack.length}><HiOutlineArrowUturnLeft /> Undo</button>
          <button type="button" onClick={redo} disabled={!redoStack.length}><HiOutlineArrowUturnRight /> Redo</button>
        </div>
        <span className={styles.toolbarDivider} />
        <div className={styles.toolGroup}>
          <span>VIEW</span>
          <button type="button" onClick={() => setZoom((value) => Math.min(1.3, value + 0.1))}><HiOutlinePlus /> Zoom In</button>
          <button type="button" onClick={() => setZoom((value) => Math.max(0.7, value - 0.1))}><HiOutlineMinus /> Zoom Out</button>
          <button type="button" onClick={() => setZoom(1)}><HiOutlineArrowPath /> 100%</button>
        </div>
        <button type="button" className={styles.clearTool} onClick={clearWorkspace}><HiOutlineTrash /> Clear</button>
      </div>

      <div className={styles.labGrid}>
        <ComponentLibrary components={electricalComponents} onAdd={addComponent} onRemove={removeComponent} />
        <CircuitWorkspace
          components={electricalComponents}
          placed={placed}
          wires={wires}
          selectedId={selectedId}
          mode={mode}
          wireColor={wireColor}
          zoom={zoom}
          pendingTerminal={pendingTerminal}
          draftWirePoints={draftWirePoints}
          onDropComponent={dropComponent}
          onSelect={setSelectedId}
          onTerminalWireStart={startWire}
          onTerminalWireEnd={finishWire}
          onTerminalClick={handleTerminalClick}
          onAddWirePoint={addDraftWirePoint}
          onCancelWire={cancelPendingWire}
        />
        <PropertiesPanel
          exercise={exercise}
          selected={selected}
          definition={selectedDefinition}
          validation={validation}
          onLoadRequired={loadRequired}
        />
      </div>

      <SimulationControls
        canSimulate={Boolean(validation?.valid)}
        isSimulating={isSimulating}
        onCheck={validateCircuit}
        onStart={startSimulation}
        onStop={stopSimulation}
        onReset={resetSimulation}
      />

      <footer className={styles.statusBar}>
        <span><i className={isSimulating ? styles.statusLive : ""} /> {statusText}</span>
        <div>
          <span>COMPONENTS <strong>{placed.length}</strong></span>
          <span>WIRES <strong>{wires.length}</strong></span>
          <span>MODE <strong>{mode.toUpperCase()}</strong></span>
          <span>SHEET <strong>01 / 01</strong></span>
        </div>
      </footer>
    </div>
  );
}
