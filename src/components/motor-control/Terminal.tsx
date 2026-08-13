import type { CSSProperties, MouseEvent } from "react";
import type { TerminalDefinition } from "@/types/motorControl";
import styles from "@/styles/MotorControl.module.css";

interface TerminalProps {
  terminal: TerminalDefinition;
  style: CSSProperties;
  active: boolean;
  connected: boolean;
  onWireStart: (event: MouseEvent<HTMLButtonElement>) => void;
  onWireEnd: (event: MouseEvent<HTMLButtonElement>) => void;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

export default function Terminal({ terminal, style, active, connected, onWireStart, onWireEnd, onClick }: TerminalProps) {
  return (
    <button
      type="button"
      title={`${terminal.label} · ${terminal.kind}`}
      aria-label={`Terminal ${terminal.label}`}
      className={`${styles.terminal} ${styles[`terminal${terminal.position}`]} ${styles[`terminalKind${terminal.kind}`]} ${active ? styles.terminalActive : ""} ${connected ? styles.terminalConnected : ""}`}
      style={style}
      onMouseDown={onWireStart}
      onMouseUp={onWireEnd}
      onClick={onClick}
    >
      <i />
      <span>{terminal.label}</span>
    </button>
  );
}
