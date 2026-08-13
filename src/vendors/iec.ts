import { VendorProfile } from '../types/plc';

export const iecVendor: VendorProfile = {
  id: 'IEC', name: 'IEC Universal', software: 'IEC 61131-3', inputPrefix: '%IX0.', outputPrefix: '%QX0.', timerPrefix: 'TON', counterPrefix: 'CTU',
  getInputAddress: (index) => `%IX0.${index}`,
  getOutputAddress: (index) => `%QX0.${index}`,
  getTimerAddress: (index) => `TON${index}`,
  getCounterAddress: (index) => `CTU${index}`,
};
