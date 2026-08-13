import { PLCBrand, VendorProfile } from '../types/plc';
import { iecVendor } from './iec';

const profile = (id: PLCBrand, name: string, software: string, inputPrefix: string, outputPrefix: string, timerPrefix: string, counterPrefix: string, input: (index: number) => string, output: (index: number) => string): VendorProfile => ({ id, name, software, inputPrefix, outputPrefix, timerPrefix, counterPrefix, getInputAddress: input, getOutputAddress: output, getTimerAddress: (index) => `${timerPrefix}${index}`, getCounterAddress: (index) => `${counterPrefix}${index}` });

export const vendorProfiles: Record<PLCBrand, VendorProfile> = {
  SIEMENS: profile('SIEMENS', 'Siemens', 'TIA Portal', 'I0.', 'Q0.', 'T', 'C', (i) => `I0.${i}`, (i) => `Q0.${i}`),
  MITSUBISHI: profile('MITSUBISHI', 'Mitsubishi', 'GX Works', 'X', 'Y', 'T', 'C', (i) => `X${i}`, (i) => `Y${i}`),
  OMRON: profile('OMRON', 'OMRON', 'CX-Programmer / Sysmac', '0.', '100.', 'T', 'C', (i) => `0.${String(i).padStart(2, '0')}`, (i) => `100.${String(i).padStart(2, '0')}`),
  ALLEN_BRADLEY: profile('ALLEN_BRADLEY', 'Allen-Bradley', 'Studio 5000', 'Local:1:I.Data.', 'Local:2:O.Data.', 'T4:', 'C5:', (i) => `Local:1:I.Data.${i}`, (i) => `Local:2:O.Data.${i}`),
  SCHNEIDER: profile('SCHNEIDER', 'Schneider', 'EcoStruxure Machine Expert', '%I0.', '%Q0.', '%TM', '%C', (i) => `%I0.${i}`, (i) => `%Q0.${i}`),
  DELTA: profile('DELTA', 'Delta', 'ISPSoft', 'X', 'Y', 'T', 'C', (i) => `X${i}`, (i) => `Y${i}`),
  PANASONIC: profile('PANASONIC', 'Panasonic', 'FPWIN Pro', 'X', 'Y', 'T', 'C', (i) => `X${i}`, (i) => `Y${i}`),
  IEC: iecVendor,
};

export const getInputAddress = (vendor: PLCBrand, index: number): string => vendorProfiles[vendor].getInputAddress(index);
export const getOutputAddress = (vendor: PLCBrand, index: number): string => vendorProfiles[vendor].getOutputAddress(index);
export const getTimerAddress = (vendor: PLCBrand, index: number): string => vendorProfiles[vendor].getTimerAddress(index);
export const getCounterAddress = (vendor: PLCBrand, index: number): string => vendorProfiles[vendor].getCounterAddress(index);
