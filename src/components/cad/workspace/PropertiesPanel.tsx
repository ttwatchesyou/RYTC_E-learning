import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  TbBox,
  TbCircle,
  TbInfoCircle,
  TbLine,
  TbPlus,
  TbSettings2,
  TbTrash,
  TbX,
} from "react-icons/tb";
import {
  CadCommand,
  CadDocument,
  CadFeature,
  CadFeatureUpdate,
  CadPartReference,
  CadSelection,
  CadUnit,
  DrawingViewKind,
  FeaturePreview,
  SketchProfile,
  SketchTool,
} from "@/features/cad/types";
import {
  getSketchEntities,
  isModelFeature,
} from "@/features/cad/lib/cadOperations";
import {
  fromMillimeters,
  toMillimeters,
} from "@/features/cad/lib/units";
import styles from "./CadWorkspace.module.css";

interface PropertiesPanelProps {
  command: CadCommand | null;
  document: CadDocument;
  partLibrary: CadPartReference[];
  selectedFeature?: CadFeature;
  selection: CadSelection | null;
  unit: CadUnit;
  onClear: () => void;
  onUpdateFeature: (featureId: string, update: CadFeatureUpdate) => void;
  onDeleteFeature: (featureId: string) => void;
  onInsertComponent: (sourceProjectId: string, sourceDocumentId: string) => void;
  onAddDrawingView: (
    sourceProjectId: string,
    sourceDocumentId: string,
    viewKind: DrawingViewKind,
  ) => void;
  onStartSketch: (planeFeatureId: string, tool?: SketchTool) => void;
  onStartSketchOnFace: (selection: CadSelection, tool?: SketchTool) => void;
  onExtrudeSketch: (sketchId: string, depthMm: number, reverse?: boolean) => void;
  onExtrudeCutSketch: (sketchId: string, depthMm: number, reverse?: boolean) => void;
  onFeaturePreviewChange: (preview: FeaturePreview | null) => void;
}

const titleCase = (value: string) =>
  value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const partReferenceKey = (part: CadPartReference) =>
  `${part.projectId}::${part.document.id}`;

const numericParameter = (feature: CadFeature, key: string, fallback = 0) => {
  const value = Number(feature.parameters[key]);
  return Number.isFinite(value) ? value : fallback;
};

function NumberField({
  label,
  value,
  suffix,
  min,
  step = "any",
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  min?: number;
  step?: number | "any";
  onChange: (value: number) => void;
}) {
  return (
    <label className={styles.editorField}>
      <span>{label}</span>
      <div>
        <input
          min={min}
          onChange={(event) => onChange(Number(event.target.value))}
          step={step}
          type="number"
          value={Number.isFinite(value) ? value : 0}
        />
        {suffix && <small>{suffix}</small>}
      </div>
    </label>
  );
}

