import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { 
  DetectedObject, 
  DetectionStats, 
  DetectionSettings, 
  RawBackendDetection 
} from '../types/detection';
import { soundEffects } from '../utils/soundEffects';
import { checkBackendHealth } from '../services/yoloService';

interface DetectionContextType {
  isActive: boolean;
  setIsActive: (active: boolean) => void;
  toggleDetection: () => void;
  objects: DetectedObject[];
  setObjects: React.Dispatch<React.SetStateAction<DetectedObject[]>>;
  setRealDetections: (rawDetections: RawBackendDetection[], inferenceMs?: number, trackingMs?: number) => void;
  stats: DetectionStats;
  settings: DetectionSettings;
  updateSettings: (newSettings: Partial<DetectionSettings>) => void;
  selectedTrackId: string | null;
  setSelectedTrackId: (id: string | null) => void;
  cameraActive: boolean;
  setCameraActive: (active: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  videoSource: string;
  setVideoSource: (src: string) => void;
  backendConnected: boolean;
  setBackendConnected: (connected: boolean) => void;
}

const defaultSettings: DetectionSettings = {
  model: 'YOLOv8n',
  tracker: 'ByteTrack',
  confidenceThreshold: 0.35,
  iouThreshold: 0.45,
  maxTrackAge: 30,
  drawTrails: false, // Disabled until tracking is implemented
  drawBoundingBoxes: true,
  drawConfidence: true,
  drawTrackingId: true,
  enableSoundFx: true,
  backendWsUrl: 'ws://localhost:8000/ws/vision',
  themePreset: 'cyan-cyber',
  videoSourceMode: 'webcam',
};

const DetectionContext = createContext<DetectionContextType | undefined>(undefined);

export const DetectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState<boolean>(true);
  // Real detection objects array (initialized empty - NO mock data)
  const [objects, setObjects] = useState<DetectedObject[]>([]);
  const [settings, setSettings] = useState<DetectionSettings>(defaultSettings);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [videoSource, setVideoSource] = useState<string>('webcam');
  const [backendConnected, setBackendConnected] = useState<boolean>(false);

  const [stats, setStats] = useState<DetectionStats>({
    totalObjects: 0,
    peopleCount: 0,
    vehicleCount: 0,
    otherCount: 0,
    averageConfidence: 0,
    fps: 0,
    inferenceTimeMs: 0,
    resolution: '640x480',
  });

  // Track real FPS and detection intervals
  const lastDetectionTimeRef = useRef<number>(performance.now());
  const frameTimesRef = useRef<number[]>([]);
  const lastSuccessfulDetectionTimeRef = useRef<number>(0);
  const isCheckingHealthRef = useRef<boolean>(false);

  // Periodic Backend Health Check (Active ONLY when live camera detection is NOT active)
  useEffect(() => {
    let isMounted = true;

    const performHealthCheck = async () => {
      // Completely pause /health requests while live camera detection is active.
      // /detect itself serves as the backend heartbeat.
      if (cameraActive && isActive) {
        return;
      }

      if (isCheckingHealthRef.current) return;
      isCheckingHealthRef.current = true;

      try {
        const health = await checkBackendHealth();
        if (isMounted) {
          setBackendConnected(health.online);
        }
      } catch {
        if (isMounted) {
          setBackendConnected(false);
        }
      } finally {
        isCheckingHealthRef.current = false;
      }
    };

    void performHealthCheck();
    const interval = setInterval(performHealthCheck, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [cameraActive, isActive]);

  const updateSettings = useCallback((newSettings: Partial<DetectionSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (newSettings.enableSoundFx !== undefined) {
        soundEffects.enabled = newSettings.enableSoundFx;
        setSoundEnabled(newSettings.enableSoundFx);
      }
      return updated;
    });
  }, []);

  const toggleDetection = useCallback(() => {
    setIsActive((prev) => {
      const next = !prev;
      if (next) {
        soundEffects.playClick();
      } else {
        soundEffects.playHover();
      }
      return next;
    });
  }, []);

