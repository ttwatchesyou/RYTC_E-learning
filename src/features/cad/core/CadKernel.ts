import { CadDocument, CadFeature } from "@/features/cad/types";

export interface CadKernelResult {
  document: CadDocument;
  changedFeature?: CadFeature;
}

/**
 * Rendering and geometry operations intentionally meet at this boundary.
 * A future OpenCascade adapter can implement this contract without moving
 * modeling rules into the React viewport.
 */
export interface CadKernel {
  readonly name: string;
  readonly available: boolean;
  rebuild(document: CadDocument): Promise<CadKernelResult>;
}

export class MockCadKernel implements CadKernel {
  readonly name = "CAD kernel not connected";
  readonly available = false;

  async rebuild(document: CadDocument): Promise<CadKernelResult> {
    return { document };
  }
}

