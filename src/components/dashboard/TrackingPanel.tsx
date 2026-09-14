import React from 'react';
import { useDetection } from '../../context/DetectionContext';
import { soundEffects } from '../../utils/soundEffects';
import { 
  Radar, 
  User, 
  Car, 
  Package,  ArrowUpRight
} from 'lucide-react';

export const TrackingPanel: React.FC = () => {
  const { objects, selectedTrackId, setSelectedTrackId, activeFilter, setActiveFilter } = useDetection();

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'person':
        return <User className="w-3.5 h-3.5 text-cyan-400" />;
      case 'vehicle':
        return <Car className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Package className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  const filteredObjects = objects.filter((obj) => {
    if (activeFilter === 'all') return true;
    return obj.category === activeFilter;
  });

  return (
    <div className="w-full glass-panel-elevated rounded-2xl p-5 border border-cyan-500/30 flex flex-col gap-4 shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
            <Radar className="w-4 h-4 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <div>
            <h2 className="font-orbitron font-bold text-sm tracking-wider text-slate-100 text-glow-cyan">
              ACTIVE TRACKING
            </h2>
            <div className="text-[10px] font-mono text-cyan-300/70">
              MULTI-OBJECT ASSIGNMENTS
            </div>
          </div>
        </div>

        <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
          {filteredObjects.length} TRACKS
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80">
        {['all', 'person', 'vehicle', 'object'].map((filter) => (
          <button
            key={filter}
            onClick={() => {
              soundEffects.playHover();
              setActiveFilter(filter);
            }}
            className={`flex-1 py-1 text-[11px] font-rajdhani font-semibold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              activeFilter === filter
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Tracked Entities List with 3D Elevated Cards */}
      <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
        {filteredObjects.map((obj) => {
          const isSelected = selectedTrackId === obj.trackId;
          const confPercent = Math.round(obj.confidence * 100);

          return (
            <div
              key={obj.id}
              onClick={() => {
                soundEffects.playClick();
                setSelectedTrackId(isSelected ? null : obj.trackId);
              }}
              onMouseEnter={() => soundEffects.playHover()}
              className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                isSelected
                  ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_20px_rgba(0,243,255,0.3)] scale-[1.02]'
                  : 'bg-slate-900/60 border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-800/60'
              }`}
            >
              {/* Left Details */}
              <div className="flex items-center gap-3">
                <div 
                  className="p-2 rounded-lg border flex items-center justify-center"
                  style={{
                    backgroundColor: `${obj.color}15`,
                    borderColor: `${obj.color}40`,
                  }}
                >
                  {getCategoryIcon(obj.category)}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-orbitron font-bold text-xs text-slate-100">
                      ID {obj.trackId}
                    </span>
                    <span className="font-mono text-[11px] uppercase text-cyan-300 font-semibold">
                      {obj.class}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    CONF: {confPercent}% • {obj.category}
                  </div>
                </div>
              </div>

              {/* Right Status Badge */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>ACTIVE</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
              </div>
            </div>
          );
        })}

        {filteredObjects.length === 0 && (
          <div className="py-6 text-center text-xs font-mono text-slate-500">
            NO ACTIVE TARGETS IN THIS CATEGORY
          </div>
        )}
      </div>
    </div>
  );
};
