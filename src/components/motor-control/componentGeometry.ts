import type { ComponentDefinition, TerminalDefinition } from "@/types/motorControl";

export const componentSize = { width: 124, height: 88 } as const;
export const componentVisualBounds = { left: 8, top: 3, right: 116, bottom: 68 } as const;

export const terminalOffset = (
  definition: ComponentDefinition,
  terminal: TerminalDefinition,
) => {
  const sameSide = definition.terminals.filter((item) => item.position === terminal.position);
  const index = sameSide.findIndex((item) => item.id === terminal.id);
  const ratio = (index + 1) / (sameSide.length + 1);
  const visualWidth = componentVisualBounds.right - componentVisualBounds.left;
  const visualHeight = componentVisualBounds.bottom - componentVisualBounds.top;

  if (terminal.position === "top") {
    return { x: componentVisualBounds.left + visualWidth * ratio, y: componentVisualBounds.top };
  }
  if (terminal.position === "bottom") {
    return { x: componentVisualBounds.left + visualWidth * ratio, y: componentVisualBounds.bottom };
  }
  if (terminal.position === "left") {
    return { x: componentVisualBounds.left, y: componentVisualBounds.top + visualHeight * ratio };
  }
  return { x: componentVisualBounds.right, y: componentVisualBounds.top + visualHeight * ratio };
};
