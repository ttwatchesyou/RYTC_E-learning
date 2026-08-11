import { CadCommand, CommandCategory } from "@/features/cad/types";

type CommandSeed = [label: string, glyph: string, description?: string];

const group = (
  category: CommandCategory,
  groupName: string,
  seeds: CommandSeed[],
): CadCommand[] =>
  seeds.map(([label, glyph, description]) => ({
    id: `${category}-${label.toLowerCase().replaceAll(" ", "-")}`,
    label,
    glyph,
    group: groupName,
    category,
    description: description ?? `${label} command is prepared for a future CAD operation.`,
  }));

export const CAD_COMMANDS: CadCommand[] = [
  ...group("sketch", "Create", [
    ["Line", "╱"], ["Polyline", "⌁"], ["Centerline", "┄"], ["Midpoint Line", "↔"],
    ["Rectangle", "▭"], ["Center Rectangle", "▣"], ["Circle", "○"],
    ["Arc", "◜"], ["Ellipse", "⬭"], ["Polygon", "⬡"],
    ["Slot", "▱"], ["Point", "•"],
  ]),
  ...group("sketch", "Modify", [
    ["Trim", "✂"], ["Extend", "↗"], ["Offset", "⫴"],
    ["Mirror", "◫"], ["Move", "✥"], ["Rotate", "↻"],
    ["Scale", "⤢"], ["Convert Entity", "◇"],
  ]),
  ...group("sketch", "Constraints", [
    ["Horizontal", "━"], ["Vertical", "┃"], ["Coincident", "⊙"],
    ["Parallel", "∥"], ["Perpendicular", "⊥"], ["Tangent", "◯"],
    ["Equal", "="], ["Concentric", "◎"], ["Midpoint", "△"],
    ["Symmetric", "><"], ["Fixed", "▰"],
  ]),
  ...group("sketch", "Dimensions", [
    ["Smart Dimension", "↔"], ["Horizontal Dimension", "↔"],
    ["Vertical Dimension", "↕"], ["Distance", "⌁"], ["Angle", "∠"],
    ["Radius", "R"], ["Diameter", "Ø"],
  ]),
  ...group("features", "Create", [
    ["Extrude", "▤"], ["Extrude Cut", "▥"], ["Revolve", "◒"],
    ["Revolve Cut", "◓"], ["Sweep", "∿"], ["Loft", "⌇"],
    ["Fillet", "◞"], ["Chamfer", "◩"], ["Shell", "□"],
    ["Draft", "◿"], ["Rib", "⌃"], ["Hole", "⊙"],
  ]),
  ...group("features", "Pattern", [
    ["Mirror", "◫"], ["Linear Pattern", "⠿"], ["Circular Pattern", "⟳"],
  ]),
  ...group("features", "Boolean", [
    ["Union", "∪"], ["Subtract", "−"], ["Intersect", "∩"],
  ]),
  ...group("features", "Reference Geometry", [
    ["Plane", "▱"], ["Axis", "│"], ["Point", "+"],
  ]),
  ...group("assembly", "Components", [
    ["Insert Part", "⊞"], ["Move Component", "✥"],
    ["Rotate Component", "↻"], ["Fix Component", "▰"],
    ["Hide Component", "◌"], ["Show Component", "◉"],
  ]),
  ...group("assembly", "Mates", [
    ["Coincident", "⊙"], ["Concentric", "◎"], ["Parallel", "∥"],
    ["Perpendicular", "⊥"], ["Distance", "↔"], ["Angle", "∠"],
  ]),
  ...group("drawing", "Views", [
    ["Front View", "▣"], ["Top View", "▤"], ["Right View", "▥"],
    ["Isometric View", "⬡"], ["Section View", "◫"],
  ]),
  ...group("drawing", "Annotate", [
    ["Dimensions", "↔"], ["Center Lines", "┄"], ["Annotations", "T"],
    ["Title Block", "▦"],
  ]),
  ...group("view", "Display", [
    ["Isometric", "⬡", "Set the camera to an isometric view."],
    ["Front", "▣", "Set the camera to the front view."],
    ["Top", "▤", "Set the camera to the top view."],
    ["Right", "▥", "Set the camera to the right view."],
    ["Grid", "#", "Show or hide the modeling grid."],
    ["Reference Planes", "▱", "Show or hide the reference planes."],
  ]),
];

export const COMMAND_CATEGORIES: Array<{
  id: CommandCategory;
  label: string;
}> = [
  { id: "sketch", label: "Sketch" },
  { id: "features", label: "Features" },
  { id: "assembly", label: "Assembly" },
  { id: "drawing", label: "Drawing" },
  { id: "view", label: "View" },
];

export const commandsForCategory = (category: CommandCategory) =>
  CAD_COMMANDS.filter((command) => command.category === category);
