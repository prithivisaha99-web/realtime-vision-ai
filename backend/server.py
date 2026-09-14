import os
import sys
import time
import io
import base64
from pathlib import Path
from typing import List, Optional

import cv2
import numpy as np
import torch
from fastapi import FastAPI, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO

# Initialize FastAPI App
app = FastAPI(
    title="Real-Time YOLOv8 + ByteTrack Vision AI Backend",
    description="High-performance YOLOv8 detection & ByteTrack tracking backend for Real-Time Object Detection & Tracking",
    version="1.1.0",
)

# Enable CORS for frontend dashboard (Vite on localhost:5173 / all origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Path to YOLO model
SCRIPT_DIR = Path(__file__).resolve().parent
MODEL_PATH = SCRIPT_DIR / "yolov8n.pt"

print(f"[BACKEND] Initializing YOLO model from: {MODEL_PATH}")
if not MODEL_PATH.exists():
    raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")

# Load YOLO model
model = YOLO(str(MODEL_PATH))
print(f"[BACKEND] YOLOv8n loaded successfully. Device: {'cuda' if torch.cuda.is_available() else 'cpu'}")

# Warm up model and ByteTrack with a blank frame
_dummy_img = np.zeros((240, 320, 3), dtype=np.uint8)
_ = model.track(source=_dummy_img, persist=True, tracker="bytetrack.yaml", imgsz=320, verbose=False)
print("[BACKEND] Model & ByteTrack warmup complete.")

# COCO Vehicle classes mapping
VEHICLE_CLASSES = {
    'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'bicycle'
}

def map_category(class_name: str) -> str:
    """Map YOLO COCO class name to project categories."""
    name_lower = class_name.lower()
    if name_lower == 'person':
        return 'person'
    elif name_lower in VEHICLE_CLASSES:
        return 'vehicle'
    else:
        return 'object'

def process_image_and_track(
    img_bgr: np.ndarray, 
    conf_threshold: float = 0.25,
    iou_threshold: float = 0.45
):
    """
    Run YOLOv8 detection + ByteTrack tracking across consecutive frames.
    Maintains persistent object identities (track_id).
    """
    height, width = img_bgr.shape[:2]
    
    start_time = time.perf_counter()
    results = model.track(
        source=img_bgr, 
        persist=True, 
        tracker="bytetrack.yaml",
        imgsz=320,
        conf=conf_threshold, 
        iou=iou_threshold, 
        verbose=False
    )
    total_elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
    
    # Extract speed breakdown
    speed = results[0].speed if len(results) > 0 and hasattr(results[0], 'speed') else {}
    inference_time_ms = round(speed.get('inference', total_elapsed_ms * 0.8), 2)
    tracking_time_ms = round(speed.get('postprocess', total_elapsed_ms * 0.2), 2)
    
    detections = []
    
    if len(results) > 0 and results[0].boxes is not None:
        boxes = results[0].boxes
        for idx, box in enumerate(boxes):
            # Coordinates in pixels
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            conf = float(box.conf[0].item())
            cls_id = int(box.cls[0].item())
            class_name = model.names.get(cls_id, f"class_{cls_id}")
            category = map_category(class_name)
            
            # Extract real persistent track_id from ByteTrack
            track_id = None
            if box.id is not None:
                track_id = int(box.id[0].item())
            
            # Clamp and normalize coordinates to percentages (0 - 100%)
            norm_x = max(0.0, min(100.0, (x1 / width) * 100.0))
            norm_y = max(0.0, min(100.0, (y1 / height) * 100.0))
            norm_w = max(0.0, min(100.0 - norm_x, ((x2 - x1) / width) * 100.0))
            norm_h = max(0.0, min(100.0 - norm_y, ((y2 - y1) / height) * 100.0))
            
            detections.append({
                "id": f"track-{track_id}" if track_id is not None else f"det-{idx + 1}",
                "track_id": track_id,
                "class_id": cls_id,
                "class_name": class_name,
                "category": category,
                "confidence": round(conf, 4),
                "box": {
                    "x1": round(x1, 1),
                    "y1": round(y1, 1),
                    "x2": round(x2, 1),
                    "y2": round(y2, 1),
                },
                "normalized_box": {
                    "x": round(norm_x, 2),
                    "y": round(norm_y, 2),
                    "width": round(norm_w, 2),
                    "height": round(norm_h, 2),
                }
            })
            
    return {
        "status": "success",
        "detections": detections,
        "count": len(detections),
        "inference_ms": inference_time_ms,
        "tracking_ms": tracking_time_ms,
        "image_size": {
            "width": width,
            "height": height
        },
        "timestamp": time.time()
    }

