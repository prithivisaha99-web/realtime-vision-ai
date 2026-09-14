import os
import sys
import time
from pathlib import Path

import cv2
import numpy as np
import torch
import ultralytics
from ultralytics import YOLO

def benchmark_config(
    model: YOLO, 
    cap: cv2.VideoCapture, 
    config_name: str, 
    imgsz: int = None, 
    measured_frames: int = 30,
    warmup_frames: int = 5
):
    print(f"\n--- Running {config_name} ---", flush=True)
    if imgsz is not None:
        print(f"  --> Parameters: imgsz={imgsz}, conf=0.25", flush=True)
    else:
        print(f"  --> Parameters: imgsz=default (640), conf=0.25", flush=True)

    # 1. Warm-up
    print(f"  --> Warming up ({warmup_frames} frames)...", flush=True)
    for _ in range(warmup_frames):
        ret, frame = cap.read()
        if not ret or frame is None:
            # In case webcam frame is not returned, use blank 640x480 frame for warmup
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
        if imgsz is not None:
            _ = model.predict(source=frame, imgsz=imgsz, conf=0.25, verbose=False)
        else:
            _ = model.predict(source=frame, conf=0.25, verbose=False)

    # 2. Measured Benchmark Loop
    print(f"  --> Measuring {measured_frames} frames...", flush=True)
    inference_times_ms = []
    frames_with_detections = 0
    total_detections_count = 0

    start_bench_time = time.perf_counter()

    for idx in range(1, measured_frames + 1):
        ret, frame = cap.read()
        if not ret or frame is None:
            frame = np.zeros((480, 640, 3), dtype=np.uint8)

        t0 = time.perf_counter()
        if imgsz is not None:
            results = model.predict(source=frame, imgsz=imgsz, conf=0.25, verbose=False)
        else:
            results = model.predict(source=frame, conf=0.25, verbose=False)
        t1 = time.perf_counter()

        # Pure inference time
        # Ultralytics speed dictionary gives exact model inference time if available
        speed = results[0].speed if len(results) > 0 and hasattr(results[0], 'speed') else {}
        inf_ms = speed.get('inference', (t1 - t0) * 1000)
        inference_times_ms.append(inf_ms)

        boxes = results[0].boxes
        num_det = len(boxes) if boxes is not None else 0
        total_detections_count += num_det
        if num_det > 0:
            frames_with_detections += 1

        if idx % 10 == 0 or idx == measured_frames:
            print(f"      Frame {idx:02d}/{measured_frames} | Last Inf: {inf_ms:.1f}ms | Detections: {num_det}", flush=True)

    total_bench_duration = time.perf_counter() - start_bench_time
    avg_inference_ms = sum(inference_times_ms) / len(inference_times_ms) if inference_times_ms else 0.0
    approx_fps = 1000.0 / avg_inference_ms if avg_inference_ms > 0 else 0.0
    pipeline_fps = measured_frames / total_bench_duration if total_bench_duration > 0 else 0.0

    return {
        "config_name": config_name,
        "imgsz": imgsz if imgsz is not None else "default (640)",
        "measured_frames": measured_frames,
        "frames_with_detections": frames_with_detections,
        "total_detections": total_detections_count,
        "avg_inference_ms": round(avg_inference_ms, 2),
        "approx_fps": round(approx_fps, 2),
        "pipeline_fps": round(pipeline_fps, 2),
        "total_duration_sec": round(total_bench_duration, 2),
    }

