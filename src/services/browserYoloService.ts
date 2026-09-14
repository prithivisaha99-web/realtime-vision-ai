import type * as OrtType from 'onnxruntime-web';
import { BackendDetectResponse, RawBackendDetection } from '../types/detection';

export const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light',
  'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
  'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
  'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard',
  'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
  'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone',
  'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear',
  'hair drier', 'toothbrush'
];

const VEHICLE_CLASSES = new Set([
  'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'bicycle'
]);

function mapCategory(className: string): 'person' | 'vehicle' | 'object' | 'other' {
  const lower = className.toLowerCase();
  if (lower === 'person') return 'person';
  if (VEHICLE_CLASSES.has(lower)) return 'vehicle';
  return 'object';
}

function calculateIoU(boxA: [number, number, number, number], boxB: [number, number, number, number]): number {
  const xA = Math.max(boxA[0], boxB[0]);
  const yA = Math.max(boxA[1], boxB[1]);
  const xB = Math.min(boxA[2], boxB[2]);
  const yB = Math.min(boxA[3], boxB[3]);
  const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
  const boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]);
  const boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]);
  const unionArea = boxAArea + boxBArea - interArea;
  return unionArea <= 0 ? 0 : interArea / unionArea;
}

let sessionInstance: OrtType.InferenceSession | null = null;
let sessionLoadingPromise: Promise<OrtType.InferenceSession> | null = null;
let letterboxCanvas: HTMLCanvasElement | null = null;
let letterboxCtx: CanvasRenderingContext2D | null = null;
let cachedFloatData: Float32Array | null = null;

function getOrt(): typeof OrtType {
  if (typeof window !== 'undefined' && (window as unknown as { ort?: typeof OrtType }).ort) {
    return (window as unknown as { ort: typeof OrtType }).ort;
  }
  throw new Error('ONNX Runtime Web global ort is not loaded.');
}

/**
 * Get or initialize the singleton YOLOv8n ONNX Runtime Web session.
 */