function PartFeatureEditor({
  feature,
  unit,
  onUpdate,
  onDelete,
}: {
  feature: CadFeature;
  unit: CadUnit;
  onUpdate: PropertiesPanelProps["onUpdateFeature"];
  onDelete: PropertiesPanelProps["onDeleteFeature"];
}) {
  const isBox = feature.parameters.operation === "box";
  const [name, setName] = useState(feature.name);
  const [values, setValues] = useState<Record<string, number>>({});
  const [color, setColor] = useState(String(feature.parameters.color || "#7897b8"));

  useEffect(() => {
    setName(feature.name);
    setColor(String(feature.parameters.color || "#7897b8"));
    setValues({
      width: fromMillimeters(numericParameter(feature, "widthMm", 40), unit),
      height: fromMillimeters(numericParameter(feature, "heightMm", 20), unit),
      depth: fromMillimeters(numericParameter(feature, "depthMm", 30), unit),
      diameter: fromMillimeters(numericParameter(feature, "diameterMm", 20), unit),
      x: fromMillimeters(numericParameter(feature, "xMm"), unit),
      y: fromMillimeters(numericParameter(feature, "yMm"), unit),
      z: fromMillimeters(numericParameter(feature, "zMm"), unit),
    });
  }, [feature, unit]);

  const changeValue = (key: string, value: number) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onUpdate(feature.id, {
      name: name.trim() || feature.name,
      parameters: {
        ...(isBox
          ? {
              widthMm: Math.max(0.1, toMillimeters(values.width, unit)),
              depthMm: Math.max(0.1, toMillimeters(values.depth, unit)),
            }
          : {
              diameterMm: Math.max(0.1, toMillimeters(values.diameter, unit)),
            }),
        heightMm: Math.max(0.1, toMillimeters(values.height, unit)),
        xMm: toMillimeters(values.x, unit),
        yMm: toMillimeters(values.y, unit),
        zMm: toMillimeters(values.z, unit),
        color,
      },
    });
  };

  return (
    <form className={styles.editorForm} onSubmit={submit}>
      <label className={styles.editorTextField}>
        <span>Feature name</span>
        <input maxLength={60} onChange={(event) => setName(event.target.value)} value={name} />
      </label>
      <div className={styles.editorSectionTitle}>Dimensions</div>
      <div className={styles.editorGrid}>
        {isBox ? (
          <>
            <NumberField label="Width" min={0.1} onChange={(value) => changeValue("width", value)} suffix={unit} value={values.width} />
            <NumberField label="Height" min={0.1} onChange={(value) => changeValue("height", value)} suffix={unit} value={values.height} />
            <NumberField label="Depth" min={0.1} onChange={(value) => changeValue("depth", value)} suffix={unit} value={values.depth} />
          </>
        ) : (
          <>
            <NumberField label="Diameter" min={0.1} onChange={(value) => changeValue("diameter", value)} suffix={unit} value={values.diameter} />
            <NumberField label="Height" min={0.1} onChange={(value) => changeValue("height", value)} suffix={unit} value={values.height} />
          </>
        )}
      </div>
      <div className={styles.editorSectionTitle}>Position</div>
      <div className={styles.editorGridThree}>
        {(["x", "y", "z"] as const).map((axis) => (
          <NumberField key={axis} label={axis.toUpperCase()} onChange={(value) => changeValue(axis, value)} suffix={unit} value={values[axis]} />
        ))}
      </div>
      <label className={styles.colorField}>
        <span>Body color</span>
        <div><input onChange={(event) => setColor(event.target.value)} type="color" value={color} /><code>{color}</code></div>
      </label>
      <div className={styles.editorActions}>
        <button className={styles.editorDangerButton} onClick={() => onDelete(feature.id)} type="button">
          <TbTrash /> Delete
        </button>
        <button className={styles.editorPrimaryButton} type="submit">Apply changes</button>
      </div>
    </form>
  );
}

