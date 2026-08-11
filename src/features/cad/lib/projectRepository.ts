import {
  CadDocument,
  CadDocumentType,
  CadPartReference,
  CadProject,
  CadUnit,
} from "@/features/cad/types";

const STORAGE_KEY = "rytc-cad-projects-v1";

const createId = (prefix: string) => {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

  return `${prefix}-${randomPart}`;
};

const documentLabel: Record<CadDocumentType, string> = {
  part: "Part",
  assembly: "Assembly",
  drawing: "Drawing",
};

export function createCadDocument(
  type: CadDocumentType,
  index = 1,
): CadDocument {
  const id = createId(type);

  return {
    id,
    name: `${documentLabel[type]}${index}`,
    type,
    features:
      type === "part"
        ? [
            {
              id: `${id}-origin`,
              type: "origin",
              name: "Origin",
              parameters: { x: 0, y: 0, z: 0 },
              parentIds: [],
              enabled: true,
              suppressed: false,
            },
            ...["Front Plane", "Top Plane", "Right Plane"].map(
              (name, planeIndex) => ({
                id: `${id}-plane-${planeIndex}`,
                type: "plane" as const,
                name,
                parameters: {
                  offsetMm: 0,
                  plane: name.toLowerCase().replace(" plane", ""),
                },
                parentIds: [`${id}-origin`],
                enabled: true,
                suppressed: false,
              }),
            ),
            {
              id: `${id}-sketches`,
              type: "folder",
              name: "Sketches",
              parameters: {},
              parentIds: [],
              enabled: true,
              suppressed: false,
            },
            {
              id: `${id}-features`,
              type: "folder",
              name: "Features",
              parameters: {},
              parentIds: [],
              enabled: true,
              suppressed: false,
            },
          ]
        : [],
  };
}

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60_000).toISOString();

function createStarterProjects(): CadProject[] {
  const bracket = createCadDocument("part");
  bracket.name = "Mounting Bracket";
  bracket.features.push(
    {
      id: `${bracket.id}-base-extrude`,
      type: "feature",
      name: "Base Extrude",
      parameters: {
        operation: "box",
        widthMm: 43,
        heightMm: 4,
        depthMm: 30,
        xMm: 0,
        yMm: 2,
        zMm: 0,
        color: "#7897b8",
      },
      parentIds: [`${bracket.id}-sketches`],
      enabled: true,
      suppressed: false,
    },
    {
      id: `${bracket.id}-upright-extrude`,
      type: "feature",
      name: "Upright Extrude",
      parameters: {
        operation: "box",
        widthMm: 4,
        heightMm: 25,
        depthMm: 30,
        xMm: -19.5,
        yMm: 16.5,
        zMm: 0,
        color: "#7897b8",
      },
      parentIds: [`${bracket.id}-base-extrude`],
      enabled: true,
      suppressed: false,
    },
  );

  const gripperAssembly = createCadDocument("assembly");
  gripperAssembly.name = "Gripper Assembly";
  gripperAssembly.features.push({
    id: `${gripperAssembly.id}-component-1`,
    type: "component",
    name: "Mounting Bracket<1>",
    parameters: {
      sourceDocumentId: bracket.id,
      xMm: 0,
      yMm: 0,
      zMm: 0,
      rotationXDeg: 0,
      rotationYDeg: 0,
      rotationZDeg: 0,
      fixed: true,
      visible: true,
    },
    parentIds: [bracket.id],
    enabled: true,
    suppressed: false,
  });
  const jaw = createCadDocument("part", 1);
  jaw.name = "Jaw Plate";
  const robotDrawing = createCadDocument("drawing");
  robotDrawing.name = "Robot Base Sheet";

  return [
    {
      id: "robot-arm-project",
      name: "Robot Arm Mk. II",
      unit: "mm",
      documents: [bracket, gripperAssembly],
      activeDocumentId: bracket.id,
      createdAt: minutesAgo(24 * 60 * 8),
      updatedAt: minutesAgo(18),
      accent: "#3b82f6",
    },
    {
      id: "pneumatic-gripper",
      name: "Pneumatic Gripper",
      unit: "mm",
      documents: [jaw],
      activeDocumentId: jaw.id,
      createdAt: minutesAgo(24 * 60 * 18),
      updatedAt: minutesAgo(24 * 60),
      accent: "#f59e0b",
    },
    {
      id: "mobile-robot-chassis",
      name: "Mobile Robot Chassis",
      unit: "cm",
      documents: [robotDrawing],
      activeDocumentId: robotDrawing.id,
      createdAt: minutesAgo(24 * 60 * 32),
      updatedAt: minutesAgo(24 * 60 * 3),
      accent: "#10b981",
    },
  ];
}

