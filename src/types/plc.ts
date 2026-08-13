export type PLCBrand = 'OMRON' | 'SIEMENS' | 'MITSUBISHI' | 'ALLEN_BRADLEY' | 'SCHNEIDER' | 'DELTA' | 'PANASONIC' | 'IEC';
export type PlcMode = 'PROGRAM' | 'STOP' | 'RUN' | 'FAULT';
export type DiagnosticLevel = 'INFO' | 'WARNING' | 'ERROR' | 'FAULT';

export type ExtendedElementType = 
  | 'NO' | 'NC' | 'DIFU' | 'DIFD' 
  | 'COIL' | 'INV_COIL' | 'TIM' | 'CNT' | 'SET' | 'RSET'
  | 'TON' | 'TOF' | 'TP' | 'CTU' | 'CTD';

export interface ExtendedLadderElement {
  id: string;
  type: ExtendedElementType;
  rawAddress: string;
  label?: string;
  presetTime?: number;
  currentTime?: number;
  presetCount?: number;
  currentCount?: number;
  state?: boolean;
  lastRungPower?: boolean;
  x?: number;
}

export interface LadderWireSegment {
  id: string;
  x: number;
  width: number;
  orientation?: 'horizontal' | 'vertical';
  y?: number;
  height?: number;
}

export interface ExtendedLadderRung {
  id: string;
  mainElements: ExtendedLadderElement[];
  wires?: LadderWireSegment[];
  branches?: { id: string; elements: ExtendedLadderElement[]; startX?: number; endX?: number; row?: number }[];
}

export interface TimerState { in: boolean; pt: number; et: number; q: boolean; previousIn: boolean; }
export interface CounterState { pv: number; cv: number; q: boolean; previousIn: boolean; }
export interface PlcMemory {
  inputs: Record<string, boolean>;
  outputs: Record<string, boolean>;
  bits: Record<string, boolean>;
  words: Record<string, number>;
  timers: Record<string, TimerState>;
  counters: Record<string, CounterState>;
  retentive: Record<string, boolean | number>;
  temporary: Record<string, boolean | number>;
}

export interface PlcDiagnostic { level: DiagnosticLevel; message: string; rung?: number; elementId?: string; suggestion?: string; timestamp: number; }
export interface PlcSnapshot { mode: PlcMode; scanCount: number; scanTimeMs: number; memory: Record<string, boolean>; rungs: ExtendedLadderRung[]; diagnostics: PlcDiagnostic[]; }
export interface VerificationResult { valid: boolean; diagnostics: PlcDiagnostic[]; }
export interface VendorProfile {
  id: PLCBrand;
  name: string;
  software: string;
  inputPrefix: string;
  outputPrefix: string;
  timerPrefix: string;
  counterPrefix: string;
  getInputAddress(index: number): string;
  getOutputAddress(index: number): string;
  getTimerAddress(index: number): string;
  getCounterAddress(index: number): string;
}
