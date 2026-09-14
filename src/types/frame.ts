/**
 * Data structure representing a captured frame from the video stream.
 * Designed to provide raw pixel data for subsequent computer vision / YOLO inference layers.
 */
export interface CapturedFrame {
  /** Width of the captured frame in pixels */
  width: number;
  /** Height of the captured frame in pixels */
  height: number;
  /** Raw RGBA pixel data extracted from the offscreen capture canvas */
  data: ImageData;
  /** High-resolution timestamp (performance.now()) when the frame was captured */
  timestamp: number;
  /** Monotonically increasing sequential frame counter */
  frameId: number;
  /** Reference to offscreen canvas */
  canvas?: HTMLCanvasElement;
}

/**
 * Configuration options for the frame capture loop.
 */
export interface FrameCaptureConfig {
  /**
   * Target capture frame rate (FPS).
   * Allows decoupling camera stream rate (e.g. 30/60 FPS) from inference capture rate.
   * Default: 30
   */
  targetFps?: number;
  /** Optional max width for downscaling prior to inference */
  maxWidth?: number;
  /** Optional max height for downscaling prior to inference */
  maxHeight?: number;
  /** Optional callback invoked on each captured frame */
  onFrame?: (frame: CapturedFrame) => void;
}
