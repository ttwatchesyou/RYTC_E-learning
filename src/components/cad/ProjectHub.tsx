// src/components/cad/ProjectHub.tsx
import Head from "next/head";
import { useRouter } from "next/router";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import {
  TbAssembly,
  TbBox,
  TbChevronRight,
  TbClock,
  TbFileText,
  TbFolder,
  TbLayoutGrid,
  TbPlus,
  TbSearch,
  TbSettings,
  TbX,
} from "react-icons/tb";
import {
  CadDocumentType,
  CadProject,
  CadUnit,
} from "@/features/cad/types";
import {
  createProject,
  loadProjects,
} from "@/features/cad/lib/projectRepository";
import styles from "./ProjectHub.module.css";
import { CloseOutlined, RightOutlined } from "@ant-design/icons";
import React from "react";

const documentMeta = {
  part: { label: "Part", description: "Create an individual 3D workpiece file", Icon: TbBox },
  assembly: { label: "Assembly", description: "Open saved Part files and assemble them", Icon: TbAssembly },
  drawing: { label: "Drawing", description: "Create a 2D sheet from a saved Part file", Icon: TbFileText },
};

const fileExtension = {
  part: "SLDPRT",
  assembly: "SLDASM",
  drawing: "SLDDRW",
};

const formatUpdatedAt = (dateValue: string) => {
  const elapsed = Date.now() - new Date(dateValue).getTime();
  const minutes = Math.max(1, Math.floor(elapsed / 60_000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateValue));
};

function ProjectPreview({ project }: { project: CadProject }) {
  const primaryType = project.documents[0]?.type ?? "part";

  return (
    <div
      className={`${styles.preview} ${styles[`preview_${primaryType}`]}`}
      style={{ "--project-accent": project.accent } as React.CSSProperties}
    >
      <div className={styles.previewGrid} />
      {primaryType === "drawing" ? (
        <div className={styles.drawingSheet}>
          <div className={styles.drawingShape} />
          <span />
        </div>
      ) : (
        <div className={styles.modelShape}>
          <span className={styles.modelTop} />
          <span className={styles.modelFront} />
          <span className={styles.modelSide} />
          {primaryType === "assembly" && (
            <span className={styles.modelAttachment} />
          )}
        </div>
      )}
      <span className={styles.previewAxisX}>X</span>
      <span className={styles.previewAxisY}>Y</span>
    </div>
  );
}

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (project: CadProject) => void;
}

