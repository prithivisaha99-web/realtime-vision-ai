import React from 'react';
import { DetectedObject, DetectionSettings } from '../../types/detection';
import { soundEffects } from '../../utils/soundEffects';

interface DetectionOverlayProps {
  objects: DetectedObject[];
  settings: DetectionSettings;
  selectedTrackId: string | null;
  onSelectTrack: (trackId: string | null) => void;
  activeFilter: string;
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  objects,
  settings,
  selectedTrackId,
  onSelectTrack,
  activeFilter,
}) => {
  const filteredObjects = objects.filter((obj) => {
    if (activeFilter === 'all') return true;
    return obj.category === activeFilter;
  });

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* Render Trajectory Trails */}
      {settings.drawTrails && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {filteredObjects.map((obj) => {
            if (!obj.trail || obj.trail.length < 2) return null;
            const points = obj.trail.map((p) => `${p.x}%,${p.y}%`).join(' ');
            return (
              <polyline
                key={`trail-${obj.id}`}
                points={points}
                fill="none"
                stroke={obj.color}
                strokeWidth="2"
                strokeDasharray="4,4"
                strokeOpacity="0.75"
                className="transition-all duration-300"
              />
            );
          })}
        </svg>
      )}

      {/* Render Holographic AR Bounding Boxes */}
      {settings.drawBoundingBoxes &&
        filteredObjects.map((obj) => {
          const isSelected = selectedTrackId === obj.trackId;
          const confPercent = Math.round(obj.confidence * 100);

          return (
            <div
              key={obj.id}
              onClick={(e) => {
                e.stopPropagation();
                soundEffects.playTargetAcquired();
                onSelectTrack(isSelected ? null : obj.trackId);
              }}
              style={{
                left: `${obj.bbox.x}%`,
                top: `${obj.bbox.y}%`,
                width: `${obj.bbox.width}%`,
                height: `${obj.bbox.height}%`,
                borderColor: obj.color,
              }}
              className={`absolute border-2 pointer-events-auto cursor-pointer transition-all duration-150 ease-out group ${
                isSelected
                  ? 'border-white bg-cyan-500/20 shadow-[0_0_25px_rgba(0,243,255,0.6)] scale-[1.01]'
                  : 'bg-cyan-500/5 hover:bg-cyan-500/15 hover:shadow-[0_0_15px_rgba(0,243,255,0.4)]'
              }`}
            >
              {/* Corner Sci-Fi Target Reticles */}
              <div 
                className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2"
                style={{ borderColor: isSelected ? '#ffffff' : obj.color }}
              />
              <div 
                className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2"
                style={{ borderColor: isSelected ? '#ffffff' : obj.color }}
              />
              <div 
                className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2"
                style={{ borderColor: isSelected ? '#ffffff' : obj.color }}
              />
              <div 
                className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2"
                style={{ borderColor: isSelected ? '#ffffff' : obj.color }}
              />

              {/* Center Crosshair / Target Lock Point */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <div className="w-4 h-4 border border-cyan-400/80 rounded-full flex items-center justify-center">
                  <div className="w-1 h-1 bg-cyan-300 rounded-full animate-ping" />
                </div>
              </div>

              {/* Top Augmented Reality Data Badge */}
              <div
                className="absolute -top-7 left-0 flex items-center gap-1.5 px-2 py-0.5 rounded-t-md font-mono text-[11px] font-bold text-black uppercase tracking-wider backdrop-blur-md shadow-md"
                style={{
                  backgroundColor: obj.color,
                }}
              >
                <span>{obj.class}</span>
                {settings.drawConfidence && <span>{confPercent}%</span>}
                {settings.drawTrackingId && (
                  <span className="bg-black/30 text-white px-1 rounded text-[9px]">
                    ID: {obj.trackId}
                  </span>
                )}
              </div>

              {/* Bottom Telemetry Coordinates Sub-badge */}
              <div className="absolute -bottom-5 right-0 hidden sm:flex items-center gap-1 text-[9px] font-mono text-cyan-300/80 bg-black/60 px-1.5 py-0.5 rounded border border-cyan-500/30 backdrop-blur-sm">
                <span>POS: {Math.round(obj.bbox.x)},{Math.round(obj.bbox.y)}</span>
                <span>•</span>
                <span className="text-emerald-400">LOCK</span>
              </div>
            </div>
          );
        })}
    </div>
  );
};
