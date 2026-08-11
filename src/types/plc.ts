export type PLCBrand = 'OMRON' | 'SIEMENS' | 'MITSUBISHI';

export type ExtendedElementType = 
  | 'NO' | 'NC' | 'DIFU' | 'DIFD' 
  | 'COIL' | 'INV_COIL' | 'TIM' | 'CNT' | 'SET' | 'RSET';

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
  branches?: { id: string; elements: ExtendedLadderElement[]; startX?: number; endX?: number }[];
}
