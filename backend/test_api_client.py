import sys
import time
import requests
import json
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"
BUS_IMG = Path(__file__).resolve().parent / "test_data" / "bus.jpg"

def test_health():
    print("[TEST] Testing GET /health...")
    resp = requests.get(f"{BASE_URL}/health", timeout=5)
    print(f"Status: {resp.status_code}, Body: {resp.json()}")
    assert resp.status_code == 200
    assert resp.json()["status"] == "online"
    assert resp.json().get("tracker") == "ByteTrack"

def test_detect_tracking_persistence():
    print("\n[TEST] Testing POST /detect with ByteTrack tracking persistence across 5 consecutive frames...")
    
    track_ids_per_frame = []
    
    with open(BUS_IMG, "rb") as f:
        img_bytes = f.read()
        
    for frame_i in range(1, 6):
        files = {"file": ("frame.jpg", img_bytes, "image/jpeg")}
        resp = requests.post(f"{BASE_URL}/detect", files=files, timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        
        tids = [d.get("track_id") for d in data["detections"]]
        track_ids_per_frame.append(tids)
        print(f" Frame {frame_i}: {data['count']} detections (Inference: {data['inference_ms']}ms, Tracking: {data.get('tracking_ms', 0)}ms)")
        for d in data["detections"]:
            print(f"   - {d['class_name'].upper()} {d['confidence']*100:.1f}% | Track ID: {d.get('track_id')} @ Box: {d['normalized_box']}")
    
    # Verify track_id persistence across frames 2..5
    confirmed_tids = track_ids_per_frame[1]
    assert len(confirmed_tids) > 0, "Expected detections on bus image"
    assert all(tid is not None for tid in confirmed_tids), f"Expected real ByteTrack track_id, got {confirmed_tids}"
    
    print("\n[VERIFICATION] Confirmed Track IDs across consecutive frames:")
    for idx in range(1, len(track_ids_per_frame)):
        tids = track_ids_per_frame[idx]
        print(f" Frame {idx + 1}: Track IDs = {tids}")
        assert tids == confirmed_tids, f"Track IDs diverged on frame {idx + 1}: {tids} != {confirmed_tids}"
        
    print("\n[SUCCESS] ByteTrack persistent track_ids verified across consecutive frames!")

if __name__ == "__main__":
    try:
        test_health()
        test_detect_tracking_persistence()
        print("\n[SUCCESS] All API tracking tests passed successfully!")
    except Exception as e:
        print(f"\n[FAILED] Test failed: {e}")
        sys.exit(1)
