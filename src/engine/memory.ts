import { PlcMemory } from '../types/plc';

export const createMemory = (): PlcMemory => ({ inputs: {}, outputs: {}, bits: {}, words: {}, timers: {}, counters: {}, retentive: {}, temporary: {} });
export const readBit = (memory: PlcMemory, address: string): boolean => Boolean(memory.inputs[address] ?? memory.outputs[address] ?? memory.bits[address]);
export const writeBit = (memory: PlcMemory, address: string, value: boolean): void => {
  if (/^(I|X|%I|0\.)/.test(address) || address.includes(':I.Data.')) memory.inputs[address] = value;
  else if (/^(Q|Y|%Q|100\.)/.test(address) || address.includes(':O.Data.')) memory.outputs[address] = value;
  else memory.bits[address] = value;
};
export const flattenMemory = (memory: PlcMemory): Record<string, boolean> => ({ ...memory.inputs, ...memory.outputs, ...memory.bits });
