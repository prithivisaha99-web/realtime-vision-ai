import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDetection } from '../../context/DetectionContext';
import { DetectionOverlay } from './DetectionOverlay';
import { soundEffects } from '../../utils/soundEffects';
import { useFrameCapture } from '../../hooks/useFrameCapture';
import { detectFrameBlob } from '../../services/yoloService';
import type { CapturedFrame } from '../../types/frame';
import { 
  Camera, 
  Maximize2, 
  Radio, 
  Scan, 
  Crosshair, 
  AlertCircle, 
  Loader2, 
  X,
  Server,
  Activity
} from 'lucide-react';

/**
 * Lifecycle states for the browser webcam feed.
 */
const CameraState = {
  Idle: 'idle',
  Loading: 'loading',
  Active: 'active',
  Denied: 'denied',
  Unavailable: 'unavailable',
  Stopped: 'stopped',
} as const;

type CameraState = (typeof CameraState)[keyof typeof CameraState];

interface CameraViewportProps {
  onFullscreenToggle: () => void;
}

export const CameraViewport: React.FC<CameraViewportProps> = ({ onFullscreenToggle }) => {
  const { 
    objects, 
    settings, 
    selectedTrackId, 
    setSelectedTrackId, 
    cameraActive, 
    isActive,
    stats,
    activeFilter,
    videoSource,
    setVideoSource,
    backendConnected,
    setRealDetections,
  } = useDetection();

  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [cameraState, setCameraState] = useState<CameraState>(CameraState.Idle);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  /** Holds the live MediaStream so it can always be released, even mid-request. */
  const streamRef = useRef<MediaStream | null>(null);
  /** Guards against state updates / leaked tracks after the component unmounts. */
  const isMountedRef = useRef<boolean>(true);
  /** Prevents frame queue build-up during YOLO inference */
  const isInferringRef = useRef<boolean>(false);

  // Temporary frame capture debug telemetry state
  const isCaptureActive = isWebcamActive && cameraActive;
  const [frameDebugInfo, setFrameDebugInfo] = useState<{
    frameId: number;
    width: number;
    height: number;
    lastCaptureTime: number;
  }>({
    frameId: 0,
    width: 0,
    height: 0,
    lastCaptureTime: 0,
  });

  const handleFrameCaptured = useCallback((frame: CapturedFrame) => {
    setFrameDebugInfo({
      frameId: frame.frameId,
      width: frame.width,
      height: frame.height,
      lastCaptureTime: frame.timestamp,
    });

    // Real-Time YOLO Inference on live captured frame
    if (isCaptureActive && isActive && frame.canvas && !isInferringRef.current) {
      isInferringRef.current = true;
      frame.canvas.toBlob(
        async (blob) => {
          if (blob && isMountedRef.current && isCaptureActive && isActive) {
            try {
              const res = await detectFrameBlob(
                blob, 
                settings.confidenceThreshold, 
                settings.iouThreshold
              );
              if (isMountedRef.current && isCaptureActive && isActive) {
                if (res && res.status === 'success') {
                  setRealDetections(res.detections, res.inference_ms, res.tracking_ms);
                } else if (res && res.detections) {
                  setRealDetections(res.detections, res.inference_ms, res.tracking_ms);
                }
              }
            } catch (err) {
              console.warn('[CameraViewport] Detection request failed:', err);
            } finally {
              isInferringRef.current = false;
            }
          } else {
            isInferringRef.current = false;
          }
        },
        'image/jpeg',
        0.85
      );
    }
  }, [isCaptureActive, isActive, settings.confidenceThreshold, settings.iouThreshold, setRealDetections]);

  // Dedicated Frame Capture Layer
  useFrameCapture(videoRef, isCaptureActive, {
    targetFps: 30,
    onFrame: handleFrameCaptured,
  });

  /**
   * Release every MediaStreamTrack held by this viewport.
   */
  const releaseStream = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  /**
   * Request the browser webcam and attach live stream.
   */
  const startWebcam = useCallback(async () => {
    try {
      setWebcamError(null);
      setCameraState(CameraState.Loading);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {
          /* Autoplay rejection is non-fatal for a muted, playsInline feed. */
        });
      }

      setIsWebcamActive(true);
      setCameraState(CameraState.Active);
      setVideoSource('webcam');
    } catch (err: unknown) {
      console.warn('Webcam permission not granted or camera not available:', err);

      const reason = err instanceof Error ? err.message : String(err);

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraState(CameraState.Denied);
          setWebcamError('Camera permission denied. Click "Camera" to request access.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraState(CameraState.Unavailable);
          setWebcamError('No camera found on this device.');
        } else {
          setCameraState(CameraState.Unavailable);
          setWebcamError('Camera unavailable: ' + reason);
        }
      } else {
        setCameraState(CameraState.Unavailable);
        setWebcamError('Camera error: ' + reason);
      }
    }
  }, [setVideoSource]);

  /**
   * Stop the live webcam feed and clear detections.
   */
  const stopWebcam = useCallback(() => {
    releaseStream();
    setIsWebcamActive(false);
    setCameraState(CameraState.Stopped);
    setVideoSource('mock-cyber');
    setRealDetections([]);
  }, [releaseStream, setVideoSource, setRealDetections]);

  /** Toggle handler */
  const toggleWebcam = useCallback(() => {
    soundEffects.playClick();
    if (isWebcamActive) {
      stopWebcam();
    } else {
      void startWebcam();
    }
  }, [isWebcamActive, startWebcam, stopWebcam]);

  // Track mount status and cleanup on unmount.
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      releaseStream();
    };
  }, [releaseStream]);

  // When inactive, clear detections
  useEffect(() => {
    if (!isActive) {
      setRealDetections([]);
    }
  }, [isActive, setRealDetections]);

  return (
    <div className="relative w-full h-full flex flex-col glass-panel-elevated rounded-2xl overflow-hidden border border-cyan-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.8)]">
      {/* 3D Corner Accent Brackets */}
      <div className="corner-bracket-tl" />
      <div className="corner-bracket-tr" />
      <div className="corner-bracket-bl" />
      <div className="corner-bracket-br" />

      {/* Top Viewport Telemetry Header */}
      <div className="px-5 py-2.5 bg-slate-950/70 border-b border-cyan-500/20 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-mono text-xs">
            <Scan className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>OPTICAL MATRIX HUD</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>RES: {frameDebugInfo.width > 0 ? `${frameDebugInfo.width}×${frameDebugInfo.height}` : stats.resolution}</span>
            <span>•</span>
            <span className={backendConnected ? 'text-emerald-400' : 'text-amber-400'}>
              YOLO: {backendConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
        </div>

        {/* Viewport Source Selectors */}
        <div className="flex items-center gap-2">
          {/* Feed Source Mode Pills */}
          <div className="flex items-center bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <button
              onClick={() => {
                soundEffects.playClick();
                setWebcamError(null);
                releaseStream();
                setIsWebcamActive(false);
                setCameraState(CameraState.Idle);
                setVideoSource('mock-cyber');
                setRealDetections([]);
              }}
              className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                videoSource === 'mock-cyber'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              STANDBY
            </button>
            <button
              onClick={toggleWebcam}
              disabled={cameraState === CameraState.Loading}
              title={isWebcamActive ? 'Stop live webcam feed' : 'Start live webcam feed'}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-all cursor-pointer ${
                isWebcamActive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              } ${cameraState === CameraState.Loading ? 'opacity-60 cursor-wait' : ''}`}
            >
              {cameraState === CameraState.Loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Camera className="w-3 h-3" />
              )}
              <span>{isWebcamActive ? 'STOP CAM' : 'LIVE CAM'}</span>
            </button>
          </div>

          {/* Fullscreen icon */}
          <button
            onClick={() => {
              soundEffects.playClick();
              onFullscreenToggle();
            }}
            className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 cursor-pointer transition-colors"
            title="Expand Viewport"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Visual Display Stage */}
      <div className="relative flex-1 bg-[#02050e] overflow-hidden flex items-center justify-center min-h-[380px] lg:min-h-[460px]">
        {/* Animated Laser Scanning Line */}
        {cameraActive && <div className="laser-scanner z-20" />}

        {/* Scanline CRT overlay */}
        <div className="absolute inset-0 scanlines z-10 pointer-events-none" />

        {/* TELEMETRY & FRAME CAPTURE DEBUG INDICATOR */}
        <div className="absolute top-3 right-3 z-35 px-4 py-3 rounded-xl bg-slate-950/90 border border-cyan-400/80 shadow-[0_0_25px_rgba(0,243,255,0.35)] backdrop-blur-md font-mono text-xs text-slate-200 pointer-events-none select-none">
          <div className="flex items-center gap-2 pb-2 mb-2 border-b border-cyan-500/30">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isCaptureActive && frameDebugInfo.frameId > 0
                  ? 'bg-emerald-400 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <span className="font-orbitron font-bold text-[11px] tracking-wider text-cyan-300">
              FRAME CAPTURE: {isCaptureActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between gap-4">
              <span className="text-slate-400 font-rajdhani font-semibold">FRAME ID:</span>
              <span className="font-mono font-bold text-white text-glow-cyan">
                {isCaptureActive && frameDebugInfo.frameId > 0 ? frameDebugInfo.frameId : '—'}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400 font-rajdhani font-semibold">CAPTURE SIZE:</span>
              <span className="font-mono text-cyan-200">
                {isCaptureActive && frameDebugInfo.width > 0
                  ? `${frameDebugInfo.width} × ${frameDebugInfo.height}`
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400 font-rajdhani font-semibold">LAST CAPTURE:</span>
              <span className="font-mono text-emerald-300">
                {isCaptureActive && frameDebugInfo.lastCaptureTime > 0
                  ? `${frameDebugInfo.lastCaptureTime.toFixed(1)} ms`
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between gap-4 pt-1 border-t border-slate-800">
              <span className="text-slate-400 font-rajdhani font-semibold">YOLO BACKEND:</span>
              <span className={`font-mono font-bold ${backendConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
                {backendConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400 font-rajdhani font-semibold">REAL DETECTIONS:</span>
              <span className="font-mono font-bold text-cyan-300">
                {objects.length} OBJECT{objects.length === 1 ? '' : 'S'}
              </span>
            </div>
          </div>
        </div>

        {/* Real Webcam Feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover z-0 ${isWebcamActive ? 'block' : 'hidden'}`}
        />

        {/* Camera Acquisition Overlay */}
        {cameraState === CameraState.Loading && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-40">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
            <span className="font-orbitron text-sm text-cyan-300 tracking-wider">
              ACQUIRING CAMERA FEED
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              Awaiting browser permission…
            </span>
          </div>
        )}

        {/* Futuristic Standby Cyber Matrix HUD */}
        {!isWebcamActive && (
          <div className="relative w-full h-full bg-gradient-to-b from-[#060b19] via-[#040814] to-[#020409] flex items-center justify-center overflow-hidden">
            <div 
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `
                  radial-gradient(circle at 50% 50%, rgba(0, 243, 255, 0.2) 0%, transparent 70%),
                  linear-gradient(to right, rgba(0, 243, 255, 0.1) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(0, 243, 255, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: '100% 100%, 40px 40px, 40px 40px',
              }}
            />

            {/* Standby Central HUD Info */}
            <div className="flex flex-col items-center justify-center z-10 text-center px-6">
              <div className="relative w-20 h-20 rounded-2xl bg-cyan-950/40 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_30px_rgba(0,243,255,0.25)] mb-4">
                <Crosshair className="w-10 h-10 text-cyan-400 animate-pulse-slow" />
                <div className="corner-bracket-tl !w-2 !h-2" />
                <div className="corner-bracket-tr !w-2 !h-2" />
                <div className="corner-bracket-bl !w-2 !h-2" />
                <div className="corner-bracket-br !w-2 !h-2" />
              </div>
              <div className="font-orbitron font-bold text-base text-slate-200 tracking-wider">
                OPTICAL VISION CORE READY
              </div>
              <div className="text-xs font-mono text-cyan-300/70 mt-1 max-w-sm">
                Click <span className="text-cyan-300 font-bold">"LIVE CAM"</span> to stream webcam frames to YOLOv8n inference engine
              </div>

              <div className="flex items-center gap-3 mt-4 text-[11px] font-mono">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-cyan-500/30 text-slate-300">
                  <Server className="w-3.5 h-3.5 text-cyan-400" />
                  <span>BACKEND: {backendConnected ? 'ONLINE' : 'CONNECTING...'}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-purple-500/30 text-slate-300">
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                  <span>MODEL: YOLOv8n</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AR Computer-Vision Bounding Boxes Overlay for REAL Detections */}
        {cameraActive && (
          <DetectionOverlay
            objects={objects}
            settings={settings}
            selectedTrackId={selectedTrackId}
            onSelectTrack={setSelectedTrackId}
            activeFilter={activeFilter}
          />
        )}

        {/* Camera Inactive Notification Screen */}
        {!cameraActive && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center z-30">
            <Radio className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
            <span className="font-orbitron font-semibold text-lg text-slate-400">
              VIDEO FEED SUSPENDED
            </span>
            <span className="font-mono text-xs text-slate-600 mt-1">
              CLICK 'CAMERA' OR 'START DETECTION' TO RESUME
            </span>
          </div>
        )}

        {/* Camera Status Toast */}
        {webcamError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-amber-950/90 border border-amber-500/60 rounded-xl text-amber-200 text-xs font-mono flex items-center gap-2 z-40 shadow-xl backdrop-blur-md max-w-[90%]">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{webcamError}</span>
            <button
              type="button"
              onClick={() => setWebcamError(null)}
              className="ml-1 p-0.5 rounded hover:bg-amber-500/20 text-amber-300 hover:text-amber-100 cursor-pointer transition-colors"
              title="Dismiss"
              aria-label="Dismiss camera warning"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Viewport Bottom Status Bar */}
      <div className="px-5 py-2 bg-slate-950/80 border-t border-cyan-500/20 flex items-center justify-between text-[11px] font-mono text-slate-400 z-30">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-cyan-300">
            <span className={`w-1.5 h-1.5 rounded-full ${isCaptureActive ? 'bg-cyan-400 animate-ping' : 'bg-slate-500'}`} />
            DETECTION: {isCaptureActive ? 'LIVE' : 'STANDBY'}
          </span>
          <span className="hidden md:inline">INFERENCE: {stats.inferenceTimeMs}ms</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-purple-300">OBJECTS: {objects.length}</span>
          <span className="text-emerald-400">FPS: {stats.fps}</span>
        </div>
      </div>
    </div>
  );
};