function SketchFeatureEditor({
  feature,
  unit,
  onUpdate,
  onDelete,
}: {
  feature: CadFeature;
  unit: CadUnit;
  onUpdate: PropertiesPanelProps["onUpdateFeature"];
  onDelete: PropertiesPanelProps["onDeleteFeature"];
}) {
  const profileKind = String(feature.parameters.profileKind);
  const isRectangle = profileKind === "rectangle";
  const isCircle = profileKind === "circle";
  const isArc = profileKind === "arc";
  const isLinear = profileKind === "line" || profileKind === "centerline";
  const [name, setName] = useState(feature.name);
  const [values, setValues] = useState<Record<string, number>>({});

  useEffect(() => {
    setName(feature.name);
    setValues({
      width: fromMillimeters(numericParameter(feature, "widthMm", 40), unit),
      height: fromMillimeters(numericParameter(feature, "heightMm", 20), unit),
      radius: fromMillimeters(numericParameter(feature, "radiusMm", 10), unit),
      u: fromMillimeters(numericParameter(feature, "centerUMm"), unit),
      v: fromMillimeters(numericParameter(feature, "centerVMm"), unit),
      startU: fromMillimeters(numericParameter(feature, "startUMm"), unit),
      startV: fromMillimeters(numericParameter(feature, "startVMm"), unit),
      endU: fromMillimeters(numericParameter(feature, "endUMm"), unit),
      endV: fromMillimeters(numericParameter(feature, "endVMm"), unit),
    });
  }, [feature, unit]);

  const changeValue = (key: string, value: number) =>
    setValues((current) => ({ ...current, [key]: value }));

  return (
    <form
      className={styles.editorForm}
      onSubmit={(event) => {
        event.preventDefault();
        const existingEntities = getSketchEntities(feature);
        let updatedPrimary: SketchProfile;
        if (isLinear) {
          updatedPrimary = {
            kind: profileKind === "centerline" ? "centerline" : "line",
            startUMm: toMillimeters(values.startU, unit),
            startVMm: toMillimeters(values.startV, unit),
            endUMm: toMillimeters(values.endU, unit),
            endVMm: toMillimeters(values.endV, unit),
          };
        } else if (isRectangle) {
          updatedPrimary = {
            kind: "rectangle",
            centerUMm: toMillimeters(values.u, unit),
            centerVMm: toMillimeters(values.v, unit),
            widthMm: Math.max(0.1, toMillimeters(values.width, unit)),
            heightMm: Math.max(0.1, toMillimeters(values.height, unit)),
          };
        } else if (isCircle) {
          updatedPrimary = {
            kind: "circle",
            centerUMm: toMillimeters(values.u, unit),
            centerVMm: toMillimeters(values.v, unit),
            radiusMm: Math.max(0.1, toMillimeters(values.radius, unit)),
          };
        } else if (isArc && existingEntities[0]?.kind === "arc") {
          updatedPrimary = existingEntities[0];
        } else {
          updatedPrimary = {
            kind: "point",
            centerUMm: toMillimeters(values.u, unit),
            centerVMm: toMillimeters(values.v, unit),
          };
        }
        onUpdate(feature.id, {
          name: name.trim() || feature.name,
          sketchEntities: [updatedPrimary, ...existingEntities.slice(1)],
          parameters: {
            ...(isLinear
              ? {
                  startUMm: toMillimeters(values.startU, unit),
                  startVMm: toMillimeters(values.startV, unit),
                  endUMm: toMillimeters(values.endU, unit),
                  endVMm: toMillimeters(values.endV, unit),
                }
              : isRectangle
              ? {
                  widthMm: Math.max(0.1, toMillimeters(values.width, unit)),
                  heightMm: Math.max(0.1, toMillimeters(values.height, unit)),
                }
              : isCircle
                ? {
                  radiusMm: Math.max(0.1, toMillimeters(values.radius, unit)),
                  }
                : {}),
            ...(!isLinear && !isArc
              ? {
                  centerUMm: toMillimeters(values.u, unit),
                  centerVMm: toMillimeters(values.v, unit),
                }
              : {}),
          },
        });
      }}
    >
      <div className={styles.sketchDependencyNotice}>
        <strong>{String(feature.parameters.plane).toUpperCase()} PLANE</strong>
        <span>{getSketchEntities(feature).length} entities · Dependent Extrude features rebuild when geometry changes.</span>
      </div>
      <label className={styles.editorTextField}>
        <span>Sketch name</span>
        <input onChange={(event) => setName(event.target.value)} value={name} />
      </label>
      <div className={styles.editorSectionTitle}>Primary entity dimensions</div>
      <div className={styles.editorGrid}>
        {isLinear ? (
          <>
            <NumberField label="Start horizontal" onChange={(value) => changeValue("startU", value)} suffix={unit} value={values.startU} />
            <NumberField label="Start vertical" onChange={(value) => changeValue("startV", value)} suffix={unit} value={values.startV} />
            <NumberField label="End horizontal" onChange={(value) => changeValue("endU", value)} suffix={unit} value={values.endU} />
            <NumberField label="End vertical" onChange={(value) => changeValue("endV", value)} suffix={unit} value={values.endV} />
          </>
        ) : isRectangle ? (
          <>
            <NumberField label="Width" min={0.1} onChange={(value) => changeValue("width", value)} suffix={unit} value={values.width} />
            <NumberField label="Height" min={0.1} onChange={(value) => changeValue("height", value)} suffix={unit} value={values.height} />
          </>
        ) : isCircle ? (
          <NumberField label="Radius" min={0.1} onChange={(value) => changeValue("radius", value)} suffix={unit} value={values.radius} />
        ) : <span className={styles.pointEntityLabel}>{isArc ? "Arc entity · edit in Sketch mode" : "Point entity"}</span>}
      </div>
      {!isLinear && !isArc && (
        <>
          <div className={styles.editorSectionTitle}>Position on plane</div>
          <div className={styles.editorGrid}>
            <NumberField label="Horizontal" onChange={(value) => changeValue("u", value)} suffix={unit} value={values.u} />
            <NumberField label="Vertical" onChange={(value) => changeValue("v", value)} suffix={unit} value={values.v} />
          </div>
        </>
      )}
      <div className={styles.editorActions}>
        <button className={styles.editorDangerButton} onClick={() => onDelete(feature.id)} type="button"><TbTrash /> Delete</button>
        <button className={styles.editorPrimaryButton} type="submit">Update sketch</button>
      </div>
    </form>
  );
}

