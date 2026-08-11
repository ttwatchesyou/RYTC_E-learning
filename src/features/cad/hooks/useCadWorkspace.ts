import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CadCommand,
  CadFeatureUpdate,
  DrawingViewKind,
  CadPartReference,
  CadProject,
  CadSelection,
  CommandCategory,
  PrimitiveKind,
  SketchProfile,
  SketchReferenceEdge,
  SketchSession,
  SketchTool,
  ViewOrientation,
} from "@/features/cad/types";
import {
  loadProject,
  loadPartLibrary,
  saveProject,
} from "@/features/cad/lib/projectRepository";
import {
  createComponentFeature,
  createDrawingViewFeature,
  createExtrudeCutFromSketchFeature,
  createExtrudeFromSketchFeature,
  createPrimitiveFeature,
  createSketchFeature,
  isModelFeature,
  selectionFromFeature,
} from "@/features/cad/lib/cadOperations";

const faceFocusTarget = (
  selection: CadSelection,
  plane: SketchSession["plane"],
  offsetMm: number,
) => {
  const value = (key: string, fallback: number) => {
    const parsed = Number(selection.metadata?.[key]);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  return {
    targetXmm: value("centerXmm", plane === "right" ? offsetMm : 0),
    targetYmm: value("centerYmm", plane === "top" ? offsetMm : 0),
    targetZmm: value("centerZmm", plane === "front" ? offsetMm : 0),
  };
};

const sketchViewCenter = (
  plane: SketchSession["plane"],
  target: ReturnType<typeof faceFocusTarget>,
) => ({
  viewCenterUMm: plane === "right" ? target.targetZmm : target.targetXmm,
  viewCenterVMm: plane === "top" ? target.targetZmm : target.targetYmm,
});

const faceReferenceEdges = (selection: CadSelection): SketchReferenceEdge[] => {
  const serialized = selection.metadata?.referenceEdges;
  if (typeof serialized !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((edge) => {
      if (
        !Array.isArray(edge) ||
        edge.length !== 4 ||
        !edge.every((value) => Number.isFinite(Number(value)))
      ) return [];
      return [{
        startUMm: Number(edge[0]),
        startVMm: Number(edge[1]),
        endUMm: Number(edge[2]),
        endVMm: Number(edge[3]),
      }];
    });
  } catch {
    return [];
  }
};

export function useCadWorkspace(projectId?: string) {
  const [project, setProject] = useState<CadProject | null>(null);
  const [partLibrary, setPartLibrary] = useState<CadPartReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] =
    useState<CommandCategory>("sketch");
  const [activeCommand, setActiveCommand] = useState<CadCommand | null>(null);
  const [selection, setSelection] = useState<CadSelection | null>(null);
  const [view, setView] = useState<ViewOrientation>("isometric");
  const [showGrid, setShowGrid] = useState(true);
  const [showPlanes, setShowPlanes] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [sketchSession, setSketchSession] = useState<SketchSession | null>(null);
  const [planeFocus, setPlaneFocus] = useState({
    focused: false,
    revision: 0,
    normalSign: 1 as -1 | 1,
    offsetMm: 0,
    targetXmm: 0,
    targetYmm: 0,
    targetZmm: 0,
  });

  useEffect(() => {
    if (!projectId) return;
    setProject(loadProject(projectId) ?? null);
    setPartLibrary(loadPartLibrary());
    setLoading(false);
  }, [projectId]);

  const activeDocument = useMemo(
    () =>
      project?.documents.find(
        (document) => document.id === project.activeDocumentId,
      ) ?? project?.documents[0],
    [project],
  );

  const selectedFeature = useMemo(
    () => activeDocument?.features.find((feature) => feature.id === selection?.id),
    [activeDocument, selection?.id],
  );

  useEffect(() => {
    if (selectedFeature && selection?.type !== "face") {
      setSelection(selectionFromFeature(selectedFeature));
    }
  }, [selectedFeature, selection?.type]);

  const selectCommand = useCallback((command: CadCommand, preserveSelection = false) => {
    setActiveCommand(command);
    if (!preserveSelection) setSelection(null);
  }, []);

  const selectObject = useCallback((nextSelection: CadSelection | null) => {
    setSelection(nextSelection);
    if (nextSelection) setActiveCommand(null);
  }, []);

  const clearContext = useCallback(() => {
    setSelection(null);
    setActiveCommand(null);
    setSketchSession(null);
  }, []);

  const replaceActiveDocument = useCallback(
    (transform: (document: NonNullable<typeof activeDocument>) => NonNullable<typeof activeDocument>) => {
      if (!activeDocument) return;
      setProject((current) => {
        if (!current) return current;
        return {
          ...current,
          documents: current.documents.map((document) =>
            document.id === activeDocument.id ? transform(document) : document,
          ),
        };
      });
      setIsDirty(true);
    },
    [activeDocument],
  );

  const addPrimitive = useCallback(
    (
      kind: PrimitiveKind,
      parameters: Record<string, number | string | boolean> = {},
    ) => {
      if (!activeDocument || activeDocument.type !== "part") return;
      const count = activeDocument.features.filter(
        (feature) => feature.parameters.operation === kind,
      ).length;
      const feature = createPrimitiveFeature(kind, count + 1, parameters);
      replaceActiveDocument((document) => ({
        ...document,
        features: [...document.features, feature],
      }));
      setSelection(selectionFromFeature(feature));
      setActiveCommand(null);
    },
    [activeDocument, replaceActiveDocument],
  );

  const focusPlane = useCallback((plane: SketchSession["plane"]) => {
    setView(plane === "front" ? "front" : plane === "top" ? "top" : "right");
    setPlaneFocus((current) => ({
      focused: true,
      revision: current.revision + 1,
      normalSign: 1,
      offsetMm: 0,
      targetXmm: 0,
      targetYmm: 0,
      targetZmm: 0,
    }));
  }, []);

  const changeView = useCallback((orientation: ViewOrientation) => {
    setView(orientation);
    setPlaneFocus((current) => ({
      ...current,
      focused: false,
      revision: current.revision + 1,
    }));
  }, []);

  const startSketch = useCallback(
    (planeFeatureId: string, tool: SketchTool = "rectangle") => {
      if (!activeDocument || activeDocument.type !== "part") return;
      const planeFeature = activeDocument.features.find(
        (feature) => feature.id === planeFeatureId && feature.type === "plane",
      );
      if (!planeFeature) return;
      const plane = String(planeFeature.parameters.plane) as SketchSession["plane"];
      if (!(["front", "top", "right"] as string[]).includes(plane)) return;
      setSketchSession({
        planeFeatureId: planeFeature.id,
        planeName: planeFeature.name,
        plane,
        supportType: "reference-plane",
        offsetMm: Number(planeFeature.parameters.offsetMm) || 0,
        normalSign: 1,
        viewCenterUMm: 0,
        viewCenterVMm: 0,
        referenceEdges: [],
        tool,
        entities: [],
        draftEntity: null,
      });
      setSelection(selectionFromFeature(planeFeature));
      setActiveCommand(null);
      setActiveCategory("sketch");
      setView(plane === "front" ? "front" : plane === "top" ? "top" : "right");
      setPlaneFocus((current) => ({
        focused: true,
        revision: current.revision + 1,
        normalSign: 1,
        offsetMm: Number(planeFeature.parameters.offsetMm) || 0,
        targetXmm:
          plane === "right" ? Number(planeFeature.parameters.offsetMm) || 0 : 0,
        targetYmm:
          plane === "top" ? Number(planeFeature.parameters.offsetMm) || 0 : 0,
        targetZmm:
          plane === "front" ? Number(planeFeature.parameters.offsetMm) || 0 : 0,
      }));
    },
    [activeDocument],
  );

  const focusFace = useCallback(
    (faceSelection: CadSelection) => {
      if (
        !activeDocument ||
        activeDocument.type !== "part" ||
        faceSelection.type !== "face"
      ) return;
      const plane = String(faceSelection.metadata?.plane) as SketchSession["plane"];
      if (!( ["front", "top", "right"] as string[]).includes(plane)) return;
      const offsetMm = Number(faceSelection.metadata?.offsetMm);
      const normalSign: -1 | 1 =
        Number(faceSelection.metadata?.normalSign) < 0 ? -1 : 1;
      const resolvedOffset = Number.isFinite(offsetMm) ? offsetMm : 0;
      const target = faceFocusTarget(faceSelection, plane, resolvedOffset);

      setSelection(faceSelection);
      setActiveCommand(null);
      setView(plane === "front" ? "front" : plane === "top" ? "top" : "right");
      setPlaneFocus((current) => ({
        focused: true,
        revision: current.revision + 1,
        normalSign,
        offsetMm: resolvedOffset,
        ...target,
      }));
    },
    [activeDocument],
  );

  const startSketchOnFace = useCallback(
    (faceSelection: CadSelection, tool: SketchTool = "line") => {
      if (
        !activeDocument ||
        activeDocument.type !== "part" ||
        faceSelection.type !== "face"
      ) return;

      const plane = String(faceSelection.metadata?.plane) as SketchSession["plane"];
      if (!( ["front", "top", "right"] as string[]).includes(plane)) return;
      const sourceFeature = activeDocument.features.find(
        (feature) => feature.id === faceSelection.id && feature.type === "feature",
      );
      if (!sourceFeature) return;
      const offsetMm = Number(faceSelection.metadata?.offsetMm);
      const normalSign: -1 | 1 =
        Number(faceSelection.metadata?.normalSign) < 0 ? -1 : 1;
      const resolvedOffset = Number.isFinite(offsetMm) ? offsetMm : 0;
      const target = faceFocusTarget(faceSelection, plane, resolvedOffset);
      const viewCenter = sketchViewCenter(plane, target);

      setSketchSession({
        planeFeatureId: sourceFeature.id,
        planeName: faceSelection.name,
        plane,
        supportType: "planar-face",
        offsetMm: resolvedOffset,
        normalSign,
        ...viewCenter,
        referenceEdges: faceReferenceEdges(faceSelection),
        tool,
        entities: [],
        draftEntity: null,
      });
      setSelection(faceSelection);
      setActiveCommand(null);
      setActiveCategory("sketch");
      setView(plane === "front" ? "front" : plane === "top" ? "top" : "right");
      setPlaneFocus((current) => ({
        focused: true,
        revision: current.revision + 1,
        normalSign,
        offsetMm: resolvedOffset,
        ...target,
      }));
    },
    [activeDocument],
  );

  const setSketchTool = useCallback((tool: SketchTool) => {
    setSketchSession((current) =>
      current
        ? {
            ...current,
            tool,
            draftEntity: null,
          }
        : current,
    );
  }, []);

  const setSketchDraft = useCallback((draftEntity: SketchProfile | null) => {
    setSketchSession((current) =>
      current ? { ...current, draftEntity } : current,
    );
  }, []);

  const addSketchEntity = useCallback((entity: SketchProfile) => {
    setSketchSession((current) =>
      current
        ? {
            ...current,
            entities: [...current.entities, entity],
            draftEntity: null,
          }
        : current,
    );
  }, []);

  const updateSketchEntity = useCallback(
    (index: number, entity: SketchProfile) => {
      setSketchSession((current) =>
        current && index >= 0 && index < current.entities.length
          ? {
              ...current,
              entities: current.entities.map((existing, entityIndex) =>
                entityIndex === index ? entity : existing,
              ),
              draftEntity: null,
            }
          : current,
      );
    },
    [],
  );

  const removeLastSketchEntity = useCallback(() => {
    setSketchSession((current) =>
      current
        ? {
            ...current,
            entities: current.entities.slice(0, -1),
            draftEntity: null,
          }
        : current,
    );
  }, []);

  const cancelSketch = useCallback(() => {
    setSketchSession(null);
    setActiveCommand(null);
  }, []);

  const finishSketch = useCallback(() => {
    if (!activeDocument || !sketchSession?.entities.length) return;
    const count = activeDocument.features.filter(
      (feature) => feature.type === "sketch",
    ).length;
    const sketch = createSketchFeature(
      sketchSession.planeFeatureId,
      sketchSession.plane,
      sketchSession.entities,
      count + 1,
      {
        type: sketchSession.supportType,
        offsetMm: sketchSession.offsetMm,
        normalSign: sketchSession.normalSign,
      },
    );
    replaceActiveDocument((document) => ({
      ...document,
      features: [...document.features, sketch],
    }));
    setSketchSession(null);
    setSelection(selectionFromFeature(sketch));
    setActiveCommand(null);
  }, [activeDocument, replaceActiveDocument, sketchSession]);

  const extrudeSketch = useCallback(
    (sketchId: string, depthMm: number, reverse = false) => {
      if (!activeDocument || activeDocument.type !== "part") return;
      const sketch = activeDocument.features.find(
        (feature) => feature.id === sketchId && feature.type === "sketch",
      );
      if (!sketch || sketch.parameters.closed !== true) return;
      const count = activeDocument.features.filter(
        (feature) => feature.parameters.operation === "extrude",
      ).length;
      const extrude = createExtrudeFromSketchFeature(
        sketch,
        depthMm,
        count + 1,
        reverse,
      );
      replaceActiveDocument((document) => ({
        ...document,
        features: [...document.features, extrude],
      }));
      setSelection(selectionFromFeature(extrude));
      setActiveCommand(null);
      setView("isometric");
      setPlaneFocus((current) => ({
        ...current,
        focused: false,
        revision: current.revision + 1,
      }));
    },
    [activeDocument, replaceActiveDocument],
  );

  const extrudeCutSketch = useCallback(
    (sketchId: string, depthMm: number, reverse = true) => {
      if (!activeDocument || activeDocument.type !== "part") return;
      const sketch = activeDocument.features.find(
        (feature) => feature.id === sketchId && feature.type === "sketch",
      );
      if (!sketch || sketch.parameters.closed !== true) return;

      const directTarget = activeDocument.features.find(
        (feature) =>
          sketch.parentIds.includes(feature.id) && isModelFeature(feature),
      );
      const modelFeatures = activeDocument.features.filter(isModelFeature);
      const targets = directTarget
        ? [
            directTarget,
            ...modelFeatures.filter((feature) => feature.id !== directTarget.id),
          ]
        : modelFeatures;
      if (!targets.length) return;

      const count = activeDocument.features.filter(
        (feature) => feature.parameters.operation === "extrude-cut",
      ).length;
      const cut = createExtrudeCutFromSketchFeature(
        sketch,
        targets.map((feature) => feature.id),
        depthMm,
        count + 1,
        reverse,
      );
      replaceActiveDocument((document) => ({
        ...document,
        features: [...document.features, cut],
      }));
      setSelection(selectionFromFeature(cut));
      setActiveCommand(null);
      setView("isometric");
      setPlaneFocus((current) => ({
        ...current,
        focused: false,
        revision: current.revision + 1,
      }));
    },
    [activeDocument, replaceActiveDocument],
  );

  const updateFeature = useCallback(
    (featureId: string, update: CadFeatureUpdate) => {
      replaceActiveDocument((document) => ({
        ...document,
        features: document.features.map((feature) =>
          feature.id === featureId
            ? {
                ...feature,
                ...update,
                parameters: update.parameters
                  ? { ...feature.parameters, ...update.parameters }
                  : feature.parameters,
              }
            : feature,
        ),
      }));
    },
    [replaceActiveDocument],
  );

  const deleteFeature = useCallback(
    (featureId: string) => {
      replaceActiveDocument((document) => ({
        ...document,
        features: document.features.filter(
          (feature) =>
            feature.id !== featureId && !feature.parentIds.includes(featureId),
        ),
      }));
      setSelection(null);
    },
    [replaceActiveDocument],
  );

  const insertComponent = useCallback(
    (sourceProjectId: string, sourceDocumentId: string) => {
      if (!activeDocument || activeDocument.type !== "assembly") return;
      const source = partLibrary.find(
        (entry) =>
          entry.projectId === sourceProjectId &&
          entry.document.id === sourceDocumentId,
      );
      if (!source) return;
      const count = activeDocument.features.filter(
        (feature) => feature.type === "component",
      ).length;
      const component = createComponentFeature(
        source.projectId,
        source.document.id,
        source.projectName,
        count + 1,
      );
      replaceActiveDocument((document) => ({
        ...document,
        features: [...document.features, component],
      }));
      setSelection(selectionFromFeature(component));
      setActiveCommand(null);
    },
    [activeDocument, partLibrary, replaceActiveDocument],
  );

  const addDrawingView = useCallback(
    (
      sourceProjectId: string,
      sourceDocumentId: string,
      viewKind: DrawingViewKind,
    ) => {
      if (!activeDocument || activeDocument.type !== "drawing") return;
      const source = partLibrary.find(
        (entry) =>
          entry.projectId === sourceProjectId &&
          entry.document.id === sourceDocumentId,
      );
      if (!source) return;
      const count = activeDocument.features.filter(
        (feature) => feature.type === "annotation",
      ).length;
      const drawingView = createDrawingViewFeature(
        source.projectId,
        source.document.id,
        source.projectName,
        viewKind,
        count + 1,
      );
      replaceActiveDocument((document) => ({
        ...document,
        features: [...document.features, drawingView],
      }));
      setSelection(selectionFromFeature(drawingView));
      setActiveCommand(null);
    },
    [activeDocument, partLibrary, replaceActiveDocument],
  );

  const renameDocument = useCallback((documentId: string, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setProject((current) =>
      current
        ? {
            ...current,
            documents: current.documents.map((document) =>
              document.id === documentId
                ? { ...document, name: trimmedName }
                : document,
            ),
          }
        : current,
    );
    setIsDirty(true);
  }, []);

  const save = useCallback(() => {
    if (!project) return;
    const saved = saveProject(project);
    setProject(saved);
    setLastSavedAt(saved.updatedAt);
    setIsDirty(false);
  }, [project]);

  return {
    project,
    partLibrary,
    loading,
    activeDocument,
    selectedFeature,
    sketchSession,
    planeFocused: planeFocus.focused,
    focusNormalSign: planeFocus.normalSign,
    focusOffsetMm: planeFocus.offsetMm,
    focusTarget: [
      planeFocus.targetXmm,
      planeFocus.targetYmm,
      planeFocus.targetZmm,
    ] as [number, number, number],
    focusRevision: planeFocus.revision,
    activeCategory,
    activeCommand,
    selection,
    view,
    showGrid,
    showPlanes,
    lastSavedAt,
    isDirty,
    canUndo: false,
    canRedo: false,
    setActiveCategory,
    selectCommand,
    selectObject,
    clearContext,
    addPrimitive,
    startSketch,
    focusFace,
    startSketchOnFace,
    setSketchTool,
    setSketchDraft,
    addSketchEntity,
    updateSketchEntity,
    removeLastSketchEntity,
    cancelSketch,
    finishSketch,
    extrudeSketch,
    extrudeCutSketch,
    focusPlane,
    updateFeature,
    deleteFeature,
    insertComponent,
    addDrawingView,
    renameDocument,
    save,
    setView: changeView,
    setShowGrid,
    setShowPlanes,
  };
}
