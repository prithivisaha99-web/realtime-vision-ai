import os
import sys

def main():
    print("=" * 60)
    print("STEP 5: OPENCV IMAGE PROCESSING TEST")
    print("=" * 60)

    # 1. Import OpenCV and verify version
    try:
        import cv2
        import numpy as np
    except ImportError as e:
        print(f"[ERROR] Failed to import OpenCV: {e}")
        sys.exit(1)

    opencv_version = cv2.__version__
    print(f"OpenCV Version: {opencv_version}")
    print(f"Python Version: {sys.version.split()[0]} ({sys.executable})")

    # 2. Setup and verify image paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(base_dir, "test_data", "bus.jpg")
    output_dir = os.path.join(base_dir, "test_output")
    output_path = os.path.join(output_dir, "opencv_test.jpg")
    os.makedirs(output_dir, exist_ok=True)

    if not os.path.exists(input_path):
        print(f"[ERROR] Input image '{input_path}' not found.")
        sys.exit(1)

    # 3. Load image with cv2.imread
    img = cv2.imread(input_path)
    if img is None or not isinstance(img, np.ndarray):
        print(f"[ERROR] cv2.imread failed to load '{input_path}'.")
        sys.exit(1)

    # 4. Extract image metadata
    height, width = img.shape[:2]
    channels = img.shape[2] if len(img.shape) > 2 else 1
    data_type = str(img.dtype)

    # 5. Access a real pixel
    # Sampling pixel at center coordinate (y, x)
    sample_y = height // 2
    sample_x = width // 2
    sample_pixel_bgr = img[sample_y, sample_x].tolist()

    # 6. Save copy of image with cv2.imwrite
    write_success = cv2.imwrite(output_path, img)
    if not write_success or not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
        print(f"[ERROR] cv2.imwrite failed to save output image to '{output_path}'.")
        sys.exit(1)

    output_size_bytes = os.path.getsize(output_path)

    # 7. Print formatted results
    print(f"Image Loaded: YES ('{os.path.basename(input_path)}')")
    print(f"Image Size: {width} x {height}")
    print(f"Channels: {channels} (BGR format)")
    print(f"Data Type: {data_type}")
    print(f"Sample Pixel (at y={sample_y}, x={sample_x}): BGR={sample_pixel_bgr}")
    print(f"Output Image Saved: YES ('{os.path.basename(output_path)}', {output_size_bytes} bytes)")
    print("\n" + "=" * 60)
    print("RESULT: SUCCESS - OpenCV image processing is working.")
    print("=" * 60)

if __name__ == "__main__":
    main()