function ExtrudeFeatureEditor({
  feature,
  unit,
  onUpdate,
  onDelete,
}: {
  feature: CadFeature;
  unit: CadUnit;
  onUpdate: PropertiesPanelProps["onUpdateFeature"];
  onDelete: PropertiesPanelProps["onDeleteFeature"];
}) {
  const isCut = feature.parameters.operation === "extrude-cut";
  const [name, setName] = useState(feature.name);
  const [depth, setDepth] = useState(
    fromMillimeters(numericParameter(feature, "depthMm", 20), unit),
  );
  const [reverse, setReverse] = useState(feature.parameters.reverse === true);
  const [color, setColor] = useState(String(feature.parameters.color || "#7897b8"));

  useEffect(() => {
    setName(feature.name);
    setDepth(fromMillimeters(numericParameter(feature, "depthMm", 20), unit));
    setReverse(feature.parameters.reverse === true);
    setColor(String(feature.parameters.color || "#7897b8"));
  }, [feature, unit]);

  return (
    <form
      className={styles.editorForm}
      onSubmit={(event) => {
        event.preventDefault();
        onUpdate(feature.id, {
          name: name.trim() || feature.name,
          parameters: {
            depthMm: Math.max(0.1, toMillimeters(depth, unit)),
            reverse,
            color,
          },
        });
      }}
    >
      <div className={styles.sketchDependencyNotice}>
        <strong>{isCut ? "BOOLEAN CUT FEATURE" : "SKETCH-BASED FEATURE"}</strong>
        <span>Profile: {String(feature.parameters.sketchId)}</span>
      </div>
      <label className={styles.editorTextField}>
        <span>Feature name</span>
        <input onChange={(event) => setName(event.target.value)} value={name} />
      </label>
      <div className={styles.editorSectionTitle}>Extrusion</div>
      <NumberField label="Depth" min={0.1} onChange={setDepth} suffix={unit} value={depth} />
      <div className={styles.toggleRows}>
        <label><input checked={reverse} onChange={(event) => setReverse(event.target.checked)} type="checkbox" /> Reverse direction</label>
      </div>
      {!isCut && (
        <label className={styles.colorField}>
          <span>Body color</span>
          <div><input onChange={(event) => setColor(event.target.value)} type="color" value={color} /><code>{color}</code></div>
        </label>
      )}
      <div className={styles.editorActions}>
        <button className={styles.editorDangerButton} onClick={() => onDelete(feature.id)} type="button"><TbTrash /> Delete</button>
        <button className={styles.editorPrimaryButton} type="submit">Rebuild feature</button>
      </div>
    </form>
  );
}

function ExtrudeFromSketchCreator({
  sketch,
  unit,
  onExtrude,
  onExtrudeCut,
  onPreviewChange,
  operation,
  cutTargets,
}: {
  sketch: CadFeature;
  unit: CadUnit;
  onExtrude: PropertiesPanelProps["onExtrudeSketch"];
  onExtrudeCut: PropertiesPanelProps["onExtrudeCutSketch"];
  onPreviewChange: PropertiesPanelProps["onFeaturePreviewChange"];
  operation: FeaturePreview["operation"];
  cutTargets: CadFeature[];
}) {
  const isCut = operation === "extrude-cut";
  const canCut = cutTargets.length > 0;
  const [depth, setDepth] = useState(fromMillimeters(20, unit));
  const [reverse, setReverse] = useState(isCut);
  const updatePreview = (nextDepth: number, nextReverse: boolean) => {
    onPreviewChange({
      operation,
      sketchId: sketch.id,
      depthMm: Math.max(0.1, toMillimeters(nextDepth, unit)),
      reverse: nextReverse,
    });
  };
  if (sketch.parameters.closed !== true) {
    return (
      <div className={styles.foundationNotice}>
        <TbInfoCircle />
        <p>This Sketch is an open profile. Extrude requires a closed Rectangle or Circle.</p>
      </div>
    );
  }
  return (
    <form
      className={styles.editorForm}
      onSubmit={(event) => {
        event.preventDefault();
        if (isCut && canCut) {
          onExtrudeCut(
            sketch.id,
            Math.max(0.1, toMillimeters(depth, unit)),
            reverse,
          );
        } else if (!isCut) {
          onExtrude(
            sketch.id,
            Math.max(0.1, toMillimeters(depth, unit)),
            reverse,
          );
        }
      }}
    >
      <div className={styles.editorIntro}>
        <TbBox />
        <div><strong>{isCut ? "Extrude Cut" : "Extrude"} {sketch.name}</strong><span>{isCut ? "Preview the volume that will be removed." : "Preview a solid from this closed profile."}</span></div>
      </div>
      <div className={`${styles.featurePreviewNotice} ${isCut ? styles.cutPreviewNotice : ""}`}>
        <span /> {isCut ? "CUT PREVIEW" : "EXTRUDE PREVIEW"}
      </div>
      <NumberField
        label="Extrude depth"
        min={0.1}
        onChange={(value) => {
          setDepth(value);
          updatePreview(value, reverse);
        }}
        suffix={unit}
        value={depth}
      />
      <label className={styles.previewReverseField}>
        <input
          checked={reverse}
          onChange={(event) => {
            setReverse(event.target.checked);
            updatePreview(depth, event.target.checked);
          }}
          type="checkbox"
        />
        Reverse direction
      </label>
      {isCut && (
        <div className={styles.foundationNotice}>
          <TbInfoCircle /><p>{canCut ? `Feature Scope: all ${cutTargets.length} existing ${cutTargets.length === 1 ? "body" : "bodies"}. Only bodies crossed by the red preview lose material.` : "Create a solid body before applying Extrude Cut."}</p>
        </div>
      )}
      <button className={styles.editorPrimaryButton} disabled={isCut && !canCut} type="submit">
        <TbPlus /> {isCut ? "Apply Extrude Cut" : "Create Extrude"}
      </button>
    </form>
  );
}

