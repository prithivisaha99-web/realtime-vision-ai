import React from 'react';
import { useDetection } from '../../context/DetectionContext';
import { soundEffects } from '../../utils/soundEffects';
import { 
  Eye, 
  Settings, 
  Volume2, 
  VolumeX, 
  Sparkles,
  Layers
} from 'lucide-react';

interface TopNavProps {
  onOpenSettings: () => void;
  onReturnHome: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onOpenSettings, onReturnHome }) => {
  const { stats, settings, soundEnabled, setSoundEnabled, isActive, backendConnected } = useDetection();

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEffects.enabled = next;
    if (next) soundEffects.playClick();
  };

  return (
    <header className="relative z-30 w-full px-6 py-3.5 glass-panel-elevated border-b border-cyan-500/20 flex items-center justify-between">
      {/* Left: 3D Logo / Icon + Brand Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            soundEffects.playClick();
            onReturnHome();
          }}
          onMouseEnter={() => soundEffects.playHover()}
          className="group relative flex items-center gap-3 text-left cursor-pointer focus:outline-none"
          title="Return to 3D Intro"
        >
          {/* Futuristic 3D Holographic Emblem */}
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-600/30 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_15px_rgba(0,243,255,0.3)] group-hover:shadow-[0_0_25px_rgba(0,243,255,0.6)] group-hover:scale-105 transition-all duration-300">
            <div className="corner-bracket-tl !w-2 !h-2" />
            <div className="corner-bracket-br !w-2 !h-2" />
            <Eye className="w-5 h-5 text-cyan-300 group-hover:text-white transition-colors duration-300 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-orbitron font-extrabold text-lg tracking-wider text-white text-glow-cyan">
                VISION CORE
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 rounded">
                v2.0
              </span>
            </div>
            <div className="text-[11px] font-rajdhani text-cyan-300/70 tracking-wider">
              SPATIAL PERCEPTION ENGINE
            </div>
          </div>
        </button>
      </div>

      {/* Center: System Title Header */}
      <div className="hidden lg:flex flex-col items-center">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <h1 className="font-orbitron font-semibold text-sm tracking-widest text-slate-100 uppercase">
            REAL-TIME OBJECT DETECTION & TRACKING
          </h1>
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-slate-400 mt-0.5">
          <span className="flex items-center gap-1.5 text-cyan-300">
            <Layers className="w-3 h-3" /> MODEL: {settings.model}
          </span>
          <span>•</span>
          <span className="text-purple-300">TRACKER: {settings.tracker}</span>
          <span>•</span>
          <span className="text-emerald-300">FPS: {stats.fps}</span>
        </div>
      </div>

      {/* Right: System Status & Quick Controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* YOLO Backend Status Badge */}
        <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md text-xs font-mono font-semibold ${
          backendConnected 
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
            : 'bg-rose-950/40 border-rose-500/40 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
        }`}>
          <span className={`w-2 h-2 rounded-full ${backendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
          <span>YOLO + TRACKER: {backendConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
        </div>

        {/* System Online Badge */}
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 backdrop-blur-md shadow-[0_0_12px_rgba(0,243,255,0.15)]">
          <span className="relative flex h-2.5 w-2.5">
            {isActive ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            )}
          </span>
          <span className="font-orbitron text-xs tracking-wider font-semibold text-slate-200">
            {isActive ? 'SYSTEM ONLINE' : 'PAUSED'}
          </span>
        </div>

        {/* Audio Toggle */}
        <button
          onClick={toggleSound}
          onMouseEnter={() => soundEffects.playHover()}
          className="p-2 rounded-xl bg-slate-900/60 border border-slate-700/60 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/30 transition-all duration-200 cursor-pointer"
          title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>

        {/* Settings Button */}
        <button
          onClick={() => {
            soundEffects.playClick();
            onOpenSettings();
          }}
          onMouseEnter={() => soundEffects.playHover()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-700/60 hover:border-cyan-400 text-slate-200 hover:text-cyan-300 hover:bg-cyan-950/30 transition-all duration-200 cursor-pointer group"
          title="Engine Settings"
        >
          <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300 text-cyan-400" />
          <span className="hidden sm:inline font-rajdhani font-semibold text-xs tracking-wider">
            CONFIG
          </span>
        </button>
      </div>
    </header>
  );
};
