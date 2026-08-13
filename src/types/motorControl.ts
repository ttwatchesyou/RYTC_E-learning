import type { IconType } from "react-icons";

export type LessonLevel = "Beginner" | "Intermediate" | "Advanced";

export type LessonCategory =
  | "Basics"
  | "Motors"
  | "Components"
  | "Motor Circuits"
  | "Motor Drives"
  | "Protection"
  | "Troubleshooting";

export interface LessonSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface Lesson {
  id: string;
  index: number;
  title: string;
  category: LessonCategory;
  level: LessonLevel;
  description: string;
  duration: string;
  content: LessonSection[];
  previousLesson?: string;
  nextLesson?: string;
}

export interface TerminalDefinition {
  id: string;
  label: string;
  kind: "power" | "control" | "signal";
  position: "top" | "right" | "bottom" | "left";
}

export interface ComponentDefinition {
  id: string;
  type: string;
  name: string;
  shortName: string;
  category: "Supply" | "Protection" | "Control" | "Load" | "Drive" | "Utility";
  terminals: TerminalDefinition[];
  properties: Record<string, string | number | boolean>;
  defaultState: string;
  accent: string;
  icon: IconType;
}

export interface PlacedComponent {
  instanceId: string;
  componentId: string;
  x: number;
  y: number;
  state: string;
}

export interface WirePoint {
  x: number;
  y: number;
}

export interface WireConnection {
  id: string;
  from: { instanceId: string; terminalId: string };
  to: { instanceId: string; terminalId: string };
  color: string;
  points?: WirePoint[];
}

export interface ExpectedConnection {
  fromType: string;
  toType: string;
  label: string;
}

export interface Exercise {
  id: string;
  number: number;
  title: string;
  difficulty: LessonLevel;
  objective: string;
  requiredComponents: string[];
  circuitRequirements: string[];
  expectedConnections: ExpectedConnection[];
  instructions: string[];
}

export interface CircuitValidationResult {
  valid: boolean;
  title: string;
  summary: string;
  passed: string[];
  hints: string[];
}