function CreateProjectDialog({
  open,
  onClose,
  onCreated,
}: CreateProjectDialogProps) {
  const [name, setName] = useState("");
  const [documentType, setDocumentType] =
    useState<CadDocumentType>("part");
  const [unit, setUnit] = useState<CadUnit>("mm");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Enter a file name to continue.");
      return;
    }

    onCreated(
      createProject({
        name,
        initialDocumentType: documentType,
        unit,
      }),
    );
  };

  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="create-project-title"
        aria-modal="true"
        className={styles.modal}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className={styles.modalHeader}>
          <div>
            <span className={styles.eyebrow}>NEW CAD FILE</span>
            <h2 id="create-project-title">Create CAD file</h2>
            <p>Part, Assembly, and Drawing are stored as separate files.</p>
          </div>
          <button aria-label="Close dialog" className={styles.iconButton} onClick={onClose}>
            <CloseOutlined />
          </button>
        </div>

        <form onSubmit={submit}>
          <label className={styles.fieldLabel} htmlFor="project-name">
            File name
          </label>
          <input
            autoFocus
            className={`${styles.textInput} ${error ? styles.inputError : ""}`}
            id="project-name"
            maxLength={80}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            placeholder="e.g. Delta Robot End Effector"
            value={name}
          />
          {error && <span className={styles.errorText}>{error}</span>}

          <fieldset className={styles.fieldset}>
            <legend>File type</legend>
            <div className={styles.documentOptions}>
              {(Object.keys(documentMeta) as CadDocumentType[]).map((type) => {
                const { Icon, label, description } = documentMeta[type];
                return (
                  <label
                    className={`${styles.documentOption} ${
                      documentType === type ? styles.documentOptionActive : ""
                    }`}
                    key={type}
                  >
                    <input
                      checked={documentType === type}
                      name="documentType"
                      onChange={() => setDocumentType(type)}
                      type="radio"
                    />
                  {React.createElement(Icon as any)}
                    <span>{label}</span>
                    <small>{description}</small>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend>Display unit</legend>
            <div className={styles.unitOptions}>
              {(["mm", "cm"] as CadUnit[]).map((option) => (
                <label
                  className={`${styles.unitOption} ${
                    unit === option ? styles.unitOptionActive : ""
                  }`}
                  key={option}
                >
                  <input
                    checked={unit === option}
                    name="unit"
                    onChange={() => setUnit(option)}
                    type="radio"
                  />
                  <strong>{option}</strong>
                  <span>{option === "mm" ? "Millimeters" : "Centimeters"}</span>
                </label>
              ))}
            </div>
            <p className={styles.unitNote}>Geometry is always stored internally in millimeters.</p>
          </fieldset>

          <div className={styles.modalActions}>
            <button className={styles.secondaryButton} onClick={onClose} type="button">
              Cancel
            </button>
            <button className={styles.primaryButton} type="submit">
             Create &amp; open file <RightOutlined />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function ProjectHub() {
  const router = useRouter();
  const [projects, setProjects] = useState<CadProject[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | CadDocumentType>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProjects(loadProjects());
    setReady(true);
  }, []);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return projects.filter((project) => {
      const matchesType =
        typeFilter === "all" || project.documents[0]?.type === typeFilter;
      const matchesQuery =
        !normalizedQuery ||
        project.name.toLocaleLowerCase().includes(normalizedQuery);
      return matchesType && matchesQuery;
    });
  }, [projects, query, typeFilter]);

  const openProject = (projectId: string) =>
    router.push(`/3D_Design/project/${projectId}`);

  const handleCardKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    projectId: string,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProject(projectId);
    }
  };

  return (
    <>
      <Head>
        <title>CAD Files · RYTC CAD</title>
        <meta
          content="Internal browser CAD workspace for the Mechatronics and Robotics department"
          name="description"
        />
      </Head>
      <div className={styles.page}>
        <header className={styles.topbar}>
          <button className={styles.brand} onClick={() => router.push("/3D_Design")}>
            <span className={styles.brandMark}>
              <span />
            </span>
            <span>
              <strong>RYTC CAD</strong>
              <small>ENGINEERING WORKSPACE</small>
            </span>
          </button>
          <div className={styles.headerRight}>
            <span className={styles.department}>Mechatronics &amp; Robotics</span>
            <button aria-label="Application settings" className={styles.iconButton}>
              {React.createElement(TbSettings as any)}
            </button>
            <span className={styles.avatar}>EN</span>
          </div>
        </header>

        <div className={styles.shell}>
          <aside className={styles.sidebar}>
            <button className={`${styles.navItem} ${typeFilter === "all" ? styles.navItemActive : ""}`} onClick={() => setTypeFilter("all")}>
              {React.createElement(TbLayoutGrid as any)} <span>All CAD files</span>
              <strong>{projects.length}</strong>
            </button>
            {(["part", "assembly", "drawing"] as CadDocumentType[]).map((type) => {
              const { Icon, label } = documentMeta[type];
              return (
                <button className={`${styles.navItem} ${typeFilter === type ? styles.navItemActive : ""}`} key={type} onClick={() => setTypeFilter(type)}>
                  {React.createElement(Icon as any)} <span>{label} files</span>
                  <strong>{projects.filter((project) => project.documents[0]?.type === type).length}</strong>
                </button>
              );
            })}
            <div className={styles.sidebarDivider} />
            <p className={styles.sidebarLabel}>RESOURCES</p>
            <button className={styles.navItem}>
              {React.createElement(TbFolder as any)} <span>Templates</span>
            </button>
            <div className={styles.storageCard}>
              <span className={styles.storageIcon}>{React.createElement(TbBox as any)}</span>
              <strong>Local workspace</strong>
              <p>Standalone CAD files are saved in this browser during foundation development.</p>
              <div><span /></div>
              <small>{projects.length} CAD file{projects.length === 1 ? "" : "s"} stored</small>
            </div>
          </aside>

          <main className={styles.main}>
            <div className={styles.heroRow}>
              <div>
                <span className={styles.eyebrow}>CAD FILE HUB</span>
                <h1>Engineering files</h1>
                <p>Create Parts first, open them in Assemblies, then prepare Drawings.</p>
              </div>
              <button className={styles.primaryButton} onClick={() => setCreateOpen(true)}>
                {React.createElement(TbPlus as any)} New CAD file
              </button>
            </div>

            <div className={styles.controls}>
              <label className={styles.searchBox}>
                {React.createElement(TbSearch as any)}
                <input
                  aria-label="Search CAD files"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search CAD files..."
                  value={query}
                />
                {query && (
                  <button aria-label="Clear search" onClick={() => setQuery("")}>
                    <CloseOutlined />
                  </button>
                )}
              </label>
              <span className={styles.resultCount}>
                {filteredProjects.length} of {projects.length} CAD files
              </span>
            </div>

            <section aria-labelledby="recent-projects-title">
              <div className={styles.sectionTitle}>
                <h2 id="recent-projects-title">Recent CAD files</h2>
                <span>Last updated</span>
              </div>

              {!ready ? (
                <div className={styles.loadingGrid}>
                  {[0, 1, 2].map((item) => <span key={item} />)}
                </div>
              ) : filteredProjects.length ? (
                <div className={styles.projectGrid}>
                  <button
                    className={styles.newProjectCard}
                    onClick={() => setCreateOpen(true)}
                  >
                    <span>{React.createElement(TbPlus as any)}</span>
                    <strong>Create new CAD file</strong>
                    <small>Standalone Part, Assembly, or Drawing</small>
                  </button>

                  {filteredProjects.map((project) => {
                    const initialType = project.documents[0]?.type ?? "part";
                    const { Icon, label } = documentMeta[initialType];
                    return (
                      <article
                        className={styles.projectCard}
                        key={project.id}
                        onClick={() => openProject(project.id)}
                        onKeyDown={(event) => handleCardKeyDown(event, project.id)}
                        role="button"
                        tabIndex={0}
                      >
                        <ProjectPreview project={project} />
                        <div className={styles.projectInfo}>
                          <div className={styles.projectNameRow}>
                            <h3>{project.name}</h3>
                            <RightOutlined />
                          </div>
                          <div className={styles.projectMeta}>
                            <span>{React.createElement(Icon as any)} {label}</span>
                            <span>{fileExtension[initialType]}</span>
                            <span>{project.unit}</span>
                          </div>
                          <div className={styles.updatedAt}>
                            {React.createElement(TbClock as any)} Updated {formatUpdatedAt(project.updatedAt)}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  {React.createElement(TbSearch as any)}
                  <h3>No CAD files match “{query}”</h3>
                  <p>Try another file name, file type, or clear the search.</p>
                  <button className={styles.secondaryButton} onClick={() => setQuery("")}>
                    Clear search
                  </button>
                </div>
              )}
            </section>
          </main>
        </div>
        <CreateProjectDialog
          onClose={() => setCreateOpen(false)}
          onCreated={(project) => openProject(project.id)}
          open={createOpen}
        />
      </div>
    </>
  );
}