import { ExtendedLadderElement, ExtendedLadderRung, PlcMemory } from '../types/plc';
import { updateCounter } from './counterEngine';
import { readBit, writeBit } from './memory';
import { TimerKind, updateTimer } from './timerEngine';

const contactPower = (element: ExtendedLadderElement, memory: PlcMemory): boolean => element.type === 'NC' ? !readBit(memory, element.rawAddress) : readBit(memory, element.rawAddress);
const outputTypes = ['COIL', 'INV_COIL', 'SET', 'RSET', 'TIM', 'CNT', 'TON', 'TOF', 'TP', 'CTU', 'CTD', 'DIFU', 'DIFD'];

export const executeScan = (rungs: ExtendedLadderRung[], memory: PlcMemory, deltaSeconds: number): ExtendedLadderRung[] => rungs.map((rung) => {
  let power = true;
  let branchPower = false;
  const branches = rung.branches?.map((branch) => {
    let branchState = true;
    const elements = branch.elements.map((element) => {
      if (element.type === 'NO' || element.type === 'NC') {
        const state = contactPower(element, memory); branchState = branchState && state; return { ...element, state };
      }
      if (element.type === 'COIL' || element.type === 'INV_COIL') {
        const state = element.type === 'INV_COIL' ? !branchState : branchState;
        writeBit(memory, element.rawAddress, state); return { ...element, state };
      }
      if (element.type === 'SET') { if (branchState) writeBit(memory, element.rawAddress, true); return { ...element, state: readBit(memory, element.rawAddress) }; }
      if (element.type === 'RSET') { if (branchState) writeBit(memory, element.rawAddress, false); return { ...element, state: readBit(memory, element.rawAddress) }; }
      return { ...element, state: branchState };
    });
    branchPower = branchPower || branchState;
    return { ...branch, elements };
  });
  const mainElements = rung.mainElements.map((element, index) => {
    let state = false;
    if (element.type === 'NO' || element.type === 'NC') {
      state = contactPower(element, memory);
      power = power && (index === 0 && branches?.length ? state || branchPower : state);
    } else if (element.type === 'COIL' || element.type === 'INV_COIL') {
      state = element.type === 'INV_COIL' ? !power : power; writeBit(memory, element.rawAddress, state);
    } else if (element.type === 'SET') {
      if (power) writeBit(memory, element.rawAddress, true); state = readBit(memory, element.rawAddress);
    } else if (element.type === 'RSET') {
      if (power) writeBit(memory, element.rawAddress, false); state = readBit(memory, element.rawAddress);
    } else if (element.type === 'DIFU' || element.type === 'DIFD') {
      state = element.type === 'DIFU' ? power && !Boolean(element.lastRungPower) : !power && Boolean(element.lastRungPower);
      writeBit(memory, element.rawAddress, state); return { ...element, state, lastRungPower: power };
    } else if (['TIM', 'TON', 'TOF', 'TP'].includes(element.type)) {
      const kind: TimerKind = element.type === 'TIM' ? 'TON' : element.type as TimerKind;
      const timer = updateTimer(memory.timers[element.rawAddress], kind, power, element.presetTime || 5, deltaSeconds);
      memory.timers[element.rawAddress] = timer; writeBit(memory, element.rawAddress, timer.q); state = timer.q;
      return { ...element, state, currentTime: timer.et };
    } else if (['CNT', 'CTU', 'CTD'].includes(element.type)) {
      const counter = updateCounter(memory.counters[element.rawAddress], element.type === 'CTD', power, element.presetCount || 10);
      memory.counters[element.rawAddress] = counter; writeBit(memory, element.rawAddress, counter.q); state = counter.q;
      return { ...element, state, currentCount: counter.cv, lastRungPower: power };
    }
    return { ...element, state };
  });
  return { ...rung, mainElements, branches };
});

export { outputTypes };
