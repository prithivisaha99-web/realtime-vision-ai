import { BackendDetectResponse, RawBackendDetection } from '../types/detection';

const API_BASE_URL = 'http://localhost:8000';

/**
 * Check health / status of the Python YOLO backend.
 */
export async function checkBackendHealth(): Promise<{
  online: boolean;
  model?: string;
  device?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${API_BASE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        online: data.status === 'online',
        model: data.model,
        device: data.device,
      };
    }
    return { online: false };
  } catch {
    return { online: false };
  }
}

/**
 * Send a JPEG/PNG Blob to Python YOLOv8 backend for inference.
 */
export async function detectFrameBlob(
  blob: Blob,
  confidence: number = 0.35,
  iou: number = 0.45
): Promise<BackendDetectResponse | null> {
  try {
    const formData = new FormData();
    formData.append('file', blob, 'frame.jpg');
    formData.append('confidence', String(confidence));
    formData.append('iou', String(iou));

    const res = await fetch(`${API_BASE_URL}/detect`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) return null;
    return (await res.json()) as BackendDetectResponse;
  } catch (err) {
    console.warn('[YOLO Service] Detection request failed:', err);
    return null;
  }
}

/**
 * Send a Base64 data URL string to Python YOLOv8 backend for inference.
 */
export async function detectFrameBase64(
  base64Image: string,
  confidence: number = 0.35,
  iou: number = 0.45
): Promise<BackendDetectResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/detect/base64`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64Image,
        confidence,
        iou,
      }),
    });

    if (!res.ok) return null;
    return (await res.json()) as BackendDetectResponse;
  } catch (err) {
    console.warn('[YOLO Service] Base64 detection request failed:', err);
    return null;
  }
}