def main():
    print("=" * 60, flush=True)
    print("STEP 12: YOLO PERFORMANCE BENCHMARK", flush=True)
    print("=" * 60, flush=True)
    print(f"Python Version:       {sys.version.split()[0]} ({sys.executable})", flush=True)
    print(f"OpenCV Version:       {cv2.__version__}", flush=True)
    print(f"Ultralytics Version:  {ultralytics.__version__}", flush=True)
    print(f"PyTorch Version:      {torch.__version__}", flush=True)
    device_name = "CUDA (GPU)" if torch.cuda.is_available() else "CPU"
    print(f"Device:               {device_name}", flush=True)
    print("-" * 60, flush=True)

    backend_dir = Path(__file__).resolve().parent
    model_path = backend_dir / "yolov8n.pt"

    if not model_path.exists():
        print(f"[ERROR] YOLO model weights not found at: {model_path}", flush=True)
        sys.exit(1)

    print(f"[1/3] Loading YOLOv8n model from '{model_path.name}'...", flush=True)
    try:
        model = YOLO(str(model_path))
        print(f"  --> Model loaded successfully! Task: {model.task}", flush=True)
    except Exception as e:
        print(f"[ERROR] Failed to load model: {e}", flush=True)
        sys.exit(1)

    # Open webcam device
    print("\n[2/3] Initializing webcam at index 0 (640 x 480)...", flush=True)
    cap = None
    if sys.platform.startswith("win"):
        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    if cap is None or not cap.isOpened():
        cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("[WARNING] Could not open physical webcam, using 640x480 test stream.", flush=True)
    else:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cam_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        cam_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        print(f"  --> Camera opened: {cam_w} x {cam_h}", flush=True)

    print("\n[3/3] Running Comparative Benchmarks (30 frames each)...", flush=True)

    # TEST A: Default Input Size (640)
    res_a = benchmark_config(
        model=model, 
        cap=cap, 
        config_name="TEST A — DEFAULT INPUT SIZE", 
        imgsz=None, 
        measured_frames=30
    )

    # TEST B: Input Size 320
    res_b = benchmark_config(
        model=model, 
        cap=cap, 
        config_name="TEST B — YOLO INPUT SIZE 320", 
        imgsz=320, 
        measured_frames=30
    )

    if cap is not None and cap.isOpened():
        cap.release()

    # Calculations
    inf_a = res_a["avg_inference_ms"]
    inf_b = res_b["avg_inference_ms"]
    inf_diff = inf_a - inf_b
    inf_pct_improvement = (inf_diff / inf_a * 100.0) if inf_a > 0 else 0.0

    fps_a = res_a["approx_fps"]
    fps_b = res_b["approx_fps"]
    fps_diff = fps_b - fps_a
    fps_pct_improvement = (fps_diff / fps_a * 100.0) if fps_a > 0 else 0.0

    # Print Final Standard Report
    print("\n" + "=" * 60, flush=True)
    print("STEP 12: YOLO PERFORMANCE BENCHMARK REPORT", flush=True)
    print("=" * 60, flush=True)
    print(f"Model:              {model_path.name}", flush=True)
    print(f"Device:             {device_name}", flush=True)
    print(f"Camera Resolution:  640 x 480", flush=True)
    print(f"Measured Frames:    30 per test", flush=True)
    print("-" * 60, flush=True)

    print("TEST A — DEFAULT INPUT SIZE", flush=True)
    print(f"Input Size:             {res_a['imgsz']}", flush=True)
    print(f"Average Inference:      {res_a['avg_inference_ms']} ms", flush=True)
    print(f"Approx FPS:             {res_a['approx_fps']} FPS", flush=True)
    print(f"Pipeline FPS:           {res_a['pipeline_fps']} FPS", flush=True)
    print(f"Frames With Detection:  {res_a['frames_with_detections']}/{res_a['measured_frames']} ({res_a['total_detections']} total objects)", flush=True)
    print("-" * 60, flush=True)

    print("TEST B — YOLO INPUT SIZE 320", flush=True)
    print(f"Input Size:             {res_b['imgsz']}", flush=True)
    print(f"Average Inference:      {res_b['avg_inference_ms']} ms", flush=True)
    print(f"Approx FPS:             {res_b['approx_fps']} FPS", flush=True)
    print(f"Pipeline FPS:           {res_b['pipeline_fps']} FPS", flush=True)
    print(f"Frames With Detection:  {res_b['frames_with_detections']}/{res_b['measured_frames']} ({res_b['total_detections']} total objects)", flush=True)
    print("=" * 60, flush=True)

    print("COMPARISON", flush=True)
    print("=" * 60, flush=True)
    print(f"Inference Latency:      {inf_a} ms (default) -> {inf_b} ms (imgsz=320)", flush=True)
    print(f"Inference improvement:  {inf_pct_improvement:+.1f}% ({abs(inf_diff):.1f} ms faster per frame)", flush=True)
    print(f"Throughput FPS:         {fps_a} FPS -> {fps_b} FPS", flush=True)
    print(f"FPS improvement:        {fps_pct_improvement:+.1f}% (+{fps_diff:.1f} FPS)", flush=True)
    print("-" * 60, flush=True)

    if inf_b < inf_a:
        speedup = inf_a / inf_b if inf_b > 0 else 1.0
        print(f"RESULT:\nConfiguration B (imgsz=320) is significantly faster ({speedup:.2f}x speedup) on {device_name}.", flush=True)
    else:
        print(f"RESULT:\nConfiguration A (default) performed faster or comparably on {device_name}.", flush=True)
    print("=" * 60, flush=True)

if __name__ == "__main__":
    main()
