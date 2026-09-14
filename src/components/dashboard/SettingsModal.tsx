import React from 'react';
import { useDetection } from '../../context/DetectionContext';
import { soundEffects } from '../../utils/soundEffects';
import { 
  X, 
  Sliders, 
  Cpu, 
  Layers, 
  Eye, 
  Network, 
  Check,} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useDetection();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl glass-panel-elevated rounded-2xl border border-cyan-500/40 p-6 sm:p-8 shadow-[0_0_50px_rgba(0,243,255,0.2)] max-h-[90vh] overflow-y-auto"
      >
        {/* Corner Brackets */}
        <div className="corner-bracket-tl !w-4 !h-4" />
        <div className="corner-bracket-tr !w-4 !h-4" />
        <div className="corner-bracket-bl !w-4 !h-4" />
        <div className="corner-bracket-br !w-4 !h-4" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(0,243,255,0.3)]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-orbitron font-bold text-lg text-white text-glow-cyan">
                VISION ENGINE CONFIGURATION
              </h2>
              <p className="text-xs font-mono text-cyan-300/70">
                MODEL ARCHITECTURE & PIPELINE PARAMETERS
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundEffects.playClick();
              onClose();
            }}
            onMouseEnter={() => soundEffects.playHover()}
            className="p-2 rounded-xl bg-slate-900/60 border border-slate-700 hover:border-red-400 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Configurations */}
        <div className="space-y-6">
          {/* Section 1: YOLO Model Architecture */}
          <div>
            <label className="block text-xs font-orbitron font-semibold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Target Neural Model (Ready for Python/YOLO)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(['YOLOv8n', 'YOLOv8s', 'YOLOv8m', 'YOLOv9-C', 'RT-DETR-L'] as const).map((model) => (
                <button
                  key={model}
                  onClick={() => {
                    soundEffects.playClick();
                    updateSettings({ model });
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer font-mono text-xs ${
                    settings.model === model
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold shadow-[0_0_15px_rgba(0,243,255,0.3)]'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-cyan-500/40 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span>{model}</span>
                    {settings.model === model && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </div>
                  <div className="text-[10px] text-slate-500 font-sans">
                    {model.includes('RT-DETR') ? 'Transformer' : 'CNN Detector'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Object Tracker */}
          <div>
            <label className="block text-xs font-orbitron font-semibold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Multi-Object Tracking Algorithm</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(['ByteTrack', 'DeepSORT', 'BoT-SORT'] as const).map((tracker) => (
                <button
                  key={tracker}
                  onClick={() => {
                    soundEffects.playClick();
                    updateSettings({ tracker });
                  }}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer font-mono text-xs ${
                    settings.tracker === tracker
                      ? 'bg-purple-500/20 border-purple-400 text-purple-200 font-bold shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-purple-500/40 hover:text-slate-200'
                  }`}
                >
                  {tracker}
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Sliders (Confidence & IoU) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Confidence Threshold */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-cyan-500/20">
              <div className="flex justify-between text-xs font-rajdhani font-semibold text-slate-300 mb-2">
                <span>Confidence Threshold</span>
                <span className="font-mono text-cyan-300">{Math.round(settings.confidenceThreshold * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.95"
                step="0.05"
                value={settings.confidenceThreshold}
                onChange={(e) => updateSettings({ confidenceThreshold: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* IoU Threshold */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-cyan-500/20">
              <div className="flex justify-between text-xs font-rajdhani font-semibold text-slate-300 mb-2">
                <span>NMS IoU Threshold</span>
                <span className="font-mono text-cyan-300">{settings.iouThreshold}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={settings.iouThreshold}
                onChange={(e) => updateSettings({ iouThreshold: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Section 4: Display Overlay Toggles */}
          <div>
            <label className="block text-xs font-orbitron font-semibold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>Augmented Reality HUD Overlays</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: 'Bounding Boxes', key: 'drawBoundingBoxes' as const },
                { label: 'Track Trajectory', key: 'drawTrails' as const },
                { label: 'Confidence %', key: 'drawConfidence' as const },
                { label: 'Tracking IDs', key: 'drawTrackingId' as const },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    soundEffects.playClick();
                    updateSettings({ [item.key]: !settings[item.key] });
                  }}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer font-mono text-xs ${
                    settings[item.key]
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                      : 'bg-slate-900/50 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="text-[11px] mb-1">{item.label}</div>
                  <div className="text-[10px] uppercase">{settings[item.key] ? 'ENABLED' : 'DISABLED'}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Section 5: Future Backend WebSocket Config */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-purple-500/30">
            <div className="flex items-center gap-2 text-xs font-orbitron font-semibold text-purple-300 mb-1.5">
              <Network className="w-4 h-4 text-purple-400" />
              <span>Backend Python / WebSocket Gateway (Future Integration)</span>
            </div>
            <p className="text-[11px] font-space text-slate-400 mb-3">
              Configure the WebSocket or REST endpoint to pipe real-time YOLO detections when backend is started.
            </p>
            <input
              type="text"
              value={settings.backendWsUrl}
              onChange={(e) => updateSettings({ backendWsUrl: e.target.value })}
              className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
              placeholder="ws://localhost:8000/ws/vision"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-8 pt-4 border-t border-cyan-500/20 flex justify-end">
          <button
            onClick={() => {
              soundEffects.playClick();
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl cyber-button-primary !text-black font-orbitron font-bold text-xs tracking-wider cursor-pointer"
          >
            SAVE CONFIGURATION
          </button>
        </div>
      </div>
    </div>
  );
};
