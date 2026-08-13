import type { CSSProperties } from "react";
import styles from "@/styles/MotorControl.module.css";

interface ComponentVisualProps {
  type: string;
  accent: string;
  compact?: boolean;
  state?: string;
}

const Screw = ({ x, y }: { x: number; y: number }) => (
  <g>
    <circle cx={x} cy={y} r="3.2" fill="#dbe3e8" stroke="#667382" strokeWidth="1" />
    <path d={`M${x - 2} ${y}h4`} stroke="#667382" strokeWidth=".8" />
  </g>
);

export default function ComponentVisual({ type, accent, compact = false, state }: ComponentVisualProps) {
  const shared = { "--visual-accent": accent } as CSSProperties;
  const className = `${styles.componentVisual} ${compact ? styles.componentVisualCompact : ""}`;

  if (type === "motor") {
    return <svg className={className} style={shared} viewBox="0 0 100 62" aria-hidden="true">
      <path d="M18 19h57v33H18z" fill="#46627b" />
      <path d="M22 15h49l8 7H18z" fill="#66839b" />
      {[26, 35, 44, 53, 62].map((x) => <path d={`M${x} 18v34`} stroke="#28465f" strokeWidth="3" key={x} />)}
      <ellipse cx="18" cy="35.5" rx="13" ry="18" fill="#36536d" stroke="#213a51" strokeWidth="2" />
      <ellipse cx="18" cy="35.5" rx="7" ry="11" fill="#9eb1bf" /><circle cx="18" cy="35.5" r="3" fill="#344454" />
      <path d="M75 25h12v21H75z" fill="#263a4b" /><path d="M87 31h11v9H87z" fill="#aebbc4" />
      <path d="M35 10h25l5 6H31z" fill="#304b62" /><circle cx="38" cy="13" r="2" fill="#202f3e" />
    </svg>;
  }

  if (["acPower", "dcPower"].includes(type)) {
    const isOff = state === "OFF";
    const outputPoints = type === "acPower"
      ? [{ x: 29, color: "#b91c1c" }, { x: 41, color: "#b91c1c" }, { x: 53, color: "#b91c1c" }, { x: 65, color: "#2563eb" }]
      : [{ x: 35, color: "#dc3946" }, { x: 53, color: "#222f3b" }];
    return <svg className={className} style={shared} viewBox="0 0 100 62" aria-hidden="true">
      <path d="M15 13h67l7 7v35H15z" fill="#dae3e9" stroke="#728190" strokeWidth="1.5" />
      <path d="M15 13h67l7 7H22z" fill="#f2f6f8" />
      <rect x="23" y="22" width="34" height="22" rx="2" fill="#263746" />
      <rect x="27" y="26" width="26" height="9" rx="1" fill={isOff ? "#87949d" : "#9ee6de"} />
      <path d="M65 26h14M65 32h14M65 38h14" stroke="#778796" strokeWidth="3" />
      {outputPoints.map((point) => <circle key={point.x} cx={point.x} cy="50" r="4" fill={isOff ? "#6b7280" : point.color} stroke="#fff" />)}
      <path d="M89 27h7v18h-7z" fill="#8294a2" />
    </svg>;
  }

  if (type === "breaker") {
    const isOn = state === "ON";
    return <svg className={className} style={shared} viewBox="0 0 100 62" aria-hidden="true">
      {[20, 40, 60].map((x) => <g key={x}><path d={`M${x} 11h20v43H${x}z`} fill="#edf1f3" stroke="#7d8993" /><path d={`M${x + 4} 8h12v5H${x + 4}z`} fill="#314355" /><Screw x={x + 10} y={18} /><path d={`M${x + 6} ${isOn ? 24 : 30}h8v15h-8z`} fill={isOn ? "#1b8f4d" : "#26394b"} /><path d={`M${x + 7} 48h6`} stroke={isOn ? "#22c55e" : "#d49c18"} strokeWidth="3" /></g>)}
    </svg>;
  }

  if (type === "fuse") {
    const isBlown = state === "BLOWN";
    return <svg className={className} style={shared} viewBox="0 0 100 62" aria-hidden="true">
      <path d="M14 15h72v38H14z" rx="4" fill="#263b4d" />
      <path d="M25 10h50v45H25z" fill="#eff2f2" stroke="#75818c" strokeWidth="1.5" />
      <path d="M35 22h30v21H35z" fill="#dce7ea" stroke="#82919a" />
      <path d={isBlown ? "M40 31h7m6 0h7" : "M40 31h20"} stroke={isBlown ? "#dc2626" : "#d49c18"} strokeWidth="5" /><circle cx="40" cy="31" r="4" fill="#b9c5cb" /><circle cx="60" cy="31" r="4" fill="#b9c5cb" />
      <Screw x={33} y={15} /><Screw x={67} y={49} />
    </svg>;
  }

  if (["contactor", "overload", "relay"].includes(type)) {
    const isOverload = type === "overload";
    const isRelay = type === "relay";
    const isEnergized = state === "ENERGIZED";
    const isTripped = state === "TRIPPED";
    return <svg className={className} style={shared} viewBox="0 0 100 62" aria-hidden="true">
      <path d="M18 9h64v47H18z" fill={isRelay ? "#c9dbe3" : "#e8edef"} fillOpacity={isRelay ? ".78" : "1"} stroke="#657582" strokeWidth="1.5" />
      <path d="M18 9h64v10H18z" fill="#30495d" />
      {[29, 50, 71].map((x) => <g key={x}><Screw x={x} y={14} /><path d={`M${x - 5} 21h10v22h-10z`} fill="#bd7437" /><path d={`M${x - 3} 24h6v15h-6z`} fill="#e6a15a" /></g>)}
      {isOverload ? <><circle cx="40" cy="48" r="7" fill={isTripped ? "#b91c1c" : "#223748"} /><circle cx="40" cy="48" r="3" fill={isTripped ? "#fff" : "#e9b329"} /><rect x="55" y="44" width="16" height="8" rx="2" fill="#d94a42" /></> : null}
      {isRelay ? <><rect x="32" y="24" width="36" height="20" rx="3" fill={isEnergized ? "#22c55e" : "#7652c8"} opacity=".72" /><path d="M37 27h26v14H37z" fill="none" stroke="#d9c9ff" strokeWidth="2" /></> : null}
      {!isOverload && !isRelay ? <><path d="M32 46h36v6H32z" fill="#263d51" /><rect x="42" y="25" width="16" height="14" rx="2" fill={isEnergized ? "#22c55e" : "var(--visual-accent)"} opacity=".8" /></> : null}
    </svg>;
  }

  if (["startButton", "stopButton", "emergencyStop"].includes(type)) {
    const emergency = type === "emergencyStop";
    const isPressed = state === "PRESSED" || state === "LOCKED";
    const buttonColor = type === "startButton" ? "#22a765" : "#e14545";
    return <svg className={className} style={shared} viewBox="0 0 100 62" aria-hidden="true">
      <path d="M27 29h46v27H27z" fill="#263b4b" /><path d="M33 25h34v8H33z" fill="#f2c532" />
      <ellipse cx="50" cy={isPressed ? "28" : "25"} rx={emergency ? "23" : "16"} ry={emergency ? "10" : "13"} fill={buttonColor} stroke="#932a2a" strokeWidth="2" />
      <ellipse cx="50" cy={isPressed ? "27" : "22"} rx={emergency ? "19" : "12"} ry={emergency ? "7" : "9"} fill={type === "startButton" ? "#36ca7d" : "#f05a56"} />
      <path d="M37 39h26v12H37z" fill="#dfe6e9" /><Screw x={42} y={45} /><Screw x={58} y={45} />
    </svg>;
  }

  if (type === "selector") {
    const rotation = state === "MANUAL" ? 22 : -22;
    return <svg className={className} style={shared} viewBox="0 0 100 62" aria-hidden="true">
      <path d="M28 28h44v28H28z" fill="#243a4d" /><circle cx="50" cy="28" r="18" fill="#f0c632" stroke="#9c7810" strokeWidth="2" />
      <g transform={`rotate(${rotation} 50 28)`}><path d="M43 29l5-21h10l-1 23z" fill="#273846" stroke="#111d27" strokeWidth="2" /><circle cx="50" cy="28" r="5" fill="#677785" /></g>
      <path d="M36 42h28v10H36z" fill="#e5ebed" /><Screw x={42} y={47} /><Screw x={58} y={47} />
    </svg>;
  }

  if (type === "limitSwitch") {
    const isClosed = state === "CLOSED";
    return <svg className={className} style={shared} viewBox="0 0 100 62" aria-hidden="true">
      <path d="M24 25h52v31H24z" rx="4" fill="#e0a52f" stroke="#785b20" strokeWidth="1.5" /><path d={isClosed ? "M60 25l17-4" : "M60 25l13-16"} stroke="#576673" strokeWidth="5" /><circle cx={isClosed ? "80" : "77"} cy={isClosed ? "20" : "7"} r="8" fill="#aebbc4" stroke="#53616e" strokeWidth="2" />
      <path d="M30 32h40v17H30z" fill="#2e4353" /><Screw x={34} y={52} /><Screw x={66} y={52} />
    </svg>;
  }

  if (type === "sensor") {
    const isDetected = state === "DETECTED";
    return <svg className={className} style={shared} viewBox="0 0 100 62" aria-hidden="true">
      <path d="M14 23h62v24H14z" fill="#d9e1e4" stroke="#62717d" strokeWidth="1.5" /><ellipse cx="14" cy="35" rx="7" ry="12" fill="#16a3ac" /><path d="M26 23v24M34 23v24M42 23v24" stroke="#788993" />
      <path d="M76 29h15v12H76z" fill="#293c4c" /><path d="M91 35h8" stroke="#263746" strokeWidth="5" /><circle cx="21" cy="30" r={isDetected ? "4" : "2"} fill={isDetected ? "#22c55e" : "#65f2ca"} />
    </svg>;
  }

  if (type === "indicator") {
    const isOn = state === "ON";
    return <svg className={className} style={shared} viewBox="0 0 100 62" aria-hidden="true">
      <path d="M31 31h38v25H31z" fill="#263b4b" /><path d="M38 27h24v8H38z" fill="#dce5e8" />
      <path d="M37 25c0-15 26-15 26 0v3H37z" fill="var(--visual-accent)" opacity={isOn ? "1" : ".4"} /><path d="M42 20c3-7 13-7 16 0" fill="none" stroke="#fff" strokeOpacity={isOn ? ".9" : ".35"} strokeWidth="2" />
      <Screw x={42} y={46} /><Screw x={58} y={46} />
    </svg>;
  }

  if (type === "vfd") {
    const isRunning = state?.startsWith("RUN");
    return <svg className={className} style={shared} viewBox="0 0 100 62" aria-hidden="true">
      <path d="M26 5h48v53H26z" rx="3" fill="#344b62" stroke="#1e3041" strokeWidth="2" /><path d="M31 10h38v22H31z" fill="#e9eef0" />
      <rect x="36" y="14" width="28" height="9" rx="1" fill="#172a36" /><path d={isRunning ? "M39 18h20" : "M39 18h9"} stroke={isRunning ? "#22c55e" : "#74e4be"} strokeWidth="2" />
      <circle cx="40" cy="27" r="2.5" fill="#36b971" /><circle cx="50" cy="27" r="2.5" fill="#e3b52b" /><circle cx="60" cy="27" r="2.5" fill="#df5650" />
      {[36, 43, 50, 57, 64].map((x) => <path d={`M${x} 37v15`} stroke="#172c3c" strokeWidth="2" key={x} />)}
    </svg>;
  }

  if (["timerRelay", "auxContact"].includes(type)) {
    const active = ["DONE", "ON"].includes(state || "");
    return <svg className={className} style={shared} viewBox="0 0 100 62" aria-hidden="true">
      <rect x="20" y="8" width="60" height="48" rx="4" fill="#e7edf1" stroke="#64748b" strokeWidth="1.5" />
      <rect x="25" y="13" width="50" height="11" rx="2" fill={active ? "#22c55e" : "#334155"} />
      {type === "timerRelay" ? <><circle cx="50" cy="38" r="11" fill="#fff" stroke="#64748b" /><path d="M50 38V30M50 38l7 4" stroke="#7c3aed" strokeWidth="2" /></> : <><path d="M34 42h13l15-13M62 42h7" fill="none" stroke={active ? "#16a34a" : "#475569"} strokeWidth="3" /><circle cx="34" cy="42" r="3" fill="#64748b" /><circle cx="69" cy="42" r="3" fill="#64748b" /></>}
      <text x="50" y="20.5" fill="#fff" fontSize="6" fontWeight="700" textAnchor="middle">{type === "timerRelay" ? "TIMER" : "AUX"}</text>
    </svg>;
  }

  if (type === "transformer") {
    const isOff = state === "OFF";
    return <svg className={className} style={shared} viewBox="0 0 100 62" aria-hidden="true">
      <path d="M13 11h74v45H13z" fill="#334155" stroke="#1e293b" strokeWidth="2" />
      <path d="M47 15v36M53 15v36" stroke="#cbd5e1" strokeWidth="2" />
      <path d="M43 18c-15-10-15 20 0 10s15 20 0 10s-15 20 0 10M57 18c15-10 15 20 0 10s-15 20 0 10s15 20 0 10" fill="none" stroke={isOff ? "#64748b" : "#38bdf8"} strokeWidth="3" />
    </svg>;
  }

  if (type === "buzzer") {
    const isOn = state === "ON";
    return <svg className={className} style={shared} viewBox="0 0 100 62" aria-hidden="true">
      <path d="M25 25h17l17-13v38L42 38H25z" fill={isOn ? "#ef4444" : "#64748b"} stroke="#334155" strokeWidth="2" />
      {isOn ? <><path d="M66 21q13 10 0 20M72 15q21 16 0 32" fill="none" stroke="#ef4444" strokeWidth="3" /></> : null}
      <path d="M20 51h60" stroke="#334155" strokeWidth="5" />
    </svg>;
  }

  if (type === "potentiometer") {
    const rotation = state === "HIGH" ? 55 : state === "MID" ? 0 : -55;
    return <svg className={className} style={shared} viewBox="0 0 100 62" aria-hidden="true">
      <rect x="23" y="18" width="54" height="38" rx="4" fill="#334155" />
      <circle cx="50" cy="27" r="18" fill="#eab308" stroke="#854d0e" strokeWidth="2" />
      <g transform={`rotate(${rotation} 50 27)`}><path d="M50 28V10" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" /></g>
      <circle cx="50" cy="27" r="4" fill="#475569" />
    </svg>;
  }

  if (type === "ammeter") {
    return <svg className={className} style={shared} viewBox="0 0 100 62" aria-hidden="true">
      <rect x="19" y="8" width="62" height="48" rx="5" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
      <circle cx="50" cy="31" r="17" fill="#f8fafc" stroke="#64748b" />
      <path d="M37 38l13-14 13 14" fill="none" stroke="#14b8a6" strokeWidth="2" />
      <text x="50" y="38" fill="#0f172a" fontSize="13" fontWeight="800" textAnchor="middle">A</text>
    </svg>;
  }

  return <svg className={className} style={shared} viewBox="0 0 100 62" aria-hidden="true">
    <path d="M12 20h76v31H12z" fill="#d9e1e5" stroke="#697884" strokeWidth="1.5" />
    {[22, 36, 50, 64, 78].map((x) => <g key={x}><rect x={x - 6} y="25" width="12" height="20" rx="2" fill="#eef2f3" stroke="#7a8994" /><Screw x={x} y={35} /></g>)}
    <path d="M9 51h82v5H9z" fill="#8898a4" />
  </svg>;
}
