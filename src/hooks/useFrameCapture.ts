import { useEffect, useRef, useCallback } from 'react';
import type { CapturedFrame, FrameCaptureConfig } from '../types/frame';

interface UseFrameCaptureResult {
  /** Reference to the most recently captured frame (avoids unnecessary re-renders) */
  latestFrameRef: React.RefObject<CapturedFrame | null>;
  /** Capture state */
  isCapturingRef: React.RefObject<boolean>;
}

/**
 * High-performance browser-native frame capture hook.
 * 
 * Extracts video frames from an HTMLVideoElement into an offscreen canvas
 * using an efficient requestAnimationFrame loop with configurable FPS throttling.
 * 
 * Key Characteristics:
 * - Zero visual DOM presence (internal offscreen canvas)
 * - Canvas context initialized with willReadFrequently: true for accelerated pixel readback
 * - Strict lifecycle management: only runs when active && video has data
 * - Automatic teardown on stop, failure, or component unmount (no memory leaks)
 */
export function useFrameCapture(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  isActive: boolean,
  config: FrameCaptureConfig = {}
): UseFrameCaptureResult {
  const { targetFps = 30, maxWidth, maxHeight, onFrame } = config;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const latestFrameRef = useRef<CapturedFrame | null>(null);
  const isCapturingRef = useRef<boolean>(false);
  const frameIdCounterRef = useRef<number>(0);
  const lastCaptureTimeRef = useRef<number>(0);

  // Keep callback reference updated without retriggering effect loop
  const onFrameRef = useRef(onFrame);
  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  // Clean up canvas and animation loop
  const stopCapture = useCallback(() => {
    if (animFrameIdRef.current !== null) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    isCapturingRef.current = false;
  }, []);

  useEffect(() => {
    if (!isActive) {
      stopCapture();
      return;
    }

    // Lazy initialization of offscreen canvas
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    if (!ctxRef.current && canvasRef.current) {
      ctxRef.current = canvasRef.current.getContext('2d', {
        willReadFrequently: true,
        alpha: false,
      });
    }

    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    isCapturingRef.current = true;
    lastCaptureTimeRef.current = performance.now();
    const frameIntervalMs = 1000 / Math.max(1, Math.min(60, targetFps));

    const captureLoop = (now: number) => {
      const video = videoRef.current;

      // Ensure video is available, playing, and has valid dimensions
      if (
        video &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        const elapsed = now - lastCaptureTimeRef.current;

        // FPS Throttle check
        if (elapsed >= frameIntervalMs) {
          lastCaptureTimeRef.current = now - (elapsed % frameIntervalMs);

          let destWidth = video.videoWidth;
          let destHeight = video.videoHeight;

          // Apply optional scale constraints while preserving aspect ratio
          if (maxWidth && destWidth > maxWidth) {
            const scale = maxWidth / destWidth;
            destWidth = maxWidth;
            destHeight = Math.round(destHeight * scale);
          }
          if (maxHeight && destHeight > maxHeight) {
            const scale = maxHeight / destHeight;
            destHeight = maxHeight;
            destWidth = Math.round(destWidth * scale);
          }

          // Only adjust canvas dimensions if size changed (avoids canvas reset overhead)
          if (canvas.width !== destWidth || canvas.height !== destHeight) {
            canvas.width = destWidth;
            canvas.height = destHeight;
          }

          // Draw current video frame to offscreen canvas
          ctx.drawImage(video, 0, 0, destWidth, destHeight);

          frameIdCounterRef.current += 1;
          const capturedFrame: CapturedFrame = {
            width: destWidth,
            height: destHeight,
            get data() {
              return ctx.getImageData(0, 0, destWidth, destHeight);
            },
            timestamp: now,
            frameId: frameIdCounterRef.current,
            canvas: canvas,
          };

          latestFrameRef.current = capturedFrame;

          if (onFrameRef.current) {
            try {
              onFrameRef.current(capturedFrame);
            } catch (err) {
              console.error('Error in onFrame callback:', err);
            }
          }
        }
      }

      // Continue capture loop while active
      animFrameIdRef.current = requestAnimationFrame(captureLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(captureLoop);

    return () => {
      stopCapture();
    };
  }, [isActive, targetFps, maxWidth, maxHeight, videoRef, stopCapture]);

  return {
    latestFrameRef,
    isCapturingRef,
  };
}
