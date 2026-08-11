import { ExtendedLadderRung } from '../types/plc';

export interface MemoryState {
  [address: string]: boolean;
}

export function getRungWiringIssue(rung: ExtendedLadderRung): string | null {
  if (rung.mainElements.length === 0) return null;
  const elements = [...rung.mainElements].sort((a, b) => (a.x || 0) - (b.x || 0));
  const wires = [...(rung.wires || [])].filter((wire) => wire.orientation !== 'vertical').sort((a, b) => a.x - b.x);
  const tolerance = 4;

  const isRangeWired = (from: number, to: number) => {
    if (to <= from + tolerance) return true;
    let cursor = from;
    for (const wire of wires) {
      const wireEnd = wire.x + wire.width;
      if (wireEnd < cursor - tolerance) continue;
      if (wire.x > cursor + tolerance) break;
      cursor = Math.max(cursor, wireEnd);
      if (cursor >= to - tolerance) return true;
    }
    return false;
  };

  const firstX = elements[0].x || 0;
  if (!isRangeWired(0, firstX)) return `รางซ้าย → ${elements[0].label || elements[0].rawAddress}`;
  for (let index = 1; index < elements.length; index += 1) {
    const previous = elements[index - 1];
    const current = elements[index];
    if (!isRangeWired((previous.x || 0) + 82, current.x || 0)) {
      return `${previous.label || previous.rawAddress} → ${current.label || current.rawAddress}`;
    }
  }
  return null;
}

export function executeScanCycle(
  rungs: ExtendedLadderRung[],
  memory: MemoryState,
  scanCycleSeconds = 0.1
): { updatedMemory: MemoryState; updatedRungs: ExtendedLadderRung[] } {
  const nextMemory = { ...memory };

  const updatedRungs = rungs.map((rung) => {
    let rungPowerState = getRungWiringIssue(rung) === null;
    let branchPowerState = false;
    const updatedBranches = rung.branches?.map((branch) => {
      let branchState = true;
      const elements = branch.elements.map((elem) => {
        const state = elem.type === 'NC' ? !Boolean(nextMemory[elem.rawAddress]) : Boolean(nextMemory[elem.rawAddress]);
        branchState = branchState && state;
        return { ...elem, state };
      });
      branchPowerState = branchPowerState || branchState;
      return { ...branch, elements };
    });

    const mainElements = rung.mainElements.map((elem, elementIndex) => {
      let elemState = false;

      if (elem.type === 'NO') {
        elemState = Boolean(nextMemory[elem.rawAddress]);
        rungPowerState = rungPowerState && (elementIndex === 0 && updatedBranches?.length ? elemState || branchPowerState : elemState);
      } else if (elem.type === 'NC') {
        elemState = !Boolean(nextMemory[elem.rawAddress]);
        rungPowerState = rungPowerState && (elementIndex === 0 && updatedBranches?.length ? elemState || branchPowerState : elemState);
      } else if (elem.type === 'COIL') {
        nextMemory[elem.rawAddress] = rungPowerState;
        elemState = rungPowerState;
      } else if (elem.type === 'INV_COIL') {
        nextMemory[elem.rawAddress] = !rungPowerState;
        elemState = !rungPowerState;
      } else if (elem.type === 'SET') {
        if (rungPowerState) nextMemory[elem.rawAddress] = true;
        elemState = Boolean(nextMemory[elem.rawAddress]);
      } else if (elem.type === 'RSET') {
        if (rungPowerState) nextMemory[elem.rawAddress] = false;
        elemState = Boolean(nextMemory[elem.rawAddress]);
      } else if (elem.type === 'DIFU') {
        elemState = rungPowerState && !Boolean(elem.lastRungPower);
        nextMemory[elem.rawAddress] = elemState;
        return { ...elem, lastRungPower: rungPowerState, state: elemState };
      } else if (elem.type === 'DIFD') {
        elemState = !rungPowerState && Boolean(elem.lastRungPower);
        nextMemory[elem.rawAddress] = elemState;
        return { ...elem, lastRungPower: rungPowerState, state: elemState };
      } else if (elem.type === 'TIM') {
        const preset = Math.max(0.1, elem.presetTime || 5);
        const elapsed = rungPowerState ? Math.min((elem.currentTime || 0) + scanCycleSeconds, preset) : 0;
        elemState = elapsed >= preset;
        nextMemory[elem.rawAddress] = elemState;
        rungPowerState = rungPowerState && elemState;
        return { ...elem, currentTime: elapsed, state: elemState };
      } else if (elem.type === 'CNT') {
        const counterInputPower = rungPowerState;
        const risingEdge = counterInputPower && !Boolean(elem.lastRungPower);
        const count = risingEdge ? Math.min((elem.currentCount || 0) + 1, elem.presetCount || 10) : (elem.currentCount || 0);
        elemState = count >= (elem.presetCount || 10);
        nextMemory[elem.rawAddress] = elemState;
        rungPowerState = counterInputPower && elemState;
        return { ...elem, currentCount: count, lastRungPower: counterInputPower, state: elemState };
      }

      return { ...elem, state: elemState };
    });

    return { ...rung, mainElements, branches: updatedBranches };
  });

  return { updatedMemory: nextMemory, updatedRungs };
}
