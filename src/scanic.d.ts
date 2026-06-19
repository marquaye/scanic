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
  /** Show the on-screen nudge pad. Default false. */
  enabled?: boolean;
  /** Step sizes (px) to render as nudge buttons. Default [1, 10]. */
  steps?: number[];
}

export interface CornerEditorToolbarOptions {
  /** Show the floating toolbar. Default true. */
  enabled?: boolean;
  /** Include the Reset button. Default true. */
  reset?: boolean;
  /** Include the Cancel button. Default true. */
  cancel?: boolean;
  /** Include the Apply button. Default true. */
  apply?: boolean;
  /** Override the button labels. */
  labels?: { reset?: string; cancel?: string; apply?: string };
}

/**
 * Programmatic theme overrides. Each maps to a CSS custom property on the host
 * (e.g. `accent` → `--scanic-accent`). You can also set these variables directly
 * in your own CSS, or override the `.scanic-*` classes entirely.
 */
export interface CornerEditorTheme {
  /** Primary colour for edges, rings and active handles. */
  accent?: string;
  /** Fill colour outside the document quad. */
  mask?: string;
  /** Quad outline colour. Defaults to `accent`. */
  edgeColor?: string;
  /** Quad outline width (unitless number). */
  edgeWidth?: number | string;
  /** Handle diameter. Number is treated as px. */
  handleSize?: number | string;
  /** Pointer/touch hit-target size. Number is treated as px. */
  handleHit?: number | string;
  /** Handle fill colour (idle). */
  handleColor?: string;
  /** Handle ring colour (idle). */
  handleRingColor?: string;
  /** Background of the toolbar / nudge pad. */
  surface?: string;
  /** Foreground (text) colour of the toolbar / nudge pad. */
  surfaceColor?: string;
  /** Corner radius of the toolbar / nudge pad. */
  radius?: string;
}

export interface CornerEditorClassNames {
  root?: string;
  handle?: string;
  toolbar?: string;
  nudges?: string;
}

export interface CornerEditorOptions {
  /** Host element the editor is mounted into. */
  container: HTMLElement;
  /** Source image to adjust corners against. */
  image: HTMLImageElement | HTMLCanvasElement | ImageData;
  /** Initial corner positions (image-space pixels). Defaults to an inset quad. */
  corners?: CornerPoints;
  magnifier?: CornerEditorMagnifierOptions;
  nudges?: CornerEditorNudgesOptions;
  /** Floating Reset/Cancel/Apply toolbar. Shown by default. */
  toolbar?: CornerEditorToolbarOptions;
  /** Programmatic theme overrides (CSS variables). */
  theme?: CornerEditorTheme;
  /** Extra class names applied to editor parts. */
  classNames?: CornerEditorClassNames;
  /** Inject the default stylesheet once per document. Default true. */
  injectStyles?: boolean;
  /** Pointer/touch target size (px) around each handle. Default 44. */
  handleHitArea?: number;
  /**
   * Enable keyboard control (default true): focus a handle, then arrow keys
   * nudge it (Shift = coarse step), Enter confirms, Escape cancels.
   */
  keyboard?: boolean;
  /** Fired on every corner change (drag, nudge, keyboard). */
  onChange?: (corners: CornerPoints) => void;
  /** Fired by confirm()/Enter/Apply with the final corners. */
  onConfirm?: (corners: CornerPoints) => void;
  /** Fired by cancel()/Escape/Cancel. */
  onCancel?: () => void;
}

export interface CornerEditor {
  getCorners(): CornerPoints;
  setCorners(corners: CornerPoints): boolean;
  reset(): void;
  nudge(cornerKey: keyof CornerPoints, dx: number, dy: number, step?: number): boolean;
  /** Re-read CSS variables into the canvas layer after a runtime theme change. */
  refreshTheme(theme?: CornerEditorTheme): void;
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
