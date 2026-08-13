import { ExtendedLadderRung, PlcDiagnostic, VerificationResult } from '../types/plc';
import { getRungWiringIssue } from '../utils/plcEngine';

const outputTypes = ['COIL', 'INV_COIL', 'SET', 'RSET', 'TIM', 'CNT', 'TON', 'TOF', 'TP', 'CTU', 'CTD'];
export const verifyProgram = (rungs: ExtendedLadderRung[]): VerificationResult => {
  const diagnostics: PlcDiagnostic[] = [];
  rungs.forEach((rung, rungIndex) => {
    const add = (message: string, suggestion: string, elementId?: string): void => { diagnostics.push({ level: 'ERROR', message, rung: rungIndex + 1, elementId, suggestion, timestamp: Date.now() }); };
    if (!rung.mainElements.length) add('Rung ว่าง', 'เพิ่มคำสั่งหรือเอา Rung นี้ออก');
    const wireIssue = getRungWiringIssue(rung); if (wireIssue) add(`Wire ขาด: ${wireIssue}`, 'เชื่อมสายให้ต่อเนื่องจากรางซ้ายถึง Output');
    const output = [...rung.mainElements, ...(rung.branches || []).flatMap((branch) => branch.elements)].filter((item) => outputTypes.includes(item.type));
    if (!output.length && rung.mainElements.length) add('Rung ไม่มี Output', 'เพิ่ม Coil, Timer หรือ Counter ที่ท้าย Rung');
    rung.mainElements.forEach((element) => {
      if (!element.rawAddress?.trim()) add('Instruction ไม่มี Address', 'กำหนด PLC Address', element.id);
      if (['TIM', 'TON', 'TOF', 'TP'].includes(element.type) && (!element.presetTime || element.presetTime <= 0)) add('Timer ไม่มี Preset', 'กำหนดเวลา Preset มากกว่า 0', element.id);
      if (['CNT', 'CTU', 'CTD'].includes(element.type) && (!element.presetCount || element.presetCount <= 0)) add('Counter ไม่มี Preset', 'กำหนดค่า Preset มากกว่า 0', element.id);
    });
  });
  return { valid: !diagnostics.length, diagnostics };
};
