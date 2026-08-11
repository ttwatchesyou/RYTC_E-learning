import dynamic from "next/dynamic";
import Head from "next/head";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import {
  TbArrowBackUp,
  TbArrowForwardUp,
  TbArrowLeft,
  TbBox,
  TbCheck,
  TbChevronDown,
  TbDeviceFloppy,
  TbFile,
  TbGridDots,
  TbLayoutSidebarLeftCollapse,
  TbLayoutSidebarRightCollapse,
  TbLayersDifference,
  TbMaximize,
  TbRotate,
} from "react-icons/tb";
import {
  CadCommand,
  CadSelection,
  FeaturePreview,
  SketchTool,
  ViewOrientation,
} from "@/features/cad/types";
import { useCadWorkspace } from "@/features/cad/hooks/useCadWorkspace";
import CommandBar from "./CommandBar";
import FeatureTree from "./FeatureTree";
import PropertiesPanel from "./PropertiesPanel";
import SketchCanvas from "./SketchCanvas";
import styles from "./CadWorkspace.module.css";

const CadViewport = dynamic(() => import("./CadViewport"), {
  ssr: false,
  loading: () => (
    <div className={styles.viewportLoading}>
      <span />
      <p>Starting 3D renderer…</p>
    </div>
  ),
});

const viewCommands: Record<string, ViewOrientation> = {
  "view-isometric": "isometric",
  "view-front": "front",
  "view-top": "top",
  "view-right": "right",
};

const numericViewShortcuts: Partial<Record<string, ViewOrientation>> = {
  "1": "front",
  "2": "back",
  "3": "left",
  "4": "right",
  "5": "top",
  "6": "bottom",
  "7": "isometric",
};

const numericShortcutLabels = [
  ["1", "Front"],
  ["2", "Back"],
  ["3", "Left"],
  ["4", "Right"],
  ["5", "Top"],
  ["6", "Bottom"],
  ["7", "Isometric"],
  ["8", "Normal to"],
  ["9", "Zoom in"],
  ["0", "Fit all"],
] as const;

const sketchToolsByCommand: Partial<Record<string, SketchTool>> = {
  "sketch-line": "line",
  "sketch-centerline": "centerline",
  "sketch-midpoint-line": "midpoint-line",
  "sketch-rectangle": "rectangle",
  "sketch-center-rectangle": "center-rectangle",
  "sketch-smart-dimension": "smart-dimension",
  "sketch-circle": "circle",
  "sketch-point": "point",
};

const fileExtension = {
  part: "SLDPRT",
  assembly: "SLDASM",
  drawing: "SLDDRW",
};

