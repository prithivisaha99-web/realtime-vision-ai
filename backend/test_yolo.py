import sys
import time

def main():
    print("=" * 60)
    print("STEP 3: YOLO MODEL LOADING TEST (NO INFERENCE)")
    print("=" * 60)
    print(f"Python Version: {sys.version.split()[0]} ({sys.executable})")

    # Step 1: Verify Ultralytics import
    print("\n[1/3] Importing Ultralytics YOLO module...")
    try:
        from ultralytics import YOLO
        import ultralytics
        print(f"  --> Ultralytics imported successfully (Version: {ultralytics.__version__})")
    except ImportError as e:
        print(f"  [ERROR] Failed to import ultralytics: {e}")
        sys.exit(1)

    # Step 2: Load YOLOv8n model
    model_name = "yolov8n.pt"
    print(f"\n[2/3] Loading model weights: '{model_name}'...")
    start_time = time.time()
    try:
        model = YOLO(model_name)
        load_duration = time.time() - start_time
        print(f"  --> Model '{model_name}' loaded successfully in {load_duration:.2f} seconds.")
    except Exception as e:
        print(f"  [ERROR] Failed to load model '{model_name}': {e}")
        sys.exit(1)

    # Step 3: Inspect model object metadata
    print("\n[3/3] Inspecting loaded YOLO model object...")
    try:
        task = getattr(model, "task", "detect")
        names = getattr(model, "names", {})
        num_classes = len(names) if names else 0
        device = getattr(model, "device", "cpu")

        print(f"  --> Task Mode:       {task.upper()}")
        print(f"  --> Number of Classes: {num_classes}")
        print(f"  --> Sample Classes:    {', '.join([f'{k}: {v}' for k, v in list(names.items())[:6]])} ...")
        print(f"  --> Target Device:     {device}")
        print(f"  --> Model Class:       {model.__class__.__name__}")
    except Exception as e:
        print(f"  [WARNING] Could not read all model metadata: {e}")

    print("\n" + "=" * 60)
    print("RESULT: SUCCESS - YOLOv8n Model is fully initialized and ready.")
    print("(Note: No webcam access, no OpenCV, and no inference performed in this step.)")
    print("=" * 60)

if __name__ == "__main__":
    main()
