import os
import sys
import time

def main():
    print("=" * 60)
    print("STEP 6: YOLO + OPENCV INTEGRATION TEST")
    print("=" * 60)

    # 1. Import modules
    try:
        import cv2
        import numpy as np
        from ultralytics import YOLO
        import ultralytics
    except ImportError as e:
        print(f"[ERROR] Required module import failed: {e}")
        sys.exit(1)

    opencv_version = cv2.__version__
    ultralytics_version = ultralytics.__version__
    print(f"OpenCV Version:      {opencv_version}")
    print(f"Ultralytics Version: {ultralytics_version}")
    print(f"Python Version:      {sys.version.split()[0]} ({sys.executable})")

    # 2. File paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    input_image_path = os.path.join(base_dir, "test_data", "bus.jpg")
    output_dir = os.path.join(base_dir, "test_output")
    output_image_path = os.path.join(output_dir, "yolo_opencv_result.jpg")
    model_path = os.path.join(base_dir, "yolov8n.pt")
    os.makedirs(output_dir, exist_ok=True)

    if not os.path.exists(input_image_path):
        print(f"[ERROR] Input test image not found at: '{input_image_path}'")
        sys.exit(1)

    if not os.path.exists(model_path):
        print(f"[ERROR] Model weights file not found at: '{model_path}'")
        sys.exit(1)

    # 3. Load image using OpenCV
    print(f"\n[1/4] Loading input image via OpenCV (cv2.imread)...")
    cv_img = cv2.imread(input_image_path)
    if cv_img is None or not isinstance(cv_img, np.ndarray):
        print(f"[ERROR] cv2.imread failed to load image from '{input_image_path}'.")
        sys.exit(1)

    img_height, img_width = cv_img.shape[:2]
    channels = cv_img.shape[2] if len(cv_img.shape) > 2 else 1
    print(f"  --> Loaded successfully: {os.path.basename(input_image_path)} ({img_width} x {img_height}, {channels} channels)")

    # 4. Load YOLO model
    print(f"\n[2/4] Loading YOLO model from '{os.path.basename(model_path)}'...")
    try:
        model = YOLO(model_path)
        print(f"  --> Model loaded successfully (Task: {getattr(model, 'task', 'detect')})")
    except Exception as e:
        print(f"[ERROR] Failed to load YOLO model: {e}")
        sys.exit(1)

    # 5. Pass OpenCV numpy image directly into YOLOv8n inference
    print(f"\n[3/4] Running YOLOv8n inference directly on OpenCV ndarray...")
    start_time = time.time()
    try:
        results = model.predict(source=cv_img, conf=0.25, verbose=False)
        inference_time_ms = (time.time() - start_time) * 1000
    except Exception as e:
        print(f"[ERROR] YOLO inference failed on OpenCV image: {e}")
        sys.exit(1)

    if not results or len(results) == 0:
        print("[ERROR] Inference returned an empty result list.")
        sys.exit(1)

    result = results[0]
    boxes = result.boxes
    num_detections = len(boxes) if boxes is not None else 0

    if num_detections == 0:
        print("[ERROR] Inference succeeded but 0 objects were detected.")
        sys.exit(1)

    print(f"  --> Inference completed in {inference_time_ms:.2f} ms")
    print(f"  --> Detections extracted: {num_detections}")

    # 6. Extract real detection details
    print("\n" + "-" * 60)
    print(f"Input Image: {os.path.basename(input_image_path)}")
    print(f"Image Size:  {img_width} x {img_height}")
    print("\nDetections:")

    for idx, box in enumerate(boxes):
        cls_id = int(box.cls[0].item())
        cls_name = model.names.get(cls_id, f"class_{cls_id}")
        confidence = float(box.conf[0].item())
        xyxy = [round(float(c), 1) for c in box.xyxy[0].tolist()]
        print(f"  - {cls_name:<10} (ID: {cls_id:>2}) | confidence: {confidence * 100:6.2f}% | box: [x1={xyxy[0]}, y1={xyxy[1]}, x2={xyxy[2]}, y2={xyxy[3]}]")

    print("-" * 60)
    print(f"Total Detections: {num_detections}")

    # 7. Annotate and save using OpenCV
    print(f"\n[4/4] Generating annotated image and saving via cv2.imwrite...")
    try:
        # result.plot() returns the annotated BGR image as a numpy ndarray
        annotated_bgr = result.plot()
        if annotated_bgr is None or not isinstance(annotated_bgr, np.ndarray):
            print("[ERROR] result.plot() failed to generate an annotated image array.")
            sys.exit(1)

        write_ok = cv2.imwrite(output_image_path, annotated_bgr)
        if not write_ok or not os.path.exists(output_image_path) or os.path.getsize(output_image_path) == 0:
            print(f"[ERROR] cv2.imwrite failed to write output to '{output_image_path}'.")
            sys.exit(1)

        output_size = os.path.getsize(output_image_path)
        print(f"  --> Output saved: '{os.path.basename(output_image_path)}' ({output_size} bytes)")
    except Exception as e:
        print(f"[ERROR] Failed to generate/save annotated image: {e}")
        sys.exit(1)

    print(f"\nAnnotated Output: YES")
    print("\n" + "=" * 60)
    print("RESULT: SUCCESS - YOLO and OpenCV integration is working.")
    print("=" * 60)

if __name__ == "__main__":
    main()