export default function CadWorkspace({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const cad = useCadWorkspace(projectId);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [featurePreview, setFeaturePreview] = useState<FeaturePreview | null>(null);
  const [zoomFactor, setZoomFactor] = useState(1);
  const [cameraRevision, setCameraRevision] = useState(0);

  const save = useCallback(() => {
    cad.save();
    setSaveFlash(true);
    window.setTimeout(() => setSaveFlash(false), 1800);
  }, [cad]);

  const refreshCamera = useCallback((nextZoomFactor: number) => {
    setZoomFactor(nextZoomFactor);
    setCameraRevision((revision) => revision + 1);
  }, []);

  const fitViewport = useCallback(() => {
    cad.setView(cad.view);
    refreshCamera(1);
  }, [cad, refreshCamera]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        save();
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target?.matches("input, textarea, select, [contenteditable='true']") ||
        cad.sketchSession ||
        event.altKey ||
        event.metaKey
      ) return;
      const digitMatch = event.code.match(/^(?:Digit|Numpad)([0-9])$/);
      const digit = digitMatch?.[1];
      if (!digit) return;

      const orientation = numericViewShortcuts[digit];
      if (orientation) {
        event.preventDefault();
        cad.setView(orientation);
        refreshCamera(1);
        return;
      }
      if (digit === "8") {
        event.preventDefault();
        if (cad.selection?.type === "face") {
          cad.focusFace(cad.selection);
          refreshCamera(0.7);
          return;
        }
        if (cad.selectedFeature?.type === "plane") {
          const plane = String(cad.selectedFeature.parameters.plane);
          if (plane === "front" || plane === "top" || plane === "right") {
            cad.focusPlane(plane);
            refreshCamera(0.75);
            return;
          }
        }
        refreshCamera(0.68);
        return;
      }
      if (digit === "9") {
        event.preventDefault();
        setZoomFactor((current) => Math.max(0.5, current * 0.78));
        setCameraRevision((revision) => revision + 1);
        return;
      }
      if (digit === "0") {
        event.preventDefault();
        fitViewport();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cad, fitViewport, refreshCamera, save]);

  useEffect(() => {
    setFeaturePreview(null);
    refreshCamera(1);
    if (cad.activeDocument?.type === "assembly") cad.setActiveCategory("assembly");
    if (cad.activeDocument?.type === "assembly") cad.setView("isometric");
    if (cad.activeDocument?.type === "drawing") {
      cad.setActiveCategory("drawing");
      cad.setView("top");
    }
    if (cad.activeDocument?.type === "part") {
      cad.setActiveCategory("sketch");
      cad.setView("isometric");
      cad.setShowPlanes(true);
    }
    // Only reset the ribbon when the active document changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cad.activeDocument?.id, refreshCamera]);

  const handleCommand = (command: CadCommand) => {
    setFeaturePreview(null);
    const sketchTool = sketchToolsByCommand[command.id] ?? null;
    if (sketchTool && cad.sketchSession) {
      cad.setSketchTool(sketchTool);
      return;
    }
    if (sketchTool === "smart-dimension") {
      cad.selectCommand(command);
      return;
    }
    if (sketchTool && cad.selection?.type === "face") {
      cad.startSketchOnFace(cad.selection, sketchTool);
      return;
    }
    if (sketchTool && cad.selectedFeature?.type === "plane") {
      cad.startSketch(cad.selectedFeature.id, sketchTool);
      return;
    }
    if (
      (command.id === "features-extrude" ||
        command.id === "features-extrude-cut") &&
      cad.selectedFeature?.type === "sketch"
    ) {
      setFeaturePreview({
        operation:
          command.id === "features-extrude-cut" ? "extrude-cut" : "extrude",
        sketchId: cad.selectedFeature.id,
        depthMm: 20,
        reverse: command.id === "features-extrude-cut",
      });
      cad.selectCommand(command, true);
      return;
    }
    cad.selectCommand(command);
    const orientation = viewCommands[command.id];
    if (orientation) cad.setView(orientation);
    if (command.id === "view-grid") cad.setShowGrid(!cad.showGrid);
    if (command.id === "view-reference-planes") cad.setShowPlanes(!cad.showPlanes);
  };

  const handleSelection = (selection: CadSelection | null) => {
    setFeaturePreview(null);
    cad.selectObject(selection);
  };

  const clearContext = () => {
    setFeaturePreview(null);
    cad.clearContext();
  };

  if (cad.loading) {
    return (
      <div className={styles.workspaceLoading}>
        <span className={styles.brandMark}><span /></span>
        <p>Opening CAD workspace…</p>
      </div>
    );
  }

  if (!cad.project || !cad.activeDocument) {
    return (
      <div className={styles.notFound}>
        <span><TbBox /></span>
        <h1>Project not found</h1>
        <p>The project may have been removed from this browser.</p>
        <button onClick={() => router.push("/3D_Design")}>
          <TbArrowLeft /> Return to Project Hub
        </button>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{cad.project.name} · RYTC CAD</title>
      </Head>
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              aria-label="Back to projects"
              className={styles.backButton}
              onClick={() => router.push("/3D_Design")}
              title="Back to projects"
            >
              <TbArrowLeft />
            </button>
            <span className={styles.brandMark}><span /></span>
            <div className={styles.fileMenuWrap}>
              <button className={styles.fileButton} onClick={() => setFileMenuOpen((open) => !open)}>
                File <TbChevronDown />
              </button>
              {fileMenuOpen && (
                <div className={styles.fileMenu}>
                  <button onClick={() => { save(); setFileMenuOpen(false); }}>
                    <TbDeviceFloppy /> Save file <kbd>Ctrl S</kbd>
                  </button>
                  <button onClick={() => router.push("/3D_Design")}>
                    <TbArrowLeft /> Close workspace
                  </button>
                  <div />
                  <button disabled><TbFile /> Import CAD file <small>Later</small></button>
                  <button disabled><TbFile /> Export CAD file <small>Later</small></button>
                </div>
              )}
            </div>
            <button
              aria-label="Save project"
              className={`${styles.topIconButton} ${saveFlash ? styles.saveSuccess : ""}`}
              onClick={save}
              title="Save project (Ctrl+S)"
            >
              {saveFlash ? <TbCheck /> : <TbDeviceFloppy />}
            </button>
            <span className={styles.topDivider} />
            <button aria-label="Undo" className={styles.topIconButton} disabled={!cad.canUndo} title="No operations to undo">
              <TbArrowBackUp />
            </button>
            <button aria-label="Redo" className={styles.topIconButton} disabled={!cad.canRedo} title="No operations to redo">
              <TbArrowForwardUp />
            </button>
          </div>

          <div className={styles.documentSwitcher}>
            <div className={styles.documentTitle}>
              <span>{cad.activeDocument.type.toUpperCase()} FILE</span>
              <i>/</i>
              <strong>{cad.project.name}{cad.isDirty ? " *" : ""}</strong>
              <small>{fileExtension[cad.activeDocument.type]}</small>
            </div>
          </div>

          <div className={styles.topbarRight}>
            <span className={styles.unitBadge}>{cad.project.unit}</span>
            <span className={styles.topDivider} />
            <button className={styles.viewButton} onClick={() => cad.setView("isometric")} title="Isometric view">
              <TbRotate /> <span>Isometric</span>
            </button>
            <button className={styles.topIconButton} onClick={fitViewport} title="Fit view (0)">
              <TbMaximize />
            </button>
          </div>
        </header>

        <CommandBar
          activeCategory={cad.activeCategory}
          activeCommandId={cad.activeCommand?.id}
          documentType={cad.activeDocument.type}
          onCategoryChange={cad.setActiveCategory}
          onCommandSelect={handleCommand}
        />

        <div
          className={`${styles.workArea} ${!leftPanelOpen ? styles.leftClosed : ""} ${
            !rightPanelOpen ? styles.rightClosed : ""
          }`}
        >
          {leftPanelOpen && (
            <FeatureTree
              activeDocument={cad.activeDocument}
              onPlaneDoubleClick={(plane) => cad.focusPlane(plane)}
              onSelect={handleSelection}
              project={cad.project}
              selectedId={cad.selection?.id}
            />
          )}

          <main className={styles.viewportArea}>
            <CadViewport
              cameraRevision={cameraRevision}
              document={cad.activeDocument}
              featurePreview={featurePreview}
              focusNormalSign={cad.focusNormalSign}
              focusRevision={cad.focusRevision}
              focusTarget={cad.focusTarget}
              onFaceFocus={(selection) => {
                setFeaturePreview(null);
                cad.focusFace(selection);
              }}
              onSelect={handleSelection}
              onPlaneFocus={cad.focusPlane}
              partLibrary={cad.partLibrary}
              planeFocused={cad.planeFocused}
              project={cad.project}
              selectedFace={cad.selection?.type === "face" ? cad.selection : null}
              selectedId={cad.selection?.type === "face" ? undefined : cad.selection?.id}
              showGrid={cad.showGrid}
              showPlanes={cad.showPlanes}
              view={cad.view}
              zoomFactor={zoomFactor}
            />
            {!cad.sketchSession && (
              <div className={styles.numericShortcutGuide}>
                {numericShortcutLabels.map(([key, label]) => (
                  <span key={key}><kbd>{key}</kbd>{label}</span>
                ))}
              </div>
            )}
            {cad.sketchSession && (
              <SketchCanvas
                onCancel={cad.cancelSketch}
                onDraftChange={cad.setSketchDraft}
                onEntityAdd={cad.addSketchEntity}
                onEntityUpdate={cad.updateSketchEntity}
                onFinish={cad.finishSketch}
                onToolChange={cad.setSketchTool}
                onUndo={cad.removeLastSketchEntity}
                session={cad.sketchSession}
                unit={cad.project.unit}
              />
            )}
            <div className={styles.viewportToolbar}>
              <button
                className={cad.showGrid ? styles.viewportToolActive : ""}
                onClick={() => cad.setShowGrid(!cad.showGrid)}
                title="Toggle grid"
              >
                <TbGridDots />
              </button>
              <button
                className={cad.showPlanes ? styles.viewportToolActive : ""}
                onClick={() => cad.setShowPlanes(!cad.showPlanes)}
                title="Toggle reference planes"
              >
                <TbLayersDifference />
              </button>
              <span />
              <button
                className={leftPanelOpen ? styles.viewportToolActive : ""}
                onClick={() => setLeftPanelOpen((open) => !open)}
                title="Toggle feature tree"
              >
                <TbLayoutSidebarLeftCollapse />
              </button>
              <button
                className={rightPanelOpen ? styles.viewportToolActive : ""}
                onClick={() => setRightPanelOpen((open) => !open)}
                title="Toggle properties"
              >
                <TbLayoutSidebarRightCollapse />
              </button>
            </div>
          </main>

          {rightPanelOpen && (
            <PropertiesPanel
              command={cad.activeCommand}
              document={cad.activeDocument}
              partLibrary={cad.partLibrary}
              onAddDrawingView={cad.addDrawingView}
              onClear={clearContext}
              onDeleteFeature={cad.deleteFeature}
              onInsertComponent={cad.insertComponent}
              onExtrudeSketch={(sketchId, depthMm, reverse) => {
                setFeaturePreview(null);
                cad.extrudeSketch(sketchId, depthMm, reverse);
              }}
              onExtrudeCutSketch={(sketchId, depthMm, reverse) => {
                setFeaturePreview(null);
                cad.extrudeCutSketch(sketchId, depthMm, reverse);
              }}
              onFeaturePreviewChange={setFeaturePreview}
              onStartSketch={cad.startSketch}
              onStartSketchOnFace={cad.startSketchOnFace}
              onUpdateFeature={cad.updateFeature}
              selectedFeature={cad.selectedFeature}
              selection={cad.selection}
              unit={cad.project.unit}
            />
          )}
        </div>

        <footer className={styles.statusBar}>
          <div>
            <span className={styles.statusReady} />
            {cad.sketchSession
              ? `Editing ${cad.sketchSession.planeName} — ${cad.sketchSession.tool}`
              : cad.activeCommand
                ? `${cad.activeCommand.label} selected — awaiting input`
                : "Ready"}
          </div>
          <div className={styles.statusRight}>
            {cad.isDirty ? <span>Unsaved changes</span> : cad.lastSavedAt && <span>Saved {new Date(cad.lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
            <span>Selection: {cad.selection ? cad.selection.type : "none"}</span>
            <span>Grid: 10 mm</span>
            <strong>Units: {cad.project.unit}</strong>
          </div>
        </footer>
      </div>
    </>
  );
}
