import { useState } from "react";
import {
  HiOutlineCheckCircle,
  HiOutlineChevronDown,
  HiOutlineCircleStack,
  HiOutlineExclamationTriangle,
  HiOutlineInformationCircle,
} from "react-icons/hi2";
import type {
  CircuitValidationResult,
  ComponentDefinition,
  Exercise,
  PlacedComponent,
} from "@/types/motorControl";
import ComponentVisual from "./ComponentVisual";
import styles from "@/styles/MotorControl.module.css";

interface PropertiesPanelProps {
  exercise: Exercise;
  selected: PlacedComponent | null;
  definition: ComponentDefinition | null;
  validation: CircuitValidationResult | null;
  onLoadRequired: () => void;
}

export default function PropertiesPanel({
  exercise,
  selected,
  definition,
  validation,
  onLoadRequired,
}: PropertiesPanelProps) {
  const [tab, setTab] = useState<"instructions" | "properties">("instructions");

  return (
    <aside className={styles.propertiesPanel}>
      <div className={styles.panelTitle}>
        <div><span>RIGHT PANEL</span><strong>Properties / Instructions</strong></div>
        <small>EX-{String(exercise.number).padStart(2, "0")}</small>
      </div>
      <div className={styles.propertyTabs}>
        <button type="button" className={tab === "instructions" ? styles.propertyTabActive : ""} onClick={() => setTab("instructions")}>INSTRUCTIONS</button>
        <button type="button" className={tab === "properties" ? styles.propertyTabActive : ""} onClick={() => setTab("properties")}>PROPERTIES</button>
      </div>

      <div className={styles.propertyContent}>
        {tab === "instructions" ? (
          <>
            <section className={styles.instructionBlock}>
              <span className={styles.blockLabel}>OBJECTIVE</span>
              <p>{exercise.objective}</p>
            </section>
            <section className={styles.instructionBlock}>
              <span className={styles.blockLabel}>REQUIRED COMPONENTS</span>
              <div className={styles.requirementList}>
                {exercise.requiredComponents.map((type, index) => (
                  <span key={`${type}-${index}`}><i>{index + 1}</i>{type.replace(/([A-Z])/g, " $1")}</span>
                ))}
              </div>
              <button type="button" className={styles.loadComponentsButton} onClick={onLoadRequired}>LOAD REQUIRED COMPONENTS</button>
            </section>
            <section className={styles.instructionBlock}>
              <span className={styles.blockLabel}>CIRCUIT REQUIREMENTS</span>
              <ul>{exercise.circuitRequirements.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
            <section className={styles.instructionBlock}>
              <span className={styles.blockLabel}>WORKING STEPS</span>
              <ol>{exercise.instructions.map((item) => <li key={item}>{item}</li>)}</ol>
            </section>
          </>
        ) : selected && definition ? (
          <>
            <section className={styles.selectedComponentCard}>
              <span className={styles.selectedComponentIcon}><ComponentVisual type={definition.type} accent={definition.accent} compact /></span>
              <div><small>{definition.shortName}</small><strong>{definition.name}</strong></div>
              <span className={styles.componentStatusPill}>{selected.state}</span>
            </section>
            <section className={styles.instructionBlock}>
              <span className={styles.blockLabel}>CONFIGURATION</span>
              <div className={styles.propertyTable}>
                {Object.entries(definition.properties).map(([key, value]) => (
                  <div key={key}><span>{key}</span><strong>{String(value)}</strong></div>
                ))}
                <div><span>Instance ID</span><strong>{selected.instanceId.slice(-7)}</strong></div>
              </div>
            </section>
            <section className={styles.instructionBlock}>
              <span className={styles.blockLabel}>TERMINALS</span>
              <div className={styles.terminalTable}>
                {definition.terminals.map((terminal) => (
                  <span key={terminal.id}><i /> <strong>{terminal.label}</strong><small>{terminal.kind}</small></span>
                ))}
              </div>
            </section>
          </>
        ) : (
          <div className={styles.noSelection}>
            <HiOutlineCircleStack />
            <strong>No component selected</strong>
            <p>คลิกอุปกรณ์บน Workspace เพื่อดู Properties และข้อมูล Terminal</p>
          </div>
        )}

        {validation && (
          <section className={`${styles.validationCard} ${validation.valid ? styles.validationSuccess : styles.validationError}`}>
            <div className={styles.validationTitle}>
              {validation.valid ? <HiOutlineCheckCircle /> : <HiOutlineExclamationTriangle />}
              <span><small>VALIDATION RESULT</small><strong>{validation.title}</strong></span>
            </div>
            <p>{validation.summary}</p>
            {validation.passed.map((item) => <div className={styles.passedItem} key={item}><HiOutlineCheckCircle /> {item}</div>)}
            {validation.hints.map((item) => <div className={styles.hintItem} key={item}><HiOutlineInformationCircle /> {item}</div>)}
          </section>
        )}
      </div>
    </aside>
  );
}
