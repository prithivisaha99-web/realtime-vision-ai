export type ObjectClass = 
  | 'person' 
  | 'car' 
  | 'truck' 
  | 'bus' 
  | 'bicycle' 
  | 'motorcycle' 
  | 'traffic light' 
  | 'stop sign' 
  | 'bottle' 
  | 'chair' 
  | 'laptop' 
  | 'cell phone' 
  | 'backpack' 
  | 'handbag' 
  | 'sports ball';

export interface BoundingBox {
  /** Top-left X in percentage (0 to 100) */
  x: number;
  /** Top-left Y in percentage (0 to 100) */
  y: number;
  /** Width in percentage (0 to 100) */
  width: number;
  /** Height in percentage (0 to 100) */
  height: number;
}

export interface DetectedObject {
  id: string;
  trackId: string;
  track_id?: number | null;
  class: string;
  category: 'person' | 'vehicle' | 'object' | 'other';
  confidence: number;
  bbox: BoundingBox;
  color: string;
  lastSeen: number;
  velocity?: { vx: number; vy: number };
  trail?: { x: number; y: number }[];
  status: 'active' | 'occluded' | 'lost';
}

export interface DetectionStats {
  totalObjects: number;
  peopleCount: number;
  vehicleCount: number;
  otherCount: number;
  averageConfidence: number;
  fps: number;
  inferenceTimeMs: number;
  trackingTimeMs?: number;
  resolution: string;
}

export interface DetectionSettings {
  model: 'YOLOv8n' | 'YOLOv8s' | 'YOLOv8m' | 'YOLOv9-C' | 'RT-DETR-L';
  tracker: 'ByteTrack' | 'DeepSORT' | 'BoT-SORT';
  confidenceThreshold: number;
  iouThreshold: number;
  maxTrackAge: number;
  drawTrails: boolean;
  drawBoundingBoxes: boolean;
  drawConfidence: boolean;
  drawTrackingId: boolean;
  enableSoundFx: boolean;
  backendWsUrl: string;
  themePreset: 'cyan-cyber' | 'emerald-matrix' | 'amethyst-void' | 'solar-amber';
  videoSourceMode: 'mock-cyber' | 'mock-street' | 'webcam' | 'custom-video';
}

export interface RawBackendDetection {
  id: string;
  track_id?: number | null;
  class_id: number;
  class_name: string;
  category: 'person' | 'vehicle' | 'object' | 'other';
  confidence: number;
  box: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  normalized_box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface BackendDetectResponse {
  status: string;
  detections: RawBackendDetection[];
  count: number;
  inference_ms: number;
  tracking_ms?: number;
  image_size: {
    width: number;
    height: number;
  };
  timestamp: number;
}
