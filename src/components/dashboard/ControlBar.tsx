import React from 'react';
import { useDetection } from '../../context/DetectionContext';
import { soundEffects } from '../../utils/soundEffects';
import { 
  Play, 
  Square, 
  Camera, 
  Settings, 
  Maximize, 
  Minimize,
  CameraOff,} from 'lucide-react';

interface ControlBarProps {
  onOpenSettings: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  onOpenSettings,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const { 
    isActive, 
    setIsActive, 
    cameraActive, 
    setCameraActive, 
     
  } = useDetection();

  const handleStart = () => {
    soundEffects.playClick();
    setIsActive(true);
    setCameraActive(true);
  };

  const handleStop = () => {
    soundEffects.playClick();
    setIsActive(false);
  };

  const handleCameraToggle = () => {
    soundEffects.playClick();
    setCameraActive(!cameraActive);
  };

  return (
    <footer className="relative z-30 w-full px-6 py-4 glass-panel-elevated border-t border-cyan-500/25 flex items-center justify-between gap-4">
      {/* Left: Quick Status Indicator */}
      <div className="hidden sm:flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-cyan-500/20 text-xs font-mono text-cyan-300">
          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span>INFERENCE ENGINE: {isActive ? 'RUNNING' : 'IDLE'}</span>
        </div>
      </div>

      {/* Center: Futuristic 3D Control Buttons Bar */}
      <div className="flex items-center gap-2 sm:gap-3 mx-auto">
        {/* START DETECTION */}
        <button
          onClick={handleStart}
          onMouseEnter={() => soundEffects.playHover()}
          disabled={isActive && cameraActive}
          className={`group px-4 sm:px-6 py-2.5 rounded-xl cyber-button cursor-pointer flex items-center gap-2 text-xs sm:text-sm font-orbitron font-bold transition-all ${
            isActive && cameraActive
              ? 'opacity-50 cursor-not-allowed border-slate-700 text-slate-500 bg-slate-900/50'
              : 'cyber-button-primary !text-black'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>START DETECTION</span>
        </button>

        {/* STOP DETECTION */}
        <button
          onClick={handleStop}
          onMouseEnter={() => soundEffects.playHover()}
          disabled={!isActive}
          className={`px-4 sm:px-5 py-2.5 rounded-xl border flex items-center gap-2 text-xs sm:text-sm font-orbitron font-bold transition-all cursor-pointer ${
            !isActive
              ? 'opacity-40 cursor-not-allowed border-slate-800 text-slate-600 bg-slate-950/40'
              : 'border-red-500/40 bg-red-950/30 text-red-300 hover:bg-red-900/40 hover:border-red-400 hover:text-white shadow-[0_0_15px_rgba(239,68,68,0.25)]'
          }`}
        >
          <Square className="w-4 h-4 fill-current" />
          <span>STOP DETECTION</span>
        </button>

        {/* CAMERA TOGGLE */}
        <button
          onClick={handleCameraToggle}
          onMouseEnter={() => soundEffects.playHover()}
          className={`px-3 sm:px-4 py-2.5 rounded-xl border flex items-center gap-2 text-xs sm:text-sm font-orbitron font-bold transition-all cursor-pointer ${
            cameraActive
              ? 'border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/40 hover:border-cyan-400 shadow-[0_0_15px_rgba(0,243,255,0.2)]'
              : 'border-slate-700 bg-slate-900/40 text-slate-400 hover:text-slate-200'
          }`}
        >
          {cameraActive ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4 text-amber-400" />}
          <span className="hidden md:inline">CAMERA</span>
        </button>

        {/* SETTINGS */}
        <button
          onClick={() => {
            soundEffects.playClick();
            onOpenSettings();
          }}
          onMouseEnter={() => soundEffects.playHover()}
          className="px-3 sm:px-4 py-2.5 rounded-xl border border-slate-700/80 bg-slate-900/50 hover:border-cyan-400/60 hover:bg-cyan-950/30 text-slate-300 hover:text-cyan-300 flex items-center gap-2 text-xs sm:text-sm font-orbitron font-bold transition-all cursor-pointer group"
          title="Open Settings"
        >
          <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          <span className="hidden lg:inline">SETTINGS</span>
        </button>

        {/* FULLSCREEN */}
        <button
          onClick={() => {
            soundEffects.playClick();
            onToggleFullscreen();
          }}
          onMouseEnter={() => soundEffects.playHover()}
          className="p-2.5 rounded-xl border border-slate-700/80 bg-slate-900/50 hover:border-cyan-400/60 hover:bg-cyan-950/30 text-slate-300 hover:text-cyan-300 flex items-center justify-center transition-all cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>

      {/* Right: Telemetry Tag */}
      <div className="hidden xl:flex items-center gap-2 text-xs font-mono text-slate-500">
        <span>INTERFACE BUILD: 2026.9</span>
      </div>
    </footer>
  );
};
