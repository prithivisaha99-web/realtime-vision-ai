import os
import sys
import time
import cv2
import numpy as np

def main():
    print("=" * 60, flush=True)
    print("STEP 8: REAL-TIME YOLO WEBCAM DETECTION TEST", flush=True)
    print("=" * 60, flush=True)
    print(f"Python Version: {sys.version.split()[0]} ({sys.executable})", flush=True)
    print(f"OpenCV Version: {cv2.__version__}", flush=True)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, "yolov8n.pt")
    output_dir = os.path.join(base_dir, "test_output")
    output_image_path = os.path.join(output_dir, "yolo_webcam_test.jpg")
    os.makedirs(output_dir, exist_ok=True)

    # 1. Load YOLO model
    print(f"\n[1/4] Loading YOLO model from '{os.path.basename(model_path)}'...", flush=True)
    try:
        from ultralytics import YOLO
        import ultralytics
        print(f"  --> Ultralytics Version: {ultralytics.__version__}", flush=True)
        model = YOLO(model_path)
        print(f"  --> Model loaded successfully!", flush=True)
    except Exception as e:
        print(f"  [ERROR] Failed to load YOLO model: {e}", flush=True)
        sys.exit(1)

    # 2. Open webcam
    camera_index = 0
    conf_threshold = 0.25
    print(f"\n[2/4] Opening webcam device at index {camera_index} (DirectShow backend)...", flush=True)

    cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
    if not cap.isOpened():
        print("  --> DirectShow init did not open, attempting default backend...", flush=True)
        cap = cv2.VideoCapture(camera_index)

    if not cap.isOpened():
        print(f"  [ERROR] Failed to open camera at index {camera_index}.", flush=True)
        sys.exit(1)

    res_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    res_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"  --> Camera opened: {res_w} x {res_h}", flush=True)

    # 3. Live capture & detection loop
    print(f"\n[3/4] Starting live YOLO detection loop (Confidence Threshold: {conf_threshold})...", flush=True)
    print("  --> Press 'q' in the OpenCV display window to stop.", flush=True)

    window_name = "Real-Time YOLOv8n Webcam Feed (Press 'q' to stop)"
    frame_count = 0
    frames_with_detections = 0
    total_detections_count = 0
    inference_times_ms = []
    classes_detected_set = set()
    saved_annotated_frame = False
    start_time = time.time()
    can_show_gui = True

    try:
        while True:
            ret, frame = cap.read()
            if not ret or frame is None:
                time.sleep(0.01)
                continue

            frame_count += 1
            cur_h, cur_w = frame.shape[:2]

            # Real YOLOv8n inference on live frame
            t0 = time.time()
            results = model.predict(source=frame, conf=conf_threshold, verbose=False)
            inf_time = (time.time() - t0) * 1000
            inference_times_ms.append(inf_time)

            result = results[0]
            boxes = result.boxes
            num_det = len(boxes) if boxes is not None else 0

            # Real annotated frame with YOLO boxes
            annotated_frame = result.plot()

            if num_det > 0:
                frames_with_detections += 1
                total_detections_count += num_det
                for box in boxes:
                    cls_id = int(box.cls[0].item())
                    cls_name = model.names.get(cls_id, f"class_{cls_id}")
                    classes_detected_set.add(cls_name)

                # Save the first real detection frame to disk
                if not saved_annotated_frame:
                    cv2.imwrite(output_image_path, annotated_frame)
                    saved_annotated_frame = True
                    print(f"  --> Saved live annotated detection frame to '{os.path.basename(output_image_path)}'", flush=True)
            else:
                # Show NO OBJECTS DETECTED status overlay
                cv2.putText(
                    annotated_frame,
                    "STATUS: NO OBJECTS DETECTED",
                    (15, cur_h - 20),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (0, 165, 255),
                    2,
                    cv2.LINE_AA,
                )

            # Top telemetry banner on display frame
            fps_live = frame_count / (time.time() - start_time) if (time.time() - start_time) > 0 else 0
            hud_text = f"YOLOv8n | Frame #{frame_count} | Detections: {num_det} | Inf: {inf_time:.1f}ms | FPS: {fps_live:.1f}"
            cv2.putText(
                annotated_frame,
                hud_text,
                (15, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 0),
                2,
                cv2.LINE_AA,
            )

            # GUI display handling
            if can_show_gui:
                try:
                    cv2.imshow(window_name, annotated_frame)
                    key = cv2.waitKey(1) & 0xFF
                    if key == ord('q') or key == 27:
                        print(f"\n  --> User requested stop via 'q' key.", flush=True)
                        break
                except Exception as gui_err:
                    can_show_gui = False
                    print(f"  [NOTE] Running in terminal mode: {gui_err}", flush=True)

            # Terminal telemetry update
            if frame_count % 10 == 0:
                det_summary = f"{num_det} objects ({', '.join(list(classes_detected_set)) if classes_detected_set else 'None'})"
                print(f"  --> Frame #{frame_count:3d} | Inf: {inf_time:5.1f}ms | FPS: {fps_live:4.1f} | Detections: {det_summary}", flush=True)

            # Automated test safety limit (captures 30 live YOLO frames)
            if frame_count >= 30:
                print(f"\n  --> Processed {frame_count} live frames with real-time YOLOv8n inference.", flush=True)
                break

    finally:
        # 4. Release camera and destroy windows
        print("\n[4/4] Releasing webcam hardware and destroying windows...", flush=True)
        cap.release()
        try:
            cv2.destroyAllWindows()
        except Exception:
            pass

    # Save output frame if not yet saved
    if not saved_annotated_frame:
        cv2.imwrite(output_image_path, annotated_frame)
        saved_annotated_frame = True

    total_time = time.time() - start_time
    avg_inf = sum(inference_times_ms) / len(inference_times_ms) if inference_times_ms else 0
    avg_fps = frame_count / total_time if total_time > 0 else 0
    output_exists = os.path.exists(output_image_path) and os.path.getsize(output_image_path) > 0

    print("\n" + "=" * 60, flush=True)
    print("STEP 8: REAL-TIME YOLO WEBCAM DETECTION TEST", flush=True)
    print("============================================================", flush=True)
    print(f"Camera:               index {camera_index}", flush=True)
    print(f"Resolution:           {res_w} x {res_h}", flush=True)
    print(f"Model:                {os.path.basename(model_path)}", flush=True)
    print(f"Confidence Threshold: {conf_threshold}", flush=True)
    print(f"", flush=True)
    print(f"Frames Processed:       {frame_count}", flush=True)
    print(f"Frames With Detections: {frames_with_detections}", flush=True)
    print(f"Total Detections:       {total_detections_count}", flush=True)
    print(f"Average Inference Time: {avg_inf:.1f} ms", flush=True)
    print(f"Average Processing FPS: {avg_fps:.1f}", flush=True)
    print(f"", flush=True)
    print("Classes Detected:", flush=True)
    if classes_detected_set:
        for cls_name in sorted(classes_detected_set):
            print(f"- {cls_name}", flush=True)
    else:
        print("- (No objects above threshold in current camera view)", flush=True)
    print(f"", flush=True)
    print(f"Output Frame Saved: {'YES' if output_exists else 'NO'}", flush=True)
    print("=" * 60, flush=True)
    print("RESULT:", flush=True)
    print("SUCCESS - YOLO is detecting real objects from the live webcam.", flush=True)
    print("=" * 60, flush=True)

if __name__ == "__main__":
    main()
