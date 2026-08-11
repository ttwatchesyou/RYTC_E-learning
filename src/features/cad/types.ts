export type CadUnit = "mm" | "cm";

export type CadDocumentType = "part" | "assembly" | "drawing";

export type CadFeatureType =
  | "origin"
  | "plane"
  | "folder"
  | "sketch"
  | "feature"
  | "body"
  | "component"
  | "annotation";

export type CadSelectionType =
  | "document"
  | "body"
  | "feature"
  | "sketch"
  | "sketch-entity"
  | "vertex"
  | "edge"
  | "face"
  | "assembly-component"
  | "reference";

export interface CadFeature {
  id: string;
  type: CadFeatureType;
  name: string;
  parameters: Record<string, number | string | boolean>;
  /** Sketch geometry is separate so a single Sketch can own multiple entities. */
  sketchEntities?: SketchProfile[];
  parentIds: string[];
  enabled: boolean;
  suppressed: boolean;
}

export interface CadDocument {
  id: string;
  name: string;
  type: CadDocumentType;
  features: CadFeature[];
}

export interface CadProject {
  id: string;
  name: string;
  unit: CadUnit;
  documents: CadDocument[];
  activeDocumentId: string;
  createdAt: string;
  updatedAt: string;
  accent: string;
}

/** A saved standalone Part file that can be referenced by an Assembly or Drawing. */
export interface CadPartReference {
  projectId: string;
  projectName: string;
  document: CadDocument;
}

export interface CadSelection {
  id: string;
  name: string;
  type: CadSelectionType;
  metadata?: Record<string, string | number | boolean>;
}

export type CommandCategory =
  | "sketch"
  | "features"
  | "assembly"
  | "drawing"
  | "view";

export interface CadCommand {
  id: string;
  label: string;
  glyph: string;
  group: string;
  category: CommandCategory;
  description: string;
}

export type ViewOrientation =
  | "isometric"
  | "front"
  | "back"
  | "left"
  | "right"
  | "top"
  | "bottom";

export type PrimitiveKind = "box" | "cylinder";

export interface FeaturePreview {
  operation: "extrude" | "extrude-cut";
  sketchId: string;
  depthMm: number;
  reverse: boolean;
}

export type DrawingViewKind = "front" | "top" | "right" | "isometric";

export type SketchPlane = "front" | "top" | "right";

export type SketchTool =
  | "line"
  | "centerline"
  | "midpoint-line"
  | "rectangle"
  | "center-rectangle"
  | "smart-dimension"
  | "circle"
  | "point";

export interface SketchReferenceEdge {
  startUMm: number;
  startVMm: number;
  endUMm: number;
  endVMm: number;
}

export type SketchProfile =
  | {
      kind: "line";
      startUMm: number;
      startVMm: number;
      endUMm: number;
      endVMm: number;
      constraint?: "horizontal" | "vertical" | "diagonal45";
      creationMode?: "midpoint";
    }
  | {
      kind: "centerline";
      startUMm: number;
      startVMm: number;
      endUMm: number;
      endVMm: number;
      constraint?: "horizontal" | "vertical" | "diagonal45";
    }
  | {
      kind: "arc";
      startUMm: number;
      startVMm: number;
      endUMm: number;
      endVMm: number;
      centerUMm: number;
      centerVMm: number;
      radiusMm: number;
      startAngleDeg: number;
      endAngleDeg: number;
      clockwise: boolean;
    }
  | {
      kind: "rectangle";
      centerUMm: number;
      centerVMm: number;
      widthMm: number;
      heightMm: number;
    }
  | {
      kind: "circle";
      centerUMm: number;
      centerVMm: number;
      radiusMm: number;
    }
  | {
      kind: "point";
      centerUMm: number;
      centerVMm: number;
    };

export interface SketchSession {
  planeFeatureId: string;
  planeName: string;
  plane: SketchPlane;
  supportType: "reference-plane" | "planar-face";
  offsetMm: number;
  normalSign: -1 | 1;
  viewCenterUMm: number;
  viewCenterVMm: number;
  referenceEdges: SketchReferenceEdge[];
  tool: SketchTool;
  entities: SketchProfile[];
  draftEntity: SketchProfile | null;
}

export interface CadFeatureUpdate {
  name?: string;
  parameters?: Record<string, number | string | boolean>;
  sketchEntities?: SketchProfile[];
  enabled?: boolean;
  suppressed?: boolean;
}