  /**
   * Updates state with REAL detections and ByteTrack track IDs from Python backend.
   * Maps track_id directly from ByteTrack and recalculates all telemetry.
   */
  const setRealDetections = useCallback((
    rawDetections: RawBackendDetection[], 
    inferenceMs: number = 0,
    trackingMs: number = 0
  ) => {
    lastSuccessfulDetectionTimeRef.current = performance.now();
    setBackendConnected(true);

    const now = performance.now();
    const elapsed = now - lastDetectionTimeRef.current;
    lastDetectionTimeRef.current = now;

    // Calculate moving average FPS
    if (elapsed > 0) {
      frameTimesRef.current.push(1000 / elapsed);
      if (frameTimesRef.current.length > 10) {
        frameTimesRef.current.shift();
      }
    }
    const currentFps = frameTimesRef.current.length > 0
      ? Math.round(frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length)
      : 0;

    // If no detections or detection inactive, set empty objects array
    if (!rawDetections || rawDetections.length === 0) {
      setObjects([]);
      setStats((prev) => ({
        ...prev,
        totalObjects: 0,
        peopleCount: 0,
        vehicleCount: 0,
        otherCount: 0,
        averageConfidence: 0,
        fps: currentFps,
        inferenceTimeMs: inferenceMs,
        trackingTimeMs: trackingMs,
      }));
      return;
    }

    const mappedObjects: DetectedObject[] = rawDetections.map((d, index) => {
      let color = '#10b981'; // object -> emerald
      if (d.category === 'person') {
        color = '#00f3ff'; // person -> cyan
      } else if (d.category === 'vehicle') {
        color = '#a855f7'; // vehicle -> purple
      }

      // Authentic ByteTrack track_id mapping
      const realTrackId = d.track_id;
      const formattedTrackId = realTrackId !== null && realTrackId !== undefined
        ? String(realTrackId).padStart(2, '0')
        : '—';

      return {
        id: realTrackId !== null && realTrackId !== undefined ? `track-${realTrackId}` : (d.id || `det-${index + 1}`),
        trackId: formattedTrackId,
        track_id: realTrackId,
        class: d.class_name,
        category: d.category,
        confidence: d.confidence,
        bbox: {
          x: d.normalized_box.x,
          y: d.normalized_box.y,
          width: d.normalized_box.width,
          height: d.normalized_box.height,
        },
        color,
        lastSeen: Date.now(),
        status: 'active',
      };
    });

    setObjects(mappedObjects);

    // Compute live stats from real detections
    const people = mappedObjects.filter((o) => o.category === 'person').length;
    const vehicles = mappedObjects.filter((o) => o.category === 'vehicle').length;
    const others = mappedObjects.filter((o) => o.category !== 'person' && o.category !== 'vehicle').length;
    const avg = mappedObjects.reduce((sum, o) => sum + o.confidence, 0) / mappedObjects.length;

    setStats((prev) => ({
      ...prev,
      totalObjects: mappedObjects.length,
      peopleCount: people,
      vehicleCount: vehicles,
      otherCount: others,
      averageConfidence: +(avg * 100).toFixed(1),
      fps: currentFps,
      inferenceTimeMs: inferenceMs,
      trackingTimeMs: trackingMs,
    }));
  }, []);

  return (
    <DetectionContext.Provider
      value={{
        isActive,
        setIsActive,
        toggleDetection,
        objects,
        setObjects,
        setRealDetections,
        stats,
        settings,
        updateSettings,
        selectedTrackId,
        setSelectedTrackId,
        cameraActive,
        setCameraActive,
        soundEnabled,
        setSoundEnabled,
        activeFilter,
        setActiveFilter,
        videoSource,
        setVideoSource,
        backendConnected,
        setBackendConnected,
      }}
    >
      {children}
    </DetectionContext.Provider>
  );
};

export const useDetection = () => {
  const context = useContext(DetectionContext);
  if (!context) {
    throw new Error('useDetection must be used within a DetectionProvider');
  }
  return context;
};
