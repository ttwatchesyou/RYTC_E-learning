import { ExtendedLadderRung, PLCBrand, PlcDiagnostic, PlcMemory, PlcMode, PlcSnapshot, VerificationResult } from '../types/plc';
import { verifyProgram } from './diagnostics';
import { createMemory, flattenMemory, writeBit } from './memory';
import { executeScan } from './scanEngine';

export class PlcEngine {
  private memory: PlcMemory = createMemory();
  private program: ExtendedLadderRung[] = [];
  private mode: PlcMode = 'PROGRAM';
  private scanCount = 0;
  private scanTimeMs = 0;
  private diagnostics: PlcDiagnostic[] = [];
  public readonly vendor: PLCBrand;

  public constructor(vendor: PLCBrand = 'SIEMENS') { this.vendor = vendor; }
  public loadProgram(rungs: ExtendedLadderRung[], initialMemory: Record<string, boolean> = {}): VerificationResult {
    this.program = structuredClone(rungs); this.memory = createMemory();
    Object.entries(initialMemory).forEach(([address, value]) => writeBit(this.memory, address, value));
    this.mode = 'PROGRAM'; this.scanCount = 0; this.scanTimeMs = 0; this.diagnostics = [];
    return this.verify();
  }
  public verify(): VerificationResult { const result = verifyProgram(this.program); this.diagnostics = result.diagnostics; return result; }
  public download(): VerificationResult { const result = this.verify(); this.mode = result.valid ? 'STOP' : 'FAULT'; if (result.valid) this.info('Virtual PLC Download complete'); return result; }
  public run(): boolean { const result = this.verify(); if (!result.valid) { this.mode = 'FAULT'; return false; } this.mode = 'RUN'; this.info('PLC RUN'); return true; }
  public stop(): void { if (this.mode !== 'PROGRAM') this.mode = 'STOP'; this.info('PLC STOP'); }
  public setInput(address: string, value: boolean): void { writeBit(this.memory, address, value); }
  public scan(deltaSeconds = 0.1): PlcSnapshot | null {
    if (this.mode !== 'RUN' && this.mode !== 'STOP') return null;
    const started = performance.now(); this.program = executeScan(this.program, this.memory, deltaSeconds); this.scanCount += 1;
    this.scanTimeMs = Math.max(0.01, performance.now() - started); return this.snapshot();
  }
  public reset(): void { this.memory = createMemory(); this.scanCount = 0; this.scanTimeMs = 0; this.mode = this.program.length ? 'STOP' : 'PROGRAM'; this.info('CPU reset'); }
  public snapshot(): PlcSnapshot { return { mode: this.mode, scanCount: this.scanCount, scanTimeMs: this.scanTimeMs, memory: flattenMemory(this.memory), rungs: structuredClone(this.program), diagnostics: [...this.diagnostics] }; }
  private info(message: string): void { const event: PlcDiagnostic = { level: 'INFO', message, timestamp: Date.now() }; this.diagnostics = [event, ...this.diagnostics].slice(0, 50); }
}