const normalizeProjects = (projects: CadProject[]): CadProject[] =>
  projects.map((project) => ({
    ...project,
    documents: project.documents.map((document) => ({
      ...document,
      features: document.features.map((feature) => {
        if (feature.type === "plane" && !feature.parameters.plane) {
          return {
            ...feature,
            parameters: {
              ...feature.parameters,
              plane: feature.name.toLowerCase().replace(" plane", ""),
            },
          };
        }
        if (feature.type === "feature" && !feature.parameters.operation) {
          return {
            ...feature,
            parameters: {
              ...feature.parameters,
              operation: "box",
              widthMm: 43,
              heightMm: Number(feature.parameters.depthMm) || 12,
              depthMm: 30,
              xMm: 0,
              yMm: (Number(feature.parameters.depthMm) || 12) / 2,
              zMm: 0,
              color: "#7897b8",
            },
          };
        }
        return feature;
      }),
    })),
  }));

/**
 * Older builds stored multiple CAD documents inside one project. SolidWorks-like
 * files are standalone, so preserve every document while splitting that legacy
 * container into one project per file and repair component references.
 */
const splitProjectsIntoCadFiles = (projects: CadProject[]): CadProject[] => {
  const sourceProjectByDocument = new Map<string, string>();
  projects.forEach((project) => {
    project.documents.forEach((document, index) => {
      sourceProjectByDocument.set(
        document.id,
        index === 0
          ? project.id
          : `${project.id}--${document.type}-${document.id}`,
      );
    });
  });

  return projects.flatMap((project) =>
    project.documents.map((document, index) => {
      const projectId = sourceProjectByDocument.get(document.id) ?? project.id;
      const repairedDocument: CadDocument = {
        ...document,
        features: document.features.map((feature) => {
          if (feature.type !== "component" && feature.type !== "annotation") {
            return feature;
          }
          const sourceDocumentId = String(
            feature.parameters.sourceDocumentId ?? "",
          );
          const sourceProjectId = sourceProjectByDocument.get(sourceDocumentId);
          return sourceProjectId
            ? {
                ...feature,
                parameters: {
                  ...feature.parameters,
                  sourceProjectId,
                },
              }
            : feature;
        }),
      };
      return {
        ...project,
        id: projectId,
        name: project.documents.length > 1 ? document.name : project.name,
        documents: [repairedDocument],
        activeDocumentId: repairedDocument.id,
        // Keep split files ordered and make their timestamps deterministic.
        updatedAt: project.updatedAt,
        createdAt: project.createdAt,
      };
    }),
  );
};

export function loadProjects(): CadProject[] {
  if (typeof window === "undefined") return [];

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const projects = JSON.parse(stored) as CadProject[];
      const cadFiles = splitProjectsIntoCadFiles(normalizeProjects(projects));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cadFiles));
      return cadFiles;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  const starterFiles = splitProjectsIntoCadFiles(
    normalizeProjects(createStarterProjects()),
  );
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(starterFiles));
  return starterFiles;
}

export function loadPartLibrary(): CadPartReference[] {
  return loadProjects().flatMap((project) =>
    project.documents
      .filter((document) => document.type === "part")
      .map((document) => ({
        projectId: project.id,
        projectName: project.name,
        document,
      })),
  );
}

export function loadProject(projectId: string): CadProject | undefined {
  return loadProjects().find((project) => project.id === projectId);
}

export function saveProject(project: CadProject): CadProject {
  const projects = loadProjects();
  const updatedProject = { ...project, updatedAt: new Date().toISOString() };
  const existingIndex = projects.findIndex((item) => item.id === project.id);

  if (existingIndex >= 0) projects[existingIndex] = updatedProject;
  else projects.unshift(updatedProject);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  return updatedProject;
}

export function createProject(input: {
  name: string;
  initialDocumentType: CadDocumentType;
  unit: CadUnit;
}): CadProject {
  const initialDocument = createCadDocument(input.initialDocumentType);
  initialDocument.name = input.name.trim();
  const timestamp = new Date().toISOString();
  const accents = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"];
  const project: CadProject = {
    id: createId("project"),
    name: input.name.trim(),
    unit: input.unit,
    documents: [initialDocument],
    activeDocumentId: initialDocument.id,
    createdAt: timestamp,
    updatedAt: timestamp,
    accent: accents[Math.floor(Math.random() * accents.length)],
  };

  saveProject(project);
  return project;
}
