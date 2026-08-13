import { CounterState } from '../types/plc';
import { risingEdge } from './edgeEngine';

export const updateCounter = (current: CounterState | undefined, down: boolean, input: boolean, preset: number): CounterState => {
  const previous = current || { pv: preset, cv: down ? preset : 0, q: false, previousIn: false };
  const pv = Math.max(1, preset);
  const cv = risingEdge(input, previous.previousIn) ? (down ? Math.max(0, previous.cv - 1) : Math.min(pv, previous.cv + 1)) : previous.cv;
  return { pv, cv, q: down ? cv <= 0 : cv >= pv, previousIn: input };
};
