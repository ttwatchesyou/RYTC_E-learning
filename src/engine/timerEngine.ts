import { TimerState } from '../types/plc';
import { risingEdge } from './edgeEngine';

export type TimerKind = 'TON' | 'TOF' | 'TP';
export const updateTimer = (current: TimerState | undefined, kind: TimerKind, input: boolean, presetSeconds: number, deltaSeconds: number): TimerState => {
  const previous = current || { in: false, pt: presetSeconds, et: 0, q: false, previousIn: false };
  const pt = Math.max(0.001, presetSeconds);
  if (kind === 'TON') return input ? { in: true, pt, et: Math.min(pt, previous.et + deltaSeconds), q: previous.et + deltaSeconds >= pt, previousIn: input } : { in: false, pt, et: 0, q: false, previousIn: input };
  if (kind === 'TOF') return input ? { in: true, pt, et: 0, q: true, previousIn: input } : { in: false, pt, et: Math.min(pt, previous.et + deltaSeconds), q: previous.et + deltaSeconds < pt, previousIn: input };
  const active = previous.q || risingEdge(input, previous.previousIn);
  const et = active ? Math.min(pt, previous.et + deltaSeconds) : 0;
  return { in: input, pt, et, q: active && et < pt, previousIn: input };
};
