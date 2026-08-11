import { useState } from "react";
import {
  TbAssembly,
  TbBox,
  TbChevronDown,
  TbChevronRight,
  TbCircleDot,
  TbFileText,
  TbFolder,
  TbGeometry,
  TbLayersDifference,
  TbStack2,
} from "react-icons/tb";
import {
  CadDocument,
  CadProject,
  CadSelection,
  SketchPlane,
} from "@/features/cad/types";
import { selectionFromFeature } from "@/features/cad/lib/cadOperations";
import styles from "./CadWorkspace.module.css";

const documentIcon = {
  part: TbBox,
  assembly: TbAssembly,
  drawing: TbFileText,
};

const fileExtension = {
  part: "SLDPRT",
  assembly: "SLDASM",
  drawing: "SLDDRW",
};

interface FeatureTreeProps {
  project: CadProject;
  activeDocument: CadDocument;
  selectedId?: string;
  onSelect: (selection: CadSelection) => void;
  onPlaneDoubleClick: (plane: SketchPlane) => void;
}

export default function FeatureTree({
  project,
  activeDocument,
  selectedId,
  onSelect,
  onPlaneDoubleClick,
}: FeatureTreeProps) {
  const [featuresExpanded, setFeaturesExpanded] = useState(true);
  const DocumentIcon = documentIcon[activeDocument.type];
  const emptyMessage =
    activeDocument.type === "assembly"
      ? "Use Insert Part to add a saved Part file."
      : activeDocument.type === "drawing"
        ? "Add a view from a saved Part file."
        : "Select a plane and create a Sketch.";

  return (
    <aside className={styles.featurePanel} aria-label="Feature tree">
      <div className={styles.panelHeading}>
        <div>
          <span>{activeDocument.type.toUpperCase()} FILE</span>
          <strong>Feature tree</strong>
        </div>
      </div>

      <div className={styles.tree}>
        <button
          className={`${styles.treeRow} ${styles.treeRoot}`}
          onClick={() => {
            setFeaturesExpanded((expanded) => !expanded);
            onSelect({
              id: activeDocument.id,
              name: project.name,
              type: "document",
              metadata: {
                FileType: activeDocument.type,
                Extension: fileExtension[activeDocument.type],
                Features: activeDocument.features.length,
                Unit: project.unit,
              },
            });
          }}
        >
          {featuresExpanded ? <TbChevronDown /> : <TbChevronRight />}
          <DocumentIcon />
          <span>{project.name}</span>
          <small>{fileExtension[activeDocument.type]}</small>
        </button>

        {featuresExpanded && (
          <div className={styles.treeBranch}>
            <div className={styles.treeSeparator} />
            <div className={`${styles.treeRow} ${styles.treeRoot}`}>
              <span className={styles.treeIndent} />
              {activeDocument.type === "part" ? <TbStack2 /> : <DocumentIcon />}
              <span>
                {activeDocument.type === "part"
                  ? "Part features"
                  : activeDocument.type === "assembly"
                    ? "Components"
                    : "Drawing views"}
              </span>
            </div>

            {activeDocument.features.length ? (
              activeDocument.features.map((feature) => {
                let FeatureIcon =
                  feature.type === "origin"
                    ? TbCircleDot
                    : feature.type === "plane"
                      ? TbLayersDifference
                      : feature.type === "folder"
                        ? TbFolder
                        : TbGeometry;
                if (feature.type === "component") FeatureIcon = TbAssembly;
                if (feature.type === "annotation") FeatureIcon = TbFileText;

                return (
                  <button
                    className={`${styles.treeRow} ${
                      selectedId === feature.id ? styles.treeRowSelected : ""
                    } ${feature.suppressed ? styles.treeRowSuppressed : ""}`}
                    key={feature.id}
                    onClick={() => onSelect(selectionFromFeature(feature))}
                    onDoubleClick={() => {
                      if (feature.type === "plane") {
                        onPlaneDoubleClick(
                          String(feature.parameters.plane) as SketchPlane,
                        );
                      }
                    }}
                  >
                    <span className={styles.treeIndent} />
                    <FeatureIcon />
                    <span>{feature.name}</span>
                  </button>
                );
              })
            ) : (
              <div className={styles.emptyTree}>
                Empty {activeDocument.type}
                <small>{emptyMessage}</small>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.treeFooter}>
        <span className={styles.kernelDot} />
        File type <strong>{fileExtension[activeDocument.type]}</strong>
      </div>
    </aside>
  );
}
