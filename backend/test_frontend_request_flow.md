# Step 15: Frontend HTTP Connection & Request Flow Diagnosis

> **Diagnostic only — production behavior unchanged.**

---

## 1. Exact Frontend Request Path

```
HTMLVideoElement (Webcam Stream)
  │
  ▼
useFrameCapture hook (requestAnimationFrame @ 30 FPS)
  │
  ▼
handleFrameCaptured callback (CameraViewport.tsx)
  │ (Checks isInferringRef guard; drops frame if request in-flight)
  ▼
HTMLCanvasElement.toBlob (JPEG @ 0.85 quality)
  │
  ▼
detectFrameBlob (src/services/yoloService.ts)
  │ (Creates FormData with 'file', 'confidence', 'iou')
  ▼
fetch("http://localhost:8000/detect", { method: "POST", body: formData })
  │
  ▼
FastAPI POST /detect (backend/server.py)
  │ (Decodes BGR image buffer, executes YOLOv8n + ByteTrack tracking)
  ▼
JSON Response { status, detections, inference_ms, tracking_ms, ... }
  │
  ▼
setRealDetections (src/context/DetectionContext.tsx)
  │
  ▼
React State Updates:
  ├── setObjects(detections) -> Renders bounding boxes & track IDs
  └── setStats(fps, latency, counts, confidence) -> Updates telemetry dashboard
  │
  ▼
finally: isInferringRef.current = false (Unlocks next frame capture)
```

---

## 2. Exact File Names and Relevant Functions

| Component / Layer | File Path | Key Functions & Identifiers |
| :--- | :--- | :--- |
| **Frame Capture Hook** | `src/hooks/useFrameCapture.ts` | `useFrameCapture()`, `captureLoop()` |
| **Viewport & In-Flight Guard** | `src/components/dashboard/CameraViewport.tsx` | `handleFrameCaptured()`, `isInferringRef`, `videoRef`, `streamRef` |
| **HTTP Detection Service** | `src/services/yoloService.ts` | `detectFrameBlob()`, `detectFrameBase64()`, `checkBackendHealth()` |
| **Context & State Store** | `src/context/DetectionContext.tsx` | `DetectionProvider`, `setRealDetections()`, `performHealthCheck()` |
| **Backend API Route** | `backend/server.py` | `detect_frame_multipart()`, `process_image_and_track()` |

---

## 3. Sequential vs. Overlapping Requests
- **Strictly Sequential (Non-Overlapping)**.
- `CameraViewport.tsx` employs `isInferringRef` as an in-flight execution lock. When a detection starts, `isInferringRef.current = true`. Any subsequent frames captured during network transfer or YOLO inference are immediately discarded. Only when the current request completes and executes the `finally` block is `isInferringRef.current` reset to `false`.

---

## 4. Fresh `fetch()` Call per Frame
- **YES**. Every captured frame that passes the in-flight guard triggers an independent `fetch('http://localhost:8000/detect', { method: 'POST', body: formData })` invocation with a newly allocated `FormData` object.

---

## 5. Persistent Client / Session Object
- **NO explicit application-level session object exists**.
- In the browser environment, `window.fetch()` delegates socket lifecycle management to the browser's internal connection pool (HTTP/1.1 Keep-Alive). There is no userland connection pool, long-lived HTTP client instance, or persistent socket layer (such as WebSocket).

---

## 6. AbortController and Cancellation
- **For `/detect` detection frames**: **NO `AbortController` or cancellation signal is configured**. The request runs until completion or browser network timeout.
- *(Note: `checkBackendHealth` in `yoloService.ts` does use an `AbortController` with a 2000ms timeout for `/health`, but this is not used for video frame requests).*

---

## 7. Backpressure Mechanism
- **YES, Client-Side Backpressure Exists**.
- The frontend does **not** overwhelm the backend queue. Frame dispatch is strictly throttled by backend round-trip latency:
  - Video stream runs at 30 FPS.
  - If backend round-trip takes 200 ms, the frontend naturally processes ~5 frames per second (dropping intermediate camera frames).
  - If backend round-trip takes 500 ms, the frontend processes ~2 frames per second.

---

## 8. Why Production Frontend Differs from Step 14 Benchmark
- **In Python (Step 14 Test A)**: Each call to `requests.post()` created a new OS TCP socket without connection reuse. On Windows, querying `localhost` repeatedly triggers Windows DNS / IPv6 (`::1`) resolution delay and TCP socket teardown before falling back to IPv4 (`127.0.0.1`), adding ~2000 ms overhead per request.
- **In Python (Step 14 Test B)**: Reusing a `requests.Session()` preserved the Keep-Alive TCP connection, dropping latency from `2236 ms` down to `163 ms`.
- **In React Browser**: The browser's native `fetch()` uses internal HTTP/1.1 Keep-Alive connection pooling by default, but:
  1. Resolving `localhost` instead of `127.0.0.1` can still incur resolution latency on certain browser/OS networking stacks.
  2. Sequential `multipart/form-data` multipart payload boundary generation and base64/Blob encoding in the browser thread introduces per-frame overhead.
  3. Real-time streaming protocols (WebSocket) avoid HTTP header parsing and boundary serialization entirely.

---

## 9. Non-Modification Confirmation
- **Diagnostic only — production behavior unchanged.**
- No modifications have been made to `server.py`, `yoloService.ts`, `CameraViewport.tsx`, `DetectionContext.tsx`, or any configuration files.