function PlaneSketchStarter({
  plane,
  onStart,
}: {
  plane: CadFeature;
  onStart: PropertiesPanelProps["onStartSketch"];
}) {
  return (
    <div className={styles.planeSketchStarter}>
      <div className={styles.sketchDependencyNotice}>
        <strong>{plane.name}</strong>
        <span>Align the camera and create a 2D profile on this plane.</span>
      </div>
      <div className={styles.editorSectionTitle}>Start sketch with</div>
      <button onClick={() => onStart(plane.id, "rectangle")}><TbBox /><span><strong>Rectangle</strong><small>Click and drag two corners</small></span></button>
      <button onClick={() => onStart(plane.id, "center-rectangle")}><TbBox /><span><strong>Center Rectangle</strong><small>Click center and drag a corner</small></span></button>
      <button onClick={() => onStart(plane.id, "circle")}><TbCircle /><span><strong>Circle</strong><small>Click center and drag radius</small></span></button>
    </div>
  );
}

function FaceSketchStarter({
  selection,
  onStart,
}: {
  selection: CadSelection;
  onStart: PropertiesPanelProps["onStartSketchOnFace"];
}) {
  return (
    <div className={styles.planeSketchStarter}>
      <div className={styles.sketchDependencyNotice}>
        <strong>PLANAR FACE · {String(selection.metadata?.plane).toUpperCase()}</strong>
        <span>New Sketch geometry will be attached to this solid face.</span>
      </div>
      <div className={styles.editorSectionTitle}>Start sketch with</div>
      <button onClick={() => onStart(selection, "line")}><TbLine /><span><strong>Line</strong><small>Includes horizontal, vertical and 45° snap</small></span></button>
      <button onClick={() => onStart(selection, "rectangle")}><TbBox /><span><strong>Rectangle</strong><small>Draw directly on the selected face</small></span></button>
      <button onClick={() => onStart(selection, "center-rectangle")}><TbBox /><span><strong>Center Rectangle</strong><small>Snap its center to the selected face</small></span></button>
      <button onClick={() => onStart(selection, "circle")}><TbCircle /><span><strong>Circle</strong><small>Draw directly on the selected face</small></span></button>
    </div>
  );
}

function ComponentEditor({
  feature,
  unit,
  onUpdate,
  onDelete,
}: {
  feature: CadFeature;
  unit: CadUnit;
  onUpdate: PropertiesPanelProps["onUpdateFeature"];
  onDelete: PropertiesPanelProps["onDeleteFeature"];
}) {
  const [name, setName] = useState(feature.name);
  const [values, setValues] = useState<Record<string, number>>({});
  const [visible, setVisible] = useState(feature.parameters.visible !== false);
  const [fixed, setFixed] = useState(feature.parameters.fixed === true);

  useEffect(() => {
    setName(feature.name);
    setVisible(feature.parameters.visible !== false);
    setFixed(feature.parameters.fixed === true);
    setValues({
      x: fromMillimeters(numericParameter(feature, "xMm"), unit),
      y: fromMillimeters(numericParameter(feature, "yMm"), unit),
      z: fromMillimeters(numericParameter(feature, "zMm"), unit),
      rx: numericParameter(feature, "rotationXDeg"),
      ry: numericParameter(feature, "rotationYDeg"),
      rz: numericParameter(feature, "rotationZDeg"),
    });
  }, [feature, unit]);

  const changeValue = (key: string, value: number) =>
    setValues((current) => ({ ...current, [key]: value }));

  return (
    <form
      className={styles.editorForm}
      onSubmit={(event) => {
        event.preventDefault();
        onUpdate(feature.id, {
          name: name.trim() || feature.name,
          parameters: {
            xMm: toMillimeters(values.x, unit),
            yMm: toMillimeters(values.y, unit),
            zMm: toMillimeters(values.z, unit),
            rotationXDeg: values.rx,
            rotationYDeg: values.ry,
            rotationZDeg: values.rz,
            visible,
            fixed,
          },
        });
      }}
    >
      <label className={styles.editorTextField}>
        <span>Component name</span>
        <input onChange={(event) => setName(event.target.value)} value={name} />
      </label>
      <div className={styles.editorSectionTitle}>Position</div>
      <div className={styles.editorGridThree}>
        {(["x", "y", "z"] as const).map((axis) => (
          <NumberField key={axis} label={axis.toUpperCase()} onChange={(value) => changeValue(axis, value)} suffix={unit} value={values[axis]} />
        ))}
      </div>
      <div className={styles.editorSectionTitle}>Rotation</div>
      <div className={styles.editorGridThree}>
        {(["rx", "ry", "rz"] as const).map((axis) => (
          <NumberField key={axis} label={axis.toUpperCase()} onChange={(value) => changeValue(axis, value)} suffix="°" value={values[axis]} />
        ))}
      </div>
      <div className={styles.toggleRows}>
        <label><input checked={visible} onChange={(event) => setVisible(event.target.checked)} type="checkbox" /> Visible</label>
        <label><input checked={fixed} onChange={(event) => setFixed(event.target.checked)} type="checkbox" /> Fixed component</label>
      </div>
      <div className={styles.editorActions}>
        <button className={styles.editorDangerButton} onClick={() => onDelete(feature.id)} type="button"><TbTrash /> Remove</button>
        <button className={styles.editorPrimaryButton} type="submit">Apply transform</button>
      </div>
    </form>
  );
}

