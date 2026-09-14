import os
import sys
import time
import urllib.request
from PIL import Image

def download_sample_image(image_path: str, url: str) -> None:
    """Download the single sample test image if not already present locally."""
    if os.path.exists(image_path) and os.path.getsize(image_path) > 0:
        print(f"  --> Test image already exists: '{image_path}'")
        return

    print(f"  --> Downloading sample test image from {url}...")
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            with open(image_path, 'wb') as out_file:
                out_file.write(response.read())
        print(f"  --> Successfully saved image to '{image_path}' ({os.path.getsize(image_path)} bytes)")
    except Exception as e:
        print(f"  [ERROR] Failed to download test image: {e}")
        sys.exit(1)

def main():
    print("=" * 60)
    print("STEP 4: YOLOv8n SINGLE IMAGE INFERENCE TEST")
    print("=" * 60)
    print(f"Python: {sys.version.split()[0]} ({sys.executable})")

    # 1. Setup paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, "test_data")
    output_dir = os.path.join(base_dir, "test_output")
    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(output_dir, exist_ok=True)

    image_path = os.path.join(data_dir, "bus.jpg")
    output_path = os.path.join(output_dir, "yolo_result.jpg")
    model_path = os.path.join(base_dir, "yolov8n.pt")
    image_url = "https://ultralytics.com/images/bus.jpg"

    # 2. Acquire sample test image
    print("\n[1/4] Preparing sample test image...")
    download_sample_image(image_path, image_url)
    
    try:
        with Image.open(image_path) as img:
            img_width, img_height = img.size
            img_format = img.format
        print(f"  --> Image format: {img_format}, Resolution: {img_width} x {img_height}")
    except Exception as e:
        print(f"  [ERROR] Cannot read test image: {e}")
        sys.exit(1)

    # 3. Load YOLOv8n model
    print(f"\n[2/4] Loading YOLO model from '{model_path}'...")
    try:
        from ultralytics import YOLO
        import ultralytics
        print(f"  --> Ultralytics Version: {ultralytics.__version__}")
        model = YOLO(model_path)
    except Exception as e:
        print(f"  [ERROR] Failed to load YOLO model: {e}")
        sys.exit(1)

    # 4. Run real inference on the single image
    print(f"\n[3/4] Running YOLOv8n inference on '{image_path}'...")
    start_time = time.time()
    try:
        results = model.predict(source=image_path, conf=0.25, verbose=False)
        inference_duration_ms = (time.time() - start_time) * 1000
    except Exception as e:
        print(f"  [ERROR] Inference failed: {e}")
        sys.exit(1)

    if not results or len(results) == 0:
        print("  [ERROR] Inference returned no result structure.")
        sys.exit(1)

    result = results[0]
    boxes = result.boxes
    num_detections = len(boxes) if boxes is not None else 0

    if num_detections == 0:
        print("  [ERROR] Inference completed but 0 objects were detected in the test image.")
        sys.exit(1)

    print(f"  --> Inference completed in {inference_duration_ms:.2f} ms")
    print(f"  --> Total Detections: {num_detections}")

    # 5. Extract and print detection details
    print("\n" + "-" * 60)
    print(f"Image: {os.path.basename(image_path)}")
    print(f"Image Size: {img_width} x {img_height}")
    print("\nDetections:")

    for idx, box in enumerate(boxes):
        cls_id = int(box.cls[0].item())
        cls_name = model.names.get(cls_id, f"class_{cls_id}")
        confidence = float(box.conf[0].item())
        xyxy = [round(float(coord), 1) for coord in box.xyxy[0].tolist()]

        print(f"  [{idx + 1}] {cls_name:<10} | confidence: {confidence * 100:6.2f}% | box: [x1={xyxy[0]}, y1={xyxy[1]}, x2={xyxy[2]}, y2={xyxy[3]}]")

    print("-" * 60)

    # 6. Save real annotated output image
    print("\n[4/4] Saving annotated result image...")
    try:
        result.save(filename=output_path)
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            print(f"  --> Annotated image successfully saved to: '{output_path}' ({os.path.getsize(output_path)} bytes)")
        else:
            print(f"  [ERROR] Annotated file was not created properly at '{output_path}'.")
            sys.exit(1)
    except Exception as e:
        print(f"  [ERROR] Failed to save annotated output image: {e}")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("RESULT: SUCCESS - YOLOv8n produced real detections on the static test image.")
    print("=" * 60)

if __name__ == "__main__":
    main()
