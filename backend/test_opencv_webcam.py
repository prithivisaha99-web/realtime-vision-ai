import os
import sys
import time
import cv2
import numpy as np

def main():
    print("=" * 60, flush=True)
    print("STEP 7: OPENCV PYTHON WEBCAM ACCESS TEST", flush=True)
    print("=" * 60, flush=True)
    print(f"Python Version: {sys.version.split()[0]} ({sys.executable})", flush=True)
    print(f"OpenCV Version: {cv2.__version__}", flush=True)

    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_output")
    output_image_path = os.path.join(output_dir, "python_webcam_test.jpg")
    os.makedirs(output_dir, exist_ok=True)

    camera_index = 0
    print(f"\n[1/4] Opening webcam device at index {camera_index} (DirectShow backend)...", flush=True)

    # Use DirectShow on Windows for instant, reliable device capture
    cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
    if not cap.isOpened():
        print("  --> DirectShow init did not open, attempting default backend...", flush=True)
        cap = cv2.VideoCapture(camera_index)

    if not cap.isOpened():
        print(f"  [ERROR] Failed to open webcam at index {camera_index}.", flush=True)
        sys.exit(1)

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)

    print(f"  --> Camera opened successfully!", flush=True)
    print(f"  --> Frame Width:  {width} px", flush=True)
    print(f"  --> Frame Height: {height} px", flush=True)
    print(f"  --> Hardware FPS: {fps if fps > 0 else 'Variable / N/A'}", flush=True)

    print("\n[2/4] Starting live frame capture loop...", flush=True)
    print("  --> Press 'q' in the OpenCV window to stop.", flush=True)

    window_name = "OpenCV Live Webcam Feed - Press 'q' to Stop"
    frame_count = 0
    saved_sample = False
    start_time = time.time()
    can_render_gui = True

    try:
        # Capture frames in a real-time loop
        while True:
            ret, frame = cap.read()
            if not ret or frame is None:
                print(f"  [WARNING] Dropped frame at index {frame_count + 1}", flush=True)
                time.sleep(0.01)
                continue

            frame_count += 1
            cur_h, cur_w = frame.shape[:2]

            # Save the first valid captured frame to disk
            if not saved_sample:
                write_ok = cv2.imwrite(output_image_path, frame)
                if write_ok and os.path.exists(output_image_path) and os.path.getsize(output_image_path) > 0:
                    saved_sample = True
                    print(f"  --> Real webcam frame saved to '{os.path.basename(output_image_path)}' ({os.path.getsize(output_image_path)} bytes)", flush=True)

            # Draw live status banner on display feed
            display_frame = frame.copy()
            cv2.putText(
                display_frame,
                f"LIVE WEBCAM | Frame: #{frame_count} | Size: {cur_w}x{cur_h} | Press 'q' to exit",
                (15, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 0),
                2,
                cv2.LINE_AA,
            )

            # Display feed in OpenCV window if GUI is available
            if can_render_gui:
                try:
                    cv2.imshow(window_name, display_frame)
                    key = cv2.waitKey(1) & 0xFF
                    if key == ord('q') or key == 27:  # 'q' or ESC
                        print(f"\n  --> User requested stop via 'q' key.", flush=True)
                        break
                except Exception as gui_err:
                    can_render_gui = False
                    print(f"  [NOTE] Running in terminal mode: {gui_err}", flush=True)

            # Report live progress every 10 frames
            if frame_count % 10 == 0:
                elapsed = time.time() - start_time
                current_fps = frame_count / elapsed if elapsed > 0 else 0
                print(f"  --> Live Captured: {frame_count} frames ({cur_w}x{cur_h}) @ {current_fps:.1f} FPS", flush=True)

            # Ensure at least 35 real frames are captured before automated completion
            if frame_count >= 35:
                print(f"\n  --> Successfully captured and verified {frame_count} consecutive live frames.", flush=True)
                break

    finally:
        # Release camera hardware and destroy GUI windows
        print("\n[3/4] Releasing camera hardware and destroying OpenCV windows...", flush=True)
        cap.release()
        try:
            cv2.destroyAllWindows()
        except Exception:
            pass

    total_time = time.time() - start_time
    avg_fps = frame_count / total_time if total_time > 0 else 0

    # Verify saved image file
    print("\n[4/4] Verifying saved webcam image on disk...", flush=True)
    if os.path.exists(output_image_path) and os.path.getsize(output_image_path) > 0:
        file_size = os.path.getsize(output_image_path)
        print(f"  --> Output image verified: '{output_image_path}' ({file_size} bytes)", flush=True)
    else:
        print(f"  [ERROR] Output image file was not found at '{output_image_path}'.", flush=True)
        sys.exit(1)

    print("\n" + "=" * 60, flush=True)
    print("STEP 7 TEST REPORT:", flush=True)
    print("=============================================================", flush=True)
    print(f"OpenCV Version:          {cv2.__version__}", flush=True)
    print(f"Camera Device Index:     {camera_index}", flush=True)
    print(f"Camera Resolution:       {width} x {height}", flush=True)
    print(f"Total Frames Captured:   {frame_count}", flush=True)
    print(f"Average Capture FPS:     {avg_fps:.1f}", flush=True)
    print(f"Output Frame Saved:      YES ('{os.path.basename(output_image_path)}')", flush=True)
    print("=" * 60, flush=True)
    print("RESULT: SUCCESS - Python OpenCV successfully opened the webcam and captured real frames.", flush=True)
    print("=" * 60, flush=True)

if __name__ == "__main__":
    main()
