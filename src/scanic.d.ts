export interface Point {
  x: number;
  y: number;
}

export interface CornerPoints {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

export interface CornerEditorMagnifierOptions {
  enabled?: boolean;
  size?: number;
  zoom?: number;
  margin?: number;
  borderColor?: string;
  borderWidth?: number;
  crosshairColor?: string;
  crosshairSize?: number;
}

export interface CornerEditorNudgesOptions {
  enabled?: boolean;
  steps?: number[];
}

export interface CornerEditorOptions {
  /** Host element the editor canvas is mounted into. */
  container: HTMLElement;
  /** Source image to adjust corners against. */
  image: HTMLImageElement | HTMLCanvasElement | ImageData;
  /** Initial corner positions (image-space pixels). Defaults to an inset quad. */
  corners?: CornerPoints;
  magnifier?: CornerEditorMagnifierOptions;
  nudges?: CornerEditorNudgesOptions;
  /** Touch/click target radius (px) around each handle. Default 48. */
  handleHitArea?: number;
  /**
   * Enable keyboard control of the focused canvas (default true):
   * arrow keys nudge the active corner (Shift = coarse step),
   * Enter confirms, Escape cancels.
   */
  keyboard?: boolean;
  /** Fired on every corner change (drag, nudge, keyboard). */
  onChange?: (corners: CornerPoints) => void;
  /** Fired by confirm()/Enter with the final corners. */
  onConfirm?: (corners: CornerPoints) => void;
  /** Fired by cancel()/Escape. */
  onCancel?: () => void;
}

export interface CornerEditor {
  getCorners(): CornerPoints;
  setCorners(corners: CornerPoints): boolean;
  reset(): void;
  nudge(cornerKey: keyof CornerPoints, dx: number, dy: number, step?: number): boolean;
  confirm(): CornerPoints;
  cancel(): void;
  destroy(): void;
}

export interface DetectionOptions {
  mode?: 'detect' | 'extract';
  output?: 'canvas' | 'imagedata' | 'dataurl';
  debug?: boolean;
  maxProcessingDimension?: number;
  lowThreshold?: number;
  highThreshold?: number;
  applyDilation?: boolean;
  dilationKernelSize?: number;
  dilationIterations?: number;
  useWasmHysteresis?: boolean;
  useWasmFullCanny?: boolean;
  minArea?: number;
  epsilon?: number;
  minDetectionConfidence?: number;
  maxCandidateContours?: number;
  enableDetectionCascade?: boolean;
  minCascadeTriggerConfidence?: number;
  minDocumentCoverageRatio?: number;
  minDocumentSideRatio?: number;
  minDocumentFillRatio?: number;
  minContourFitRatio?: number;
  maxContourFitRatio?: number;
  minRightAngleScore?: number;
  minOppositeSideConsistency?: number;
  maxDocumentAspectRatio?: number;
}

export interface Timing {
  step: string;
  ms: string;
}

export interface ScannerResult {
  success: boolean;
  message: string;
  confidence?: number | null;
  output: HTMLCanvasElement | ImageData | string | null;
  corners: CornerPoints | null;
  contour: Point[] | null;
  debug: any | null;
  timings: Timing[];
}

/**
 * Main entry point for document scanning.
 */
export function scanDocument(
  image: HTMLImageElement | HTMLCanvasElement | ImageData,
  options?: DetectionOptions
): Promise<ScannerResult>;

/**
 * Extract document with manual corner points.
 */
export function extractDocument(
  image: HTMLImageElement | HTMLCanvasElement | ImageData,
  corners: CornerPoints,
  options?: Pick<DetectionOptions, 'output'>
): Promise<ScannerResult>;

/**
 * Unified Scanner class for better state management.
 */
export class Scanner {
  constructor(options?: DetectionOptions);
  initialize(): Promise<void>;
  scan(
    image: HTMLImageElement | HTMLCanvasElement | ImageData,
    options?: DetectionOptions
  ): Promise<ScannerResult>;
}

/**
 * Create a manual corner adjustment editor.
 */
export function createCornerEditor(options: CornerEditorOptions): CornerEditor;
