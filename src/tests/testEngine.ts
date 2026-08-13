import { PlcEngine } from '../engine/plcEngine';
import { ExtendedLadderRung } from '../types/plc';

const assert = (condition: boolean, message: string): void => { if (!condition) throw new Error(message); };

/** Lightweight runtime checks that can be called from a test runner without browser APIs. */
export const runEngineSmokeTests = (): void => {
  const rung: ExtendedLadderRung = { id: 'r1', wires: [{ id: 'wire', x: 0, width: 400 }], mainElements: [
    { id: 'in', type: 'NO', rawAddress: 'I0.0', x: 84 }, { id: 'out', type: 'COIL', rawAddress: 'Q0.0', x: 252 },
  ] };
  const engine = new PlcEngine('SIEMENS');
  assert(engine.loadProgram([rung], { 'I0.0': false, 'Q0.0': false }).valid, 'NO + Coil should verify');
  assert(engine.download().valid, 'valid program should download');
  assert(engine.run(), 'downloaded valid program should run');
  engine.setInput('I0.0', true); const snapshot = engine.scan(0.1);
  assert(snapshot?.memory['Q0.0'] === true, 'ON input should energize coil');
  engine.setInput('I0.0', false); const offSnapshot = engine.scan(0.1);
  assert(offSnapshot?.memory['Q0.0'] === false, 'OFF input should de-energize coil');
};
