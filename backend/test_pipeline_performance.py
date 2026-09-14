import os
import sys
import time
from pathlib import Path

import cv2
import numpy as np
import requests

API_BASE_URL = "http://localhost:8000"
DETECT_URL = f"{API_BASE_URL}/detect"
HEALTH_URL = f"{API_BASE_URL}/health"

def main():
    print("=" * 60, flush=True)
    print("STEP 13: END-TO-END PIPELINE PROFILING", flush=True)
    print("=" * 60, flush=True)
    print(f"Python Version:       {sys.version.split()[0]} ({sys.executable})", flush=True)
    print(f"OpenCV Version:       {cv2.__version__}", flush=True)
    print(f"Backend Target API:   {DETECT_URL}", flush=True)
    print("-" * 60, flush=True)

    # 1. Verify Backend Connectivity
    print("[1/4] Checking backend server health...", flush=True)
    try:
        health_resp = requests.get(HEALTH_URL, timeout=4)
        if health_resp.status_code != 200:
            print(f"[ERROR] Backend returned status code {health_resp.status_code}", flush=True)
            sys.exit(1)
        health_data = health_resp.json()
        print(f"  --> Backend Online! Model: {health_data.get('model')}, Tracker: {health_data.get('tracker')}, Device: {health_data.get('device')}", flush=True)
    except Exception as e:
        print(f"[ERROR] Could not connect to backend server at {HEALTH_URL}: {e}", flush=True)
        print("  --> Please ensure backend/server.py is running on port 8000.", flush=True)
        sys.exit(1)

    # 2. Open physical webcam
    print("\n[2/4] Initializing webcam device (DirectShow backend)...", flush=True)
    cap = None
    if sys.platform.startswith("win"):
        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    if cap is None or not cap.isOpened():
        cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("[ERROR] Failed to open webcam at index 0.", flush=True)
        sys.exit(1)

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    actual_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    actual_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"  --> Camera opened successfully: {actual_w} x {actual_h}", flush=True)

    # 3. Warm-up Phase
    print("\n[3/4] Warming up end-to-end pipeline (5 frames)...", flush=True)
    for w_idx in range(5):
        ret, frame = cap.read()
        if not ret or frame is None:
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
        _, encoded_buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        files = {"file": ("warmup.jpg", encoded_buf.tobytes(), "image/jpeg")}
        _ = requests.post(DETECT_URL, files=files, timeout=10)

    # 4. Measured End-to-End Profiling
    measured_frames_target = 20
    print(f"\n[4/4] Profiling {measured_frames_target} consecutive frames through the full pipeline...", flush=True)
    print("  --> Capturing 1 frame at a time sequentially (No concurrency, full end-to-end measurement)...", flush=True)
    print("-" * 60, flush=True)

    camera_times_ms = []
    encoding_times_ms = []
    http_times_ms = []
    inference_times_ms = []
    tracking_times_ms = []
    overhead_times_ms = []
    total_pipeline_times_ms = []

    frames_with_detections = 0
    total_objects_count = 0
    all_observed_track_ids = set()

    for i in range(1, measured_frames_target + 1):
        # Stage 1: Camera Capture
        t_cap_start = time.perf_counter()
        ret, frame = cap.read()
        t_cap_end = time.perf_counter()
        if not ret or frame is None:
            print(f"[WARNING] Dropped frame at index {i}", flush=True)
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
        t_cap_ms = (t_cap_end - t_cap_start) * 1000.0

        # Stage 2: Image Encoding
        t_enc_start = time.perf_counter()
        ok_enc, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        t_enc_end = time.perf_counter()
        if not ok_enc:
            print(f"[ERROR] Failed to encode frame {i}", flush=True)
            continue
        t_enc_ms = (t_enc_end - t_enc_start) * 1000.0

        # Stage 3: HTTP Round-Trip & Server Processing
        t_http_start = time.perf_counter()
        try:
            files = {"file": (f"frame_{i}.jpg", buf.tobytes(), "image/jpeg")}
            resp = requests.post(DETECT_URL, files=files, timeout=10)
            t_http_end = time.perf_counter()
            t_http_ms = (t_http_end - t_http_start) * 1000.0

            if resp.status_code != 200:
                print(f"[ERROR] API returned error status {resp.status_code} on frame {i}", flush=True)
                continue

            resp_data = resp.json()
        except Exception as api_err:
            print(f"[ERROR] HTTP request failed on frame {i}: {api_err}", flush=True)
            continue

        # Server timings
        t_inf_ms = float(resp_data.get("inference_ms", 0.0))
        t_track_ms = float(resp_data.get("tracking_ms", 0.0))

        # Client / Network / Serialization overhead
        t_overhead_ms = max(0.0, t_http_ms - (t_inf_ms + t_track_ms))

        # Total frame cycle time
        t_total_frame_ms = t_cap_ms + t_enc_ms + t_http_ms

        camera_times_ms.append(t_cap_ms)
        encoding_times_ms.append(t_enc_ms)
        http_times_ms.append(t_http_ms)
        inference_times_ms.append(t_inf_ms)
        tracking_times_ms.append(t_track_ms)
        overhead_times_ms.append(t_overhead_ms)
        total_pipeline_times_ms.append(t_total_frame_ms)

        # Collect detections telemetry
        detections = resp_data.get("detections", [])
        num_dets = len(detections)
        total_objects_count += num_dets
        if num_dets > 0:
            frames_with_detections += 1
            for d in detections:
                tid = d.get("track_id")
                if tid is not None:
                    all_observed_track_ids.add(tid)

        print(
            f"  Frame {i:02d}/{measured_frames_target} | "
            f"Cap: {t_cap_ms:4.1f}ms | "
            f"Enc: {t_enc_ms:3.1f}ms | "
            f"HTTP: {t_http_ms:5.1f}ms (Inf: {t_inf_ms:5.1f}ms, Track: {t_track_ms:3.1f}ms, Net: {t_overhead_ms:4.1f}ms) | "
            f"Total: {t_total_frame_ms:5.1f}ms | "
            f"Dets: {num_dets}",
            flush=True
        )

    cap.release()

    # 5. Compute Aggregate Statistics
    n_frames = len(total_pipeline_times_ms)
    if n_frames == 0:
        print("[ERROR] No frames successfully profiled.", flush=True)
        sys.exit(1)

    avg_cap = sum(camera_times_ms) / n_frames
    avg_enc = sum(encoding_times_ms) / n_frames
    avg_http = sum(http_times_ms) / n_frames
    avg_inf = sum(inference_times_ms) / n_frames
    avg_track = sum(tracking_times_ms) / n_frames
    avg_overhead = sum(overhead_times_ms) / n_frames
    avg_total = sum(total_pipeline_times_ms) / n_frames

    effective_fps = 1000.0 / avg_total if avg_total > 0 else 0.0

    # Percentage breakdown of total pipeline time
    pct_cap = (avg_cap / avg_total) * 100.0 if avg_total > 0 else 0.0
    pct_enc = (avg_enc / avg_total) * 100.0 if avg_total > 0 else 0.0
    pct_inf = (avg_inf / avg_total) * 100.0 if avg_total > 0 else 0.0
    pct_track = (avg_track / avg_total) * 100.0 if avg_total > 0 else 0.0
    pct_overhead = (avg_overhead / avg_total) * 100.0 if avg_total > 0 else 0.0
    pct_http_total = (avg_http / avg_total) * 100.0 if avg_total > 0 else 0.0

    # Determine largest bottleneck
    stage_durations = {
        "Camera Capture (cap.read)": avg_cap,
        "Image Encoding (JPEG)": avg_enc,
        "YOLOv8n Neural Inference": avg_inf,
        "ByteTrack Object Tracking": avg_track,
        "HTTP/Network/Serialization Overhead": avg_overhead,
    }
    sorted_stages = sorted(stage_durations.items(), key=lambda x: x[1], reverse=True)
    primary_bottleneck = sorted_stages[0]
    secondary_bottleneck = sorted_stages[1]

    # 6. Final Report Output
    print("\n" + "=" * 60, flush=True)
    print("STEP 13: END-TO-END PIPELINE PROFILING REPORT", flush=True)
    print("============================================================", flush=True)
    print(f"Camera Resolution:      {actual_w} x {actual_h}", flush=True)
    print(f"Measured Frames:        {n_frames}", flush=True)
    print(f"Model:                  yolov8n.pt", flush=True)
    print(f"Tracker:                ByteTrack", flush=True)
    print("-" * 60, flush=True)
    print("AVERAGE TIMINGS PER FRAME", flush=True)
    print("-" * 60, flush=True)
    print(f"Camera Capture:          {avg_cap:6.2f} ms", flush=True)
    print(f"Image Encoding:          {avg_enc:6.2f} ms", flush=True)
    print(f"HTTP Round Trip (Total): {avg_http:6.2f} ms", flush=True)
    print(f"  |- YOLO Inference:     {avg_inf:6.2f} ms", flush=True)
    print(f"  |- ByteTrack Tracking: {avg_track:6.2f} ms", flush=True)
    print(f"  \\- Net/API Overhead:   {avg_overhead:6.2f} ms", flush=True)
    print(f"Total Pipeline:          {avg_total:6.2f} ms", flush=True)
    print(f"", flush=True)
    print(f"Effective Pipeline FPS:  {effective_fps:5.2f} FPS", flush=True)
    print("-" * 60, flush=True)
    print("PIPELINE STAGE BREAKDOWN (% OF TOTAL FRAME TIME)", flush=True)
    print("-" * 60, flush=True)
    print(f"Camera Capture:          {pct_cap:5.1f}%", flush=True)
    print(f"Image Encoding:          {pct_enc:5.1f}%", flush=True)
    print(f"YOLO Inference:          {pct_inf:5.1f}%", flush=True)
    print(f"ByteTrack Tracking:      {pct_track:5.1f}%", flush=True)
    print(f"HTTP/API Overhead:       {pct_overhead:5.1f}%", flush=True)
    print("-" * 60, flush=True)
    print("DETECTIONS & TRACKING SUMMARY", flush=True)
    print("-" * 60, flush=True)
    print(f"Frames With Detections:  {frames_with_detections} / {n_frames} frames", flush=True)
    print(f"Average Objects / Frame: {total_objects_count / n_frames:.2f}", flush=True)
    print(f"Track IDs Observed:      {sorted(list(all_observed_track_ids)) if all_observed_track_ids else '[]'}", flush=True)
    print("-" * 60, flush=True)
    print("PRIMARY BOTTLENECK ANALYSIS", flush=True)
    print("-" * 60, flush=True)
    print(f"PRIMARY BOTTLENECK:      {primary_bottleneck[0].upper()}", flush=True)
    print(f"  --> Takes {primary_bottleneck[1]:.2f} ms per frame ({primary_bottleneck[1]/avg_total*100:.1f}% of total cycle time)", flush=True)
    print(f"SECONDARY BOTTLENECK:    {secondary_bottleneck[0].upper()}", flush=True)
    print(f"  --> Takes {secondary_bottleneck[1]:.2f} ms per frame ({secondary_bottleneck[1]/avg_total*100:.1f}% of total cycle time)", flush=True)
    print("=" * 60, flush=True)

if __name__ == "__main__":
    main()
