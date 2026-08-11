import { CadUnit } from "@/features/cad/types";

const MILLIMETERS_PER_UNIT: Record<CadUnit, number> = {
  mm: 1,
  cm: 10,
};

export function toMillimeters(value: number, unit: CadUnit): number {
  return value * MILLIMETERS_PER_UNIT[unit];
}

export function fromMillimeters(valueInMillimeters: number, unit: CadUnit): number {
  return valueInMillimeters / MILLIMETERS_PER_UNIT[unit];
}

export function formatCadLength(valueInMillimeters: number, unit: CadUnit): string {
  const value = fromMillimeters(valueInMillimeters, unit);
  return `${Number.isInteger(value) ? value : value.toFixed(2)} ${unit}`;
}

