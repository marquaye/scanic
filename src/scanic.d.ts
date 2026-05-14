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