class Base64DetectRequest(BaseModel):
    image: str  # Base64 data URL or raw base64 string
    confidence: Optional[float] = 0.35
    iou: Optional[float] = 0.45

@app.get("/")
@app.get("/health")
@app.get("/status")
def health_check():
    """Health check endpoint to verify backend is connected and ready."""
    return {
        "status": "online",
        "model": "YOLOv8n",
        "tracker": "ByteTrack",
        "classes_count": len(model.names),
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "server_time": time.time()
    }

@app.post("/detect")
async def detect_frame_multipart(
    file: Optional[UploadFile] = File(None),
    confidence: float = Form(0.35),
    iou: float = Form(0.45),
):
    """
    HTTP POST /detect endpoint accepting multipart/form-data JPEG/PNG frame.
    Runs YOLOv8n + ByteTrack and returns real track_id per object.
    """
    if file is None:
        return {"status": "error", "message": "No image file provided", "detections": []}
        
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img_bgr is None:
        return {"status": "error", "message": "Failed to decode image", "detections": []}
        
    return process_image_and_track(img_bgr, conf_threshold=confidence, iou_threshold=iou)

@app.post("/detect/base64")
async def detect_frame_base64(req: Base64DetectRequest):
    """
    HTTP POST /detect/base64 endpoint accepting Base64 image string.
    Runs YOLOv8n + ByteTrack and returns real track_id per object.
    """
    try:
        raw_b64 = req.image
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
            
        img_bytes = base64.b64decode(raw_b64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img_bgr is None:
            return {"status": "error", "message": "Failed to decode base64 image", "detections": []}
            
        return process_image_and_track(
            img_bgr, 
            conf_threshold=req.confidence or 0.35, 
            iou_threshold=req.iou or 0.45
        )
    except Exception as e:
        return {"status": "error", "message": str(e), "detections": []}

@app.websocket("/ws/vision")
@app.websocket("/ws/detect")
async def websocket_detection_endpoint(websocket: WebSocket):
    """
    Real-Time WebSocket detection stream with ByteTrack tracking.
    """
    await websocket.accept()
    print("[BACKEND WS] Client connected to detection & tracking stream.")
    
    try:
        while True:
            message = await websocket.receive()
            
            img_bgr = None
            conf_thresh = 0.35
            
            if "bytes" in message and message["bytes"]:
                nparr = np.frombuffer(message["bytes"], np.uint8)
                img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            elif "text" in message and message["text"]:
                text_data = message["text"]
                if text_data.startswith("{") and "image" in text_data:
                    import json
                    parsed = json.loads(text_data)
                    raw_b64 = parsed.get("image", "")
                    conf_thresh = parsed.get("confidence", 0.35)
                else:
                    raw_b64 = text_data
                
                if "," in raw_b64:
                    raw_b64 = raw_b64.split(",", 1)[1]
                img_bytes = base64.b64decode(raw_b64)
                nparr = np.frombuffer(img_bytes, np.uint8)
                img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
            if img_bgr is not None:
                result = process_image_and_track(img_bgr, conf_threshold=conf_thresh)
                await websocket.send_json(result)
            else:
                await websocket.send_json({
                    "status": "error", 
                    "message": "Invalid frame data", 
                    "detections": []
                })
                
    except WebSocketDisconnect:
        print("[BACKEND WS] Client disconnected.")
    except Exception as e:
        print(f"[BACKEND WS] Error: {e}")
        try:
            await websocket.close()
        except Exception:
            pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