function DrawingViewEditor({
  feature,
  unit,
  onUpdate,
  onDelete,
}: {
  feature: CadFeature;
  unit: CadUnit;
  onUpdate: PropertiesPanelProps["onUpdateFeature"];
  onDelete: PropertiesPanelProps["onDeleteFeature"];
}) {
  const [x, setX] = useState(fromMillimeters(numericParameter(feature, "xMm"), unit));
  const [y, setY] = useState(fromMillimeters(numericParameter(feature, "yMm"), unit));
  const [scale, setScale] = useState(numericParameter(feature, "scale", 0.42));

  useEffect(() => {
    setX(fromMillimeters(numericParameter(feature, "xMm"), unit));
    setY(fromMillimeters(numericParameter(feature, "yMm"), unit));
    setScale(numericParameter(feature, "scale", 0.42));
  }, [feature, unit]);

  return (
    <form
      className={styles.editorForm}
      onSubmit={(event) => {
        event.preventDefault();
        onUpdate(feature.id, {
          parameters: {
            xMm: toMillimeters(x, unit),
            yMm: toMillimeters(y, unit),
            scale: Math.max(0.1, scale),
          },
        });
      }}
    >
      <div className={styles.editorGrid}>
        <NumberField label="Sheet X" onChange={setX} suffix={unit} value={x} />
        <NumberField label="Sheet Y" onChange={setY} suffix={unit} value={y} />
        <NumberField label="Scale" min={0.1} onChange={setScale} step={0.05} value={scale} />
      </div>
      <div className={styles.editorActions}>
        <button className={styles.editorDangerButton} onClick={() => onDelete(feature.id)} type="button"><TbTrash /> Delete view</button>
        <button className={styles.editorPrimaryButton} type="submit">Update view</button>
      </div>
    </form>
  );
}

function PartPicker({
  parts,
  actionLabel,
  onPick,
}: {
  parts: CadPartReference[];
  actionLabel: string;
  onPick: (sourceProjectId: string, sourceDocumentId: string) => void;
}) {
  return parts.length ? (
    <div className={styles.partPicker}>
      {parts.map((part) => (
        <button key={`${part.projectId}:${part.document.id}`} onClick={() => onPick(part.projectId, part.document.id)}>
          <TbBox />
          <span><strong>{part.projectName}</strong><small>{part.document.features.filter((feature) => feature.type === "feature").length} features · {part.document.name}</small></span>
          <em>{actionLabel}</em>
        </button>
      ))}
    </div>
  ) : (
    <div className={styles.foundationNotice}>
      <TbInfoCircle /><p>Create and save a Part file from the Project Hub before continuing.</p>
    </div>
  );
}

