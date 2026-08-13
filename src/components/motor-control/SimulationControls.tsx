import {
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlinePlay,
  HiOutlineStop,
} from "react-icons/hi2";
import styles from "@/styles/MotorControl.module.css";

interface SimulationControlsProps {
  canSimulate: boolean;
  isSimulating: boolean;
  onCheck: () => void;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}

export default function SimulationControls({
  canSimulate,
  isSimulating,
  onCheck,
  onStart,
  onStop,
  onReset,
}: SimulationControlsProps) {
  return (
    <div className={styles.simulationControls}>
      <button type="button" className={styles.checkButton} onClick={onCheck}>
        <HiOutlineCheckCircle /> CHECK CIRCUIT
      </button>
      <span className={styles.controlDivider} />
      <button type="button" className={styles.startButton} onClick={onStart} disabled={!canSimulate || isSimulating}>
        <HiOutlinePlay /> START SIMULATION
      </button>
      <button type="button" className={styles.stopButton} onClick={onStop} disabled={!isSimulating}>
        <HiOutlineStop /> STOP
      </button>
      <button type="button" className={styles.resetButton} onClick={onReset}>
        <HiOutlineArrowPath /> RESET
      </button>
      <div className={styles.simulationState}>
        <i className={isSimulating ? styles.simulationLive : ""} />
        <span><small>SIMULATION</small><strong>{isSimulating ? "RUNNING" : "STANDBY"}</strong></span>
      </div>
    </div>
  );
}
