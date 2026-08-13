import { useMemo, useState } from "react";
import type { DragEvent } from "react";
import { HiOutlineMagnifyingGlass, HiOutlinePlus } from "react-icons/hi2";
import type { ComponentDefinition } from "@/types/motorControl";
import ComponentVisual from "./ComponentVisual";
import styles from "@/styles/MotorControl.module.css";

interface ComponentLibraryProps {
  components: ComponentDefinition[];
  onAdd: (componentId: string) => void;
  onRemove: (instanceId: string) => void;
}

export default function ComponentLibrary({ components, onAdd, onRemove }: ComponentLibraryProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [isDeleteTarget, setIsDeleteTarget] = useState(false);
  const categories = ["All", ...Array.from(new Set(components.map((item) => item.category)))];
  const filtered = useMemo(() => components.filter((item) =>
    (category === "All" || item.category === category) && item.name.toLowerCase().includes(query.toLowerCase()),
  ), [category, components, query]);

  const handleDragStart = (event: DragEvent<HTMLDivElement>, componentId: string) => {
    event.dataTransfer.setData("application/motor-component", componentId);
    event.dataTransfer.effectAllowed = "copy";
  };

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    if (!Array.from(event.dataTransfer.types).includes("application/motor-instance")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsDeleteTarget(true);
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    const instanceId = event.dataTransfer.getData("application/motor-instance");
    if (!instanceId) return;
    event.preventDefault();
    onRemove(instanceId);
    setIsDeleteTarget(false);
  };

  return (
    <aside
      className={`${styles.componentLibrary} ${isDeleteTarget ? styles.componentLibraryDeleteTarget : ""}`}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDeleteTarget(false);
      }}
      onDrop={handleDrop}
    >
      {isDeleteTarget && (
        <div className={styles.libraryDeleteOverlay}>
          <span><HiOutlinePlus /></span>
          <strong>ปล่อยเพื่อลบอุปกรณ์</strong>
          <small>สายที่เชื่อมต่อจะถูกลบด้วย · Undo เพื่อกู้คืน</small>
        </div>
      )}
      <div className={styles.panelTitle}>
        <div><span>LEFT PANEL</span><strong>Component Library</strong></div>
        <small>{components.length} ITEMS</small>
      </div>
      <label className={styles.componentSearch}>
        <HiOutlineMagnifyingGlass />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search component" />
      </label>
      <div className={styles.libraryCategoryTabs}>
        {categories.map((item) => (
          <button key={item} type="button" className={category === item ? styles.libraryCategoryActive : ""} onClick={() => setCategory(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className={styles.componentItems}>
        {filtered.map((component) => {
          return (
            <div
              key={component.id}
              className={styles.libraryComponent}
              draggable
              onDragStart={(event) => handleDragStart(event, component.id)}
              onDoubleClick={() => onAdd(component.id)}
              title="ลากไปวางใน Workspace หรือดับเบิลคลิกเพื่อเพิ่ม"
            >
              <span className={styles.libraryComponentIcon}><ComponentVisual type={component.type} accent={component.accent} compact /></span>
              <span>
                <strong>{component.name}</strong>
                <small>{component.shortName} · {component.terminals.length} terminals</small>
              </span>
              <button type="button" onClick={() => onAdd(component.id)} aria-label={`Add ${component.name}`}><HiOutlinePlus /></button>
            </div>
          );
        })}
      </div>
      <div className={styles.dragHint}>DRAG COMPONENT TO WORKSPACE</div>
    </aside>
  );
}