export default function PropertiesPanel({
  command,
  document,
  partLibrary,
  selectedFeature,
  selection,
  unit,
  onClear,
  onUpdateFeature,
  onDeleteFeature,
  onInsertComponent,
  onAddDrawingView,
  onStartSketch,
  onStartSketchOnFace,
  onExtrudeSketch,
  onExtrudeCutSketch,
  onFeaturePreviewChange,
}: PropertiesPanelProps) {
  const [drawingSourceKey, setDrawingSourceKey] = useState("");
  const parts = useMemo(() => partLibrary, [partLibrary]);
  const drawingSource = parts.find(
    (part) => partReferenceKey(part) === drawingSourceKey,
  );

  useEffect(() => {
    if (!parts.length) {
      setDrawingSourceKey("");
      return;
    }
    if (!parts.some((part) => partReferenceKey(part) === drawingSourceKey)) {
      setDrawingSourceKey(partReferenceKey(parts[0]));
    }
  }, [drawingSourceKey, parts]);

  const drawingCommand = command?.id.match(/^drawing-(front|top|right|isometric)-view$/)?.[1] as
    | DrawingViewKind
    | undefined;
  const runnableSketchCommand = Boolean(
    command &&
      [
        "sketch-line",
        "sketch-centerline",
        "sketch-midpoint-line",
        "sketch-rectangle",
        "sketch-center-rectangle",
        "sketch-circle",
        "sketch-point",
      ].includes(command.id),
  );
  const hasContext = Boolean(command || selection);

  const editor = selection?.type === "face" ? (
    <FaceSketchStarter onStart={onStartSketchOnFace} selection={selection} />
  ) : selectedFeature ? (
    selectedFeature.type === "plane" ? (
      <PlaneSketchStarter onStart={onStartSketch} plane={selectedFeature} />
    ) : selectedFeature.type === "sketch" && (command?.id === "features-extrude" || command?.id === "features-extrude-cut") ? (
      <ExtrudeFromSketchCreator
        cutTargets={(() => {
          const directTarget = document.features.find(
            (feature) =>
              selectedFeature.parentIds.includes(feature.id) &&
              isModelFeature(feature),
          );
          const modelFeatures = document.features.filter(isModelFeature);
          return directTarget
            ? [
                directTarget,
                ...modelFeatures.filter(
                  (feature) => feature.id !== directTarget.id,
                ),
              ]
            : modelFeatures;
        })()}
        key={command.id}
        onExtrude={onExtrudeSketch}
        onExtrudeCut={onExtrudeCutSketch}
        onPreviewChange={onFeaturePreviewChange}
        operation={command.id === "features-extrude-cut" ? "extrude-cut" : "extrude"}
        sketch={selectedFeature}
        unit={unit}
      />
    ) : selectedFeature.type === "sketch" ? (
      <SketchFeatureEditor feature={selectedFeature} onDelete={onDeleteFeature} onUpdate={onUpdateFeature} unit={unit} />
    ) : selectedFeature.type === "feature" && (selectedFeature.parameters.operation === "extrude" || selectedFeature.parameters.operation === "extrude-cut") ? (
      <ExtrudeFeatureEditor feature={selectedFeature} onDelete={onDeleteFeature} onUpdate={onUpdateFeature} unit={unit} />
    ) : selectedFeature.type === "component" ? (
      <ComponentEditor feature={selectedFeature} onDelete={onDeleteFeature} onUpdate={onUpdateFeature} unit={unit} />
    ) : selectedFeature.type === "annotation" ? (
      <DrawingViewEditor feature={selectedFeature} onDelete={onDeleteFeature} onUpdate={onUpdateFeature} unit={unit} />
    ) : selectedFeature.type === "feature" && selectedFeature.parameters.operation ? (
      <PartFeatureEditor feature={selectedFeature} onDelete={onDeleteFeature} onUpdate={onUpdateFeature} unit={unit} />
    ) : null
  ) : null;

  return (
    <aside className={styles.propertiesPanel} aria-label="Properties">
      <div className={styles.panelHeading}>
        <div><span>INSPECTOR</span><strong>Properties</strong></div>
        {hasContext && <button aria-label="Clear selection" className={styles.panelIconButton} onClick={onClear}><TbX /></button>}
      </div>

      <div className={styles.propertyContent}>
        {editor && selection && (
          <>
            <div className={styles.selectionHeading}>
              <span>{selection.type.charAt(0).toUpperCase()}</span>
              <div><small>{titleCase(selection.type)}</small><h3>{selection.type === "face" ? selection.name : selectedFeature?.name}</h3></div>
            </div>
            {editor}
          </>
        )}

        {!editor && selection && (
          <>
            <div className={styles.selectionHeading}>
              <span>{selection.type.charAt(0).toUpperCase()}</span>
              <div><small>{titleCase(selection.type)}</small><h3>{selection.name}</h3></div>
            </div>
            <div className={styles.propertySection}>
              <h4>Identity</h4>
              <dl className={styles.propertyList}>
                <div><dt>Type</dt><dd>{titleCase(selection.type)}</dd></div>
                <div><dt>Name</dt><dd>{selection.name}</dd></div>
                <div className={styles.idProperty}><dt>ID</dt><dd>{selection.id}</dd></div>
              </dl>
            </div>
          </>
        )}

        {!selection && command && (
          <>
            <div className={styles.activeCommandTitle}>
              <span>{command.glyph}</span>
              <div><small>{command.group}</small><h3>{command.label}</h3></div>
            </div>
            {document.type === "part" && (command?.id === "features-extrude" || command?.id === "features-extrude-cut") && (
              <div className={styles.foundationNotice}><TbInfoCircle /><p>Select a closed Sketch in the Feature Tree, then choose {command.label} again.</p></div>
            )}
            {document.type === "part" && runnableSketchCommand && (
              <div className={styles.foundationNotice}><TbInfoCircle /><p>Select Front, Top, Right Plane, or a planar solid face before starting this sketch tool.</p></div>
            )}
            {document.type === "assembly" && command.id === "assembly-insert-part" && (
              <div className={styles.editorForm}>
                <div className={styles.editorSectionTitle}>Saved Part files</div>
                <PartPicker actionLabel="Insert" onPick={onInsertComponent} parts={parts} />
              </div>
            )}
            {document.type === "drawing" && drawingCommand && (
              <div className={styles.editorForm}>
                <label className={styles.editorTextField}>
                  <span>Source Part</span>
                  <select onChange={(event) => setDrawingSourceKey(event.target.value)} value={drawingSourceKey}>
                    {parts.map((part) => <option key={partReferenceKey(part)} value={partReferenceKey(part)}>{part.projectName}</option>)}
                  </select>
                </label>
                {drawingSource ? (
                  <button className={styles.editorPrimaryButton} onClick={() => onAddDrawingView(drawingSource.projectId, drawingSource.document.id, drawingCommand)}>
                    <TbPlus /> Add {titleCase(drawingCommand)} view
                  </button>
                ) : (
                  <div className={styles.foundationNotice}><TbInfoCircle /><p>Create a Part document first.</p></div>
                )}
              </div>
            )}
            {command.id !== "features-extrude" && command.id !== "features-extrude-cut" && !runnableSketchCommand && command.id !== "assembly-insert-part" && !drawingCommand && (
              <>
                <p className={styles.commandDescription}>{command.description}</p>
                <div className={styles.foundationNotice}>
                  <TbInfoCircle /><p>This advanced operation still requires the future geometry kernel.</p>
                </div>
              </>
            )}
          </>
        )}

        {!selection && !command && document.type === "part" && (
          <div className={styles.quickCreate}>
            <span><TbSettings2 /></span>
            <strong>Sketch-first workflow</strong>
            <p>Select a reference plane or click a planar face on the solid to begin.</p>
            <ol className={styles.workflowSteps}>
              <li><b>1</b><span><strong>Select Plane</strong><small>Front, Top, or Right</small></span></li>
              <li><b>2</b><span><strong>Draw Sketch</strong><small>Rectangle or Circle</small></span></li>
              <li><b>3</b><span><strong>Extrude Sketch</strong><small>Create the 3D solid</small></span></li>
            </ol>
          </div>
        )}

        {!selection && !command && document.type === "assembly" && (
          <div className={styles.quickCreate}>
            <span><TbSettings2 /></span>
            <strong>Insert a Part</strong>
            <p>Open a saved Part file as a referenced Assembly component.</p>
            <PartPicker actionLabel="Insert" onPick={onInsertComponent} parts={parts} />
          </div>
        )}

        {!selection && !command && document.type === "drawing" && (
          <div className={styles.quickCreate}>
            <span><TbSettings2 /></span>
            <strong>Add drawing view</strong>
            <p>Choose a source Part and an orthographic view.</p>
            {parts.length ? (
              <>
                <label className={styles.editorTextField}>
                  <span>Source Part</span>
                  <select onChange={(event) => setDrawingSourceKey(event.target.value)} value={drawingSourceKey}>
                    {parts.map((part) => <option key={partReferenceKey(part)} value={partReferenceKey(part)}>{part.projectName}</option>)}
                  </select>
                </label>
                <div className={styles.drawingViewButtons}>
                  {(["front", "top", "right", "isometric"] as DrawingViewKind[]).map((kind) => (
                    <button disabled={!drawingSource} key={kind} onClick={() => drawingSource && onAddDrawingView(drawingSource.projectId, drawingSource.document.id, kind)}>{titleCase(kind)}</button>
                  ))}
                </div>
              </>
            ) : (
              <div className={styles.foundationNotice}><TbInfoCircle /><p>Create a Part document first.</p></div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