export async function getBrowserYoloSession(): Promise<OrtType.InferenceSession> {
  if (sessionInstance) return sessionInstance;
  if (sessionLoadingPromise) return sessionLoadingPromise;

  sessionLoadingPromise = (async () => {
    const ort = getOrt();
    ort.env.wasm.wasmPaths = '/';
    ort.env.wasm.numThreads = 1;

    console.log('[BrowserYOLO] Initializing ONNX Runtime Web session from /models/yolov8n.onnx...');
    const startTime = performance.now();
    
    const session = await ort.InferenceSession.create('/models/yolov8n.onnx', {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
    
    const elapsed = (performance.now() - startTime).toFixed(1);
    console.log(`[BrowserYOLO] Session loaded in ${elapsed}ms. Input:`, session.inputNames, 'Output:', session.outputNames);
    
    // Warmup session with dummy tensor
    const dummyTensor = new ort.Tensor('float32', new Float32Array(1 * 3 * 320 * 320), [1, 3, 320, 320]);
    await session.run({ [session.inputNames[0]]: dummyTensor });
    console.log('[BrowserYOLO] Model warmup complete.');

    sessionInstance = session;
    return session;
  })();

  return sessionLoadingPromise;
}

/**
 * Check if the browser YOLO session is loaded and ready.
 */
export function isBrowserYoloReady(): boolean {
  return sessionInstance !== null;
}

/**
 * Explicitly trigger model loading and warmup.
 */
export async function initBrowserYolo(): Promise<boolean> {
  try {
    await getBrowserYoloSession();
    return true;
  } catch (err) {
    console.error('[BrowserYOLO] Initialization failed:', err);
    return false;
  }
}

/**
 * Perform real-time YOLOv8n inference on a canvas element directly in the browser.
 * 
 * @param sourceCanvas HTMLCanvasElement containing the captured webcam/video frame (e.g. 320x240)
 * @param confidenceThreshold Minimum confidence threshold (default 0.25)
 * @param iouThreshold NMS IoU threshold (default 0.45)
 */
export async function detectFrameCanvas(
  sourceCanvas: HTMLCanvasElement,
  confidenceThreshold: number = 0.25,
  iouThreshold: number = 0.45
): Promise<BackendDetectResponse | null> {
  try {
    const ort = getOrt();
    const session = await getBrowserYoloSession();
    const srcWidth = sourceCanvas.width;
    const srcHeight = sourceCanvas.height;
    if (srcWidth <= 0 || srcHeight <= 0) return null;

    const t0 = performance.now();

    if (!cachedFloatData) {
      cachedFloatData = new Float32Array(3 * 320 * 320);
    }
    const floatData = cachedFloatData;
    floatData.fill(0.4470588); // 114/255 standard letterbox fill

    // Compute letterbox scaling and centering
    const scale = Math.min(320 / srcWidth, 320 / srcHeight);
    const scaledWidth = Math.round(srcWidth * scale);
    const scaledHeight = Math.round(srcHeight * scale);
    const dx = Math.floor((320 - scaledWidth) / 2);
    const dy = Math.floor((320 - scaledHeight) / 2);

    // Fast direct copy for 320x240 source canvas without extra canvas draw passes
    const sctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    if (!sctx) return null;
    const srcImgData = sctx.getImageData(0, 0, srcWidth, srcHeight);
    const srcPixels = srcImgData.data;

    const planeSize = 320 * 320;
    const gOffset = planeSize;
    const bOffset = planeSize * 2;

    if (scale === 1.0 && dx === 0) {
      const rowOffset = dy * 320;
      for (let y = 0; y < srcHeight; y++) {
        const srcRow = y * srcWidth * 4;
        const dstRow = rowOffset + y * 320;
        for (let x = 0; x < srcWidth; x++) {
          const p = srcRow + x * 4;
          const dst = dstRow + x;
          floatData[dst] = srcPixels[p] * 0.0039215686;
          floatData[gOffset + dst] = srcPixels[p + 1] * 0.0039215686;
          floatData[bOffset + dst] = srcPixels[p + 2] * 0.0039215686;
        }
      }
    } else {
      if (!letterboxCanvas) {
        letterboxCanvas = document.createElement('canvas');
        letterboxCanvas.width = 320;
        letterboxCanvas.height = 320;
        letterboxCtx = letterboxCanvas.getContext('2d', { willReadFrequently: true, alpha: false });
      }
      if (letterboxCtx) {
        letterboxCtx.fillStyle = '#727272';
        letterboxCtx.fillRect(0, 0, 320, 320);
        letterboxCtx.drawImage(sourceCanvas, 0, 0, srcWidth, srcHeight, dx, dy, scaledWidth, scaledHeight);
        const lData = letterboxCtx.getImageData(0, 0, 320, 320).data;
        for (let i = 0; i < planeSize; i++) {
          const p = i * 4;
          floatData[i] = lData[p] * 0.0039215686;
          floatData[gOffset + i] = lData[p + 1] * 0.0039215686;
          floatData[bOffset + i] = lData[p + 2] * 0.0039215686;
        }
      }
    }

    const inputTensor = new ort.Tensor('float32', floatData, [1, 3, 320, 320]);
    const feeds = { [session.inputNames[0]]: inputTensor };

    // Run inference
    const inferStart = performance.now();
    const results = await session.run(feeds);
    const inferEnd = performance.now();
    const inferenceMs = +(inferEnd - inferStart).toFixed(2);

    // Decode output tensor [1, 84, 2100]
    const outputTensor = results[session.outputNames[0]];
    const outData = outputTensor.data as Float32Array;
    const numBoxes = 2100;
    const numClasses = 80;

    interface CandidateDetection {
      classId: number;
      className: string;
      category: 'person' | 'vehicle' | 'object' | 'other';
      confidence: number;
      box: [number, number, number, number]; // [x1, y1, x2, y2]
    }

    const candidates: CandidateDetection[] = [];

    for (let i = 0; i < numBoxes; i++) {
      let maxScore = -Infinity;
      let maxClassId = -1;

      for (let c = 0; c < numClasses; c++) {
        const score = outData[(4 + c) * numBoxes + i];
        if (score > maxScore) {
          maxScore = score;
          maxClassId = c;
        }
      }

      if (maxScore >= confidenceThreshold && maxClassId >= 0) {
        const cx = outData[0 * numBoxes + i];
        const cy = outData[1 * numBoxes + i];
        const w = outData[2 * numBoxes + i];
        const h = outData[3 * numBoxes + i];

        // Map from 320x320 letterbox coordinates back to source canvas dimensions
        const origX1 = Math.max(0, Math.min(srcWidth, (cx - w / 2 - dx) / scale));
        const origY1 = Math.max(0, Math.min(srcHeight, (cy - h / 2 - dy) / scale));
        const origX2 = Math.max(0, Math.min(srcWidth, (cx + w / 2 - dx) / scale));
        const origY2 = Math.max(0, Math.min(srcHeight, (cy + h / 2 - dy) / scale));

        if (origX2 > origX1 && origY2 > origY1) {
          const className = COCO_CLASSES[maxClassId] || `class_${maxClassId}`;
          candidates.push({
            classId: maxClassId,
            className,
            category: mapCategory(className),
            confidence: +maxScore.toFixed(4),
            box: [origX1, origY1, origX2, origY2],
          });
        }
      }
    }

    // Sort descending by confidence
    candidates.sort((a, b) => b.confidence - a.confidence);

    // Non-Maximum Suppression (NMS)
    const nmsDetections: CandidateDetection[] = [];
    for (const cand of candidates) {
      let keep = true;
      for (const confirmed of nmsDetections) {
        if (cand.classId === confirmed.classId) {
          if (calculateIoU(cand.box, confirmed.box) > iouThreshold) {
            keep = false;
            break;
          }
        }
      }
      if (keep) {
        nmsDetections.push(cand);
      }
    }

    // Convert to RawBackendDetection structure matching existing React pipeline
    const rawDetections: RawBackendDetection[] = nmsDetections.map((det, index) => {
      const [x1, y1, x2, y2] = det.box;
      const normX = Math.max(0.0, Math.min(100.0, (x1 / srcWidth) * 100.0));
      const normY = Math.max(0.0, Math.min(100.0, (y1 / srcHeight) * 100.0));
      const normW = Math.max(0.0, Math.min(100.0 - normX, ((x2 - x1) / srcWidth) * 100.0));
      const normH = Math.max(0.0, Math.min(100.0 - normY, ((y2 - y1) / srcHeight) * 100.0));

      return {
        id: `browser-det-${index + 1}`,
        track_id: null,
        class_id: det.classId,
        class_name: det.className,
        category: det.category,
        confidence: det.confidence,
        box: {
          x1: +x1.toFixed(1),
          y1: +y1.toFixed(1),
          x2: +x2.toFixed(1),
          y2: +y2.toFixed(1),
        },
        normalized_box: {
          x: +normX.toFixed(2),
          y: +normY.toFixed(2),
          width: +normW.toFixed(2),
          height: +normH.toFixed(2),
        },
      };
    });

    const totalElapsedMs = +(performance.now() - t0).toFixed(2);
    const postprocessMs = +(totalElapsedMs - inferenceMs).toFixed(2);

    const response: BackendDetectResponse = {
      status: 'success',
      detections: rawDetections,
      count: rawDetections.length,
      inference_ms: inferenceMs,
      tracking_ms: postprocessMs,
      image_size: {
        width: srcWidth,
        height: srcHeight,
      },
      timestamp: Date.now() / 1000,
    };

    return response;
  } catch (err) {
    console.error('[BrowserYOLO] Detection error:', err);
    return null;
  }
}

// Expose on window for runtime diagnostics / telemetry in browser
if (typeof window !== 'undefined') {
  (window as unknown as { __browserYolo: unknown }).__browserYolo = {
    detectFrameCanvas,
    initBrowserYolo,
    getBrowserYoloSession,
    isBrowserYoloReady,
  };
}
