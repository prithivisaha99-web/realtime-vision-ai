import os
import sys
import time
from pathlib import Path
import cv2
import requests

def main():
    backend_url = "http://localhost:8000"
    endpoint = f"{backend_url}/detect"
    
    # 1. Resolve path to bus.jpg
    base_dir = Path(__file__).resolve().parent
    image_path = base_dir / "test_data" / "bus.jpg"
    
    if not image_path.exists():
        print(f"[ERROR] Input test image not found at {image_path}")
        sys.exit(1)
        
    # 2. Read image once using OpenCV
    img_bgr = cv2.imread(str(image_path))
    if img_bgr is None:
        print(f"[ERROR] Failed to load image {image_path} with OpenCV")
        sys.exit(1)
        
    height, width = img_bgr.shape[:2]
    
    # 3. Encode image to JPEG once
    success, encoded_img = cv2.imencode('.jpg', img_bgr)
    if not success:
        print("[ERROR] Failed to encode image to JPEG")
        sys.exit(1)
        
    jpeg_bytes = encoded_img.tobytes()
    
    print("=" * 60)
    print("STEP 14: ISOLATED API LATENCY TEST")
    print("=" * 60)
    print()
    print("Backend:")
    print(f"    {backend_url}")
    print()
    print("Endpoint:")
    print("    POST /detect")
    print()
    print("Input:")
    print("    bus.jpg")
    print()
    print("Image Size:")
    print(f"    {width} x {height}")
    print()
    print("Requests:")
    print("    10 per test")
    print()
    
    # Check health first
    try:
        health_resp = requests.get(f"{backend_url}/health", timeout=5)
        if health_resp.status_code != 200:
            print(f"[ERROR] Backend health check failed with status code {health_resp.status_code}")
            sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Cannot connect to backend at {backend_url}: {e}")
        sys.exit(1)

    num_requests = 10
    
    # ------------------------------------------------------------
    # TEST A: Fresh HTTP session per request
    # ------------------------------------------------------------
    print("-" * 60)
    print("TEST A -- FRESH CONNECTION")
    print("-" * 60)
    print()
    
    test_a_results = []
    status_200_count_a = 0
    
    for i in range(1, num_requests + 1):
        files = {"file": ("bus.jpg", jpeg_bytes, "image/jpeg")}
        session = requests.Session()
        
        t_start = time.perf_counter()
        try:
            resp = session.post(endpoint, files=files, timeout=10)
            t_resp = time.perf_counter()
        except requests.exceptions.RequestException as e:
            print(f"[ERROR] Request {i} failed to connect or timed out: {e}")
            sys.exit(1)
        finally:
            session.close()
            
        if resp.status_code == 200:
            status_200_count_a += 1
        else:
            print(f"[ERROR] Request {i} returned status {resp.status_code}: {resp.text}")
            sys.exit(1)
            
        t_parse_start = time.perf_counter()
        try:
            data = resp.json()
        except Exception as e:
            print(f"[ERROR] Request {i} returned invalid JSON: {e}")
            sys.exit(1)
        t_parse_end = time.perf_counter()
        
        if "inference_ms" not in data or "tracking_ms" not in data:
            print(f"[ERROR] Request {i} missing required timing fields in response: {data.keys()}")
            sys.exit(1)
            
        total_req_time = (t_parse_end - t_start) * 1000.0
        http_time = (t_resp - t_start) * 1000.0
        parse_time = (t_parse_end - t_parse_start) * 1000.0
        inference_ms = float(data["inference_ms"])
        tracking_ms = float(data["tracking_ms"])
        client_overhead = total_req_time - inference_ms - tracking_ms
        
        test_a_results.append({
            "total_req_time": total_req_time,
            "http_time": http_time,
            "parse_time": parse_time,
            "inference_ms": inference_ms,
            "tracking_ms": tracking_ms,
            "client_overhead": client_overhead
        })
        
        print(f"Request {i}: {total_req_time:.2f} ms")
        
    avg_total_a = sum(r["total_req_time"] for r in test_a_results) / len(test_a_results)
    avg_http_a = sum(r["http_time"] for r in test_a_results) / len(test_a_results)
    avg_yolo_a = sum(r["inference_ms"] for r in test_a_results) / len(test_a_results)
    avg_track_a = sum(r["tracking_ms"] for r in test_a_results) / len(test_a_results)
    avg_overhead_a = sum(r["client_overhead"] for r in test_a_results) / len(test_a_results)
    
    print()
    print(f"Average HTTP Time: {avg_total_a:.2f} ms")
    print(f"Average YOLO Time: {avg_yolo_a:.2f} ms")
    print(f"Average ByteTrack Time: {avg_track_a:.2f} ms")
    print(f"Average Client Overhead: {avg_overhead_a:.2f} ms")
    print()
    print("HTTP Status:")
    print(f"    200: {status_200_count_a}/{num_requests}")
    print()

    # ------------------------------------------------------------
    # TEST B: Reused HTTP session
    # ------------------------------------------------------------
    print("-" * 60)
    print("TEST B -- REUSED CONNECTION")
    print("-" * 60)
    print()
    
    test_b_results = []
    status_200_count_b = 0
    reused_session = requests.Session()
    
    try:
        for i in range(1, num_requests + 1):
            files = {"file": ("bus.jpg", jpeg_bytes, "image/jpeg")}
            
            t_start = time.perf_counter()
            try:
                resp = reused_session.post(endpoint, files=files, timeout=10)
                t_resp = time.perf_counter()
            except requests.exceptions.RequestException as e:
                print(f"[ERROR] Request {i} failed to connect or timed out: {e}")
                sys.exit(1)
                
            if resp.status_code == 200:
                status_200_count_b += 1
            else:
                print(f"[ERROR] Request {i} returned status {resp.status_code}: {resp.text}")
                sys.exit(1)
                
            t_parse_start = time.perf_counter()
            try:
                data = resp.json()
            except Exception as e:
                print(f"[ERROR] Request {i} returned invalid JSON: {e}")
                sys.exit(1)
            t_parse_end = time.perf_counter()
            
            if "inference_ms" not in data or "tracking_ms" not in data:
                print(f"[ERROR] Request {i} missing required timing fields in response: {data.keys()}")
                sys.exit(1)
                
            total_req_time = (t_parse_end - t_start) * 1000.0
            http_time = (t_resp - t_start) * 1000.0
            parse_time = (t_parse_end - t_parse_start) * 1000.0
            inference_ms = float(data["inference_ms"])
            tracking_ms = float(data["tracking_ms"])
            client_overhead = total_req_time - inference_ms - tracking_ms
            
            test_b_results.append({
                "total_req_time": total_req_time,
                "http_time": http_time,
                "parse_time": parse_time,
                "inference_ms": inference_ms,
                "tracking_ms": tracking_ms,
                "client_overhead": client_overhead
            })
            
            print(f"Request {i}: {total_req_time:.2f} ms")
    finally:
        reused_session.close()
        
    avg_total_b = sum(r["total_req_time"] for r in test_b_results) / len(test_b_results)
    avg_http_b = sum(r["http_time"] for r in test_b_results) / len(test_b_results)
    avg_yolo_b = sum(r["inference_ms"] for r in test_b_results) / len(test_b_results)
    avg_track_b = sum(r["tracking_ms"] for r in test_b_results) / len(test_b_results)
    avg_overhead_b = sum(r["client_overhead"] for r in test_b_results) / len(test_b_results)
    
    print()
    print(f"Average HTTP Time: {avg_total_b:.2f} ms")
    print(f"Average YOLO Time: {avg_yolo_b:.2f} ms")
    print(f"Average ByteTrack Time: {avg_track_b:.2f} ms")
    print(f"Average Client Overhead: {avg_overhead_b:.2f} ms")
    print()
    print("HTTP Status:")
    print(f"    200: {status_200_count_b}/{num_requests}")
    print()

    # ------------------------------------------------------------
    # COMPARISON
    # ------------------------------------------------------------
    improvement_pct = ((avg_total_a - avg_total_b) / avg_total_a) * 100.0 if avg_total_a > 0 else 0.0
    
    print("=" * 60)
    print("COMPARISON")
    print("=" * 60)
    print()
    print("Fresh connection:")
    print(f"    {avg_total_a:.2f} ms")
    print()
    print("Reused connection:")
    print(f"    {avg_total_b:.2f} ms")
    print()
    print("Connection reuse improvement:")
    print(f"    {improvement_pct:.2f}%")
    print()

    # ------------------------------------------------------------
    # RESULT
    # ------------------------------------------------------------
    print("=" * 60)
    print("RESULT")
    print("=" * 60)
    print()
    
    if avg_overhead_a > 1000 and avg_overhead_b < 200:
        determination = (
            "A. The large ~2 second overhead observed in Step 13 was caused mainly by\n"
            "   HTTP connection setup/teardown (creating and tearing down fresh TCP/HTTP\n"
            "   connections and multipart allocations per request on localhost)."
        )
    elif avg_overhead_b > 1000:
        determination = (
            "B. The large ~2 second overhead is PRESENT EVEN WHEN CONNECTION IS REUSED,\n"
            "   indicating internal backend processing/serialization or ASGI middleware delay."
        )
    else:
        determination = (
            f"Measured Fresh Connection Overhead: {avg_overhead_a:.2f} ms\n"
            f"Measured Reused Connection Overhead: {avg_overhead_b:.2f} ms\n"
            f"Reused connection latency: {avg_total_b:.2f} ms vs Fresh: {avg_total_a:.2f} ms."
        )
        
    print(determination)
    print("=" * 60)

if __name__ == "__main__":
    main()
