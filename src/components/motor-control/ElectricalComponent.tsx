import type { CSSProperties, DragEvent, MouseEvent } from "react";
import type { ComponentDefinition, PlacedComponent, TerminalDefinition, WireConnection } from "@/types/motorControl";
import { terminalOffset } from "./componentGeometry";
import ComponentVisual from "./ComponentVisual";
import Terminal from "./Terminal";
import styles from "@/styles/MotorControl.module.css";

interface ElectricalComponentProps {
  definition: ComponentDefinition;
  instance: PlacedComponent;
  selected: boolean;
  wireMode: boolean;
  pendingTerminal: { instanceId: string; terminalId: string } | null;
  wires: WireConnection[];
  energizedTerminals: Set<string>;
  onSelect: () => void;
  onActivate: () => void;
  onTerminalClick: (terminal: TerminalDefinition) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
}

const terminalStyle = (definition: ComponentDefinition, terminal: TerminalDefinition): CSSProperties => {
  const point = terminalOffset(definition, terminal);
  return { left: point.x, top: point.y };
};

export default function ElectricalComponent({
  definition,
  instance,
  selected,
  wireMode,
  pendingTerminal,
  wires,
  energizedTerminals,
  onSelect,
  onActivate,
  onTerminalClick,
  onDragStart,
}: ElectricalComponentProps) {
  const isRunning = ["RUNNING", "ENERGIZED", "ON", "RUN 35 Hz", "CLOSED", "DETECTED", "PRESSED", "DONE"].includes(instance.state);

  return (
    <div
      className={`${styles.electricalComponent} ${selected ? styles.electricalComponentSelected : ""} ${isRunning ? styles.electricalComponentRunning : ""}`}
      style={{ left: instance.x, top: instance.y, "--component-accent": definition.accent } as CSSProperties}
      draggable={!wireMode}
      onDragStart={onDragStart}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
        if (!wireMode) onActivate();
      }}
      onKeyDown={(event) => {
        if (wireMode || !["Enter", " "].includes(event.key)) return;
        event.preventDefault();
        onActivate();
      }}
      role="button"
      tabIndex={0}
      aria-label={`${definition.name} สถานะ ${instance.state} กดเพื่อเปลี่ยนสถานะ`}
      title="คลิกเพื่อเปลี่ยนสถานะ · ลากเพื่อย้ายตำแหน่ง"
    >
      <span className={styles.componentRef}>{definition.shortName}</span>
      <ComponentVisual type={definition.type} accent={definition.accent} state={instance.state} />
      <strong>{definition.name}</strong>
      <span className={styles.componentState}><i /> {instance.state}</span>

      {definition.terminals.map((terminal) => {
        const active = pendingTerminal?.instanceId === instance.instanceId && pendingTerminal.terminalId === terminal.id;
        const connected = wires.some((wire) =>
          (wire.from.instanceId === instance.instanceId && wire.from.terminalId === terminal.id) ||
          (wire.to.instanceId === instance.instanceId && wire.to.terminalId === terminal.id),
        );
        return (
          <Terminal
            key={terminal.id}
            terminal={terminal}
            style={terminalStyle(definition, terminal)}
            active={active}
            connected={connected}
            energized={energizedTerminals.has(`${instance.instanceId}::${terminal.id}`)}
            onClick={(event) => {
              event.stopPropagation();
              onTerminalClick(terminal);
            }}
          />
        );
      })}
    </div>
  );
}
