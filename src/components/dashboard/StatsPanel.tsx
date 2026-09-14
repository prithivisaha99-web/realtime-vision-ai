import React from 'react';
import { useDetection } from '../../context/DetectionContext';
import { 
  Users, 
  Car, 
  Box, 
  Layers, 
  Percent, 
  Gauge, 
  Activity, 
  Zap,} from 'lucide-react';

export const StatsPanel: React.FC = () => {
  const { stats, activeFilter, setActiveFilter } = useDetection();

  return (
    <div className="w-full glass-panel-elevated rounded-2xl p-5 border border-cyan-500/30 flex flex-col gap-4 shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-orbitron font-bold text-sm tracking-wider text-slate-100 text-glow-cyan">
              DETECTION STATUS
            </h2>
            <div className="text-[10px] font-mono text-cyan-300/70">
              REAL-TIME TELEMETRY
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800 font-mono text-[11px] text-emerald-400">
          <Zap className="w-3 h-3 text-emerald-400" />
          <span>LIVE</span>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Objects Detected */}
        <div className="col-span-2 p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-cyan-950/30 border border-cyan-500/30 flex items-center justify-between">
          <div>
            <div className="text-xs font-rajdhani font-semibold text-cyan-300 uppercase tracking-wider">
              Objects Detected
            </div>
            <div className="font-orbitron font-extrabold text-3xl text-white text-glow-cyan mt-0.5">
              {String(stats.totalObjects).padStart(2, '0')}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 shadow-[0_0_15px_rgba(0,243,255,0.2)]">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* People */}
        <button
          onClick={() => setActiveFilter(activeFilter === 'person' ? 'all' : 'person')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeFilter === 'person'
              ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(0,243,255,0.3)]'
              : 'bg-slate-900/50 border-slate-800 hover:border-cyan-500/40 hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-rajdhani font-medium text-slate-400">
            <span>People</span>
            <Users className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="font-orbitron font-bold text-2xl text-slate-100 mt-1">
            {String(stats.peopleCount).padStart(2, '0')}
          </div>
        </button>

        {/* Vehicles */}
        <button
          onClick={() => setActiveFilter(activeFilter === 'vehicle' ? 'all' : 'vehicle')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeFilter === 'vehicle'
              ? 'bg-purple-500/20 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
              : 'bg-slate-900/50 border-slate-800 hover:border-purple-500/40 hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-rajdhani font-medium text-slate-400">
            <span>Vehicles</span>
            <Car className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="font-orbitron font-bold text-2xl text-slate-100 mt-1">
            {String(stats.vehicleCount).padStart(2, '0')}
          </div>
        </button>

        {/* Other Objects */}
        <button
          onClick={() => setActiveFilter(activeFilter === 'object' ? 'all' : 'object')}
          className={`col-span-2 p-3 rounded-xl border text-left transition-all cursor-pointer ${
            activeFilter === 'object'
              ? 'bg-emerald-500/20 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              : 'bg-slate-900/50 border-slate-800 hover:border-emerald-500/40 hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-rajdhani font-medium text-slate-400">
            <span>Other Objects</span>
            <Box className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="font-orbitron font-bold text-2xl text-slate-100 mt-1">
            {String(stats.otherCount).padStart(2, '0')}
          </div>
        </button>
      </div>

      {/* Average Confidence Gauge */}
      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-cyan-500/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-rajdhani font-semibold text-slate-300">
            <Percent className="w-3.5 h-3.5 text-cyan-400" />
            <span>Average Confidence</span>
          </div>
          <div className="font-orbitron font-bold text-base text-cyan-300">
            {stats.averageConfidence}%
          </div>
        </div>

        {/* Holographic Glowing Progress Meter */}
        <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden p-0.5 border border-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-400 to-purple-500 shadow-[0_0_10px_#00f3ff] transition-all duration-300"
            style={{ width: `${stats.averageConfidence}%` }}
          />
        </div>
      </div>

      {/* FPS & Processing Rate */}
      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-cyan-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-rajdhani font-semibold text-slate-300">
              FRAME RATE (FPS)
            </div>
            <div className="text-[11px] font-mono text-emerald-400">
              OPTIMAL REFRESH
            </div>
          </div>
        </div>

        <div className="font-orbitron font-extrabold text-2xl text-emerald-300 text-glow-emerald">
          {stats.fps}
        </div>
      </div>
    </div>
  );
};
