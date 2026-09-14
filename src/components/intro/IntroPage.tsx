import React, { useState, useEffect } from 'react';
import { VisionCore3D } from '../3d/VisionCore3D';
import { soundEffects } from '../../utils/soundEffects';
import { Cpu, Sparkles, Volume2, VolumeX, ArrowRight, Eye } from 'lucide-react';

interface IntroPageProps {
  onEnter: () => void;
  isTransitioning: boolean;
}

export const IntroPage: React.FC<IntroPageProps> = ({ onEnter, isTransitioning }) => {
  const [bootPhase, setBootPhase] = useState<number>(0);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [soundOn, setSoundOn] = useState<boolean>(true);

  // Staggered boot sequence (0s -> 1s -> 2s -> 3s -> 4s)
  useEffect(() => {
    const t1 = setTimeout(() => setBootPhase(1), 300);
    const t2 = setTimeout(() => setBootPhase(2), 1100);
    const t3 = setTimeout(() => setBootPhase(3), 2000);
    const t4 = setTimeout(() => setBootPhase(4), 2800);
    const t5 = setTimeout(() => setBootPhase(5), 3600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const { innerWidth, innerHeight } = window;
    const x = (e.clientX / innerWidth) * 2 - 1;
    const y = (e.clientY / innerHeight) * 2 - 1;
    setMousePos({ x, y });
  };

  const handleEnterClick = () => {
    soundEffects.playBootTransition();
    onEnter();
  };

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !soundOn;
    setSoundOn(next);
    soundEffects.enabled = next;
    if (next) soundEffects.playClick();
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className={`relative w-screen h-screen overflow-hidden bg-[#030612] flex flex-col justify-between items-center select-none transition-all duration-1000 ${
        isTransitioning ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* 3D Background Canvas */}
      <div className="absolute inset-0 z-0">
        <VisionCore3D isTransitioning={isTransitioning} mousePosition={mousePos} />
      </div>

      {/* Futuristic Scanline Effect */}
      <div className="absolute inset-0 scanlines pointer-events-none z-10" />

      {/* Top Header Telemetry */}
      <header className="relative z-20 w-full max-w-7xl px-8 py-6 flex items-center justify-between">
        {/* Boot System Status Badge */}
        <div
          className={`flex items-center gap-3 transition-all duration-700 ${
            bootPhase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-500/30 backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            <span className="font-orbitron text-xs tracking-wider text-cyan-300">
              VISION CORE • READY
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/40 border border-slate-700/40 text-xs text-slate-400 font-mono">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>NEURAL PIPELINE v2.4</span>
          </div>
        </div>

        {/* Audio Toggle & Quick Enter */}
        <div
          className={`flex items-center gap-4 transition-all duration-700 delay-200 ${
            bootPhase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}
        >
          <button
            onClick={toggleSound}
            onMouseEnter={() => soundEffects.playHover()}
            className="p-2.5 rounded-xl bg-slate-900/60 border border-cyan-500/20 text-cyan-300 hover:text-white hover:border-cyan-400 hover:bg-cyan-950/40 transition-all duration-200 cursor-pointer backdrop-blur-md"
            title={soundOn ? 'Mute Audio FX' : 'Enable Audio FX'}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Holographic Center Stage */}
      <main className="relative z-20 flex flex-col items-center justify-center text-center px-6 max-w-4xl my-auto">
        {/* Top Tagline */}
        <div
          className={`transition-all duration-700 ${
            bootPhase >= 3 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-cyan-500/10 border border-cyan-500/30 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-orbitron text-xs tracking-widest text-cyan-300 uppercase">
              Autonomous Spatial Intelligence
            </span>
          </div>
        </div>

        {/* Hero Title */}
        <h1
          className={`font-orbitron font-extrabold text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight text-white transition-all duration-1000 ${
            bootPhase >= 3
              ? 'opacity-100 translate-y-0 blur-0'
              : 'opacity-0 translate-y-8 blur-md'
          }`}
        >
          <span className="block bg-clip-text text-transparent bg-gradient-to-b from-white via-cyan-100 to-cyan-400 text-glow-cyan">
            REAL-TIME VISION
          </span>
        </h1>

        {/* Subtitle */}
        <h2
          className={`font-rajdhani font-semibold text-2xl sm:text-3xl md:text-4xl text-cyan-200/90 tracking-wide mt-3 mb-4 transition-all duration-700 delay-100 ${
            bootPhase >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          Object Detection & Tracking
        </h2>

        {/* Short Description */}
        <p
          className={`font-space text-base sm:text-lg text-slate-300/80 max-w-xl mx-auto mb-10 transition-all duration-700 delay-200 ${
            bootPhase >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          AI-powered real-time visual intelligence with high-fps multi-target tracking and neural AR telemetry.
        </p>

        {/* 3D Interactive ENTER Button */}
        <div
          className={`transition-all duration-700 delay-300 perspective-container ${
            bootPhase >= 4 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-90'
          }`}
        >
          <button
            onClick={handleEnterClick}
            onMouseEnter={() => soundEffects.playHover()}
            className="group relative inline-flex items-center justify-center gap-4 px-10 py-5 rounded-2xl cyber-button-primary cursor-pointer transition-all duration-300"
            style={{
              transform: `perspective(1000px) rotateX(${mousePos.y * -8}deg) rotateY(${mousePos.x * 8}deg)`,
            }}
          >
            {/* Corner Decorative Tech Brackets */}
            <div className="corner-bracket-tl !border-white" />
            <div className="corner-bracket-tr !border-white" />
            <div className="corner-bracket-bl !border-white" />
            <div className="corner-bracket-br !border-white" />

            {/* Glowing Aura */}
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 rounded-2xl blur-lg opacity-60 group-hover:opacity-100 transition duration-500 group-hover:duration-200" />

            <div className="relative flex items-center gap-3 font-orbitron font-bold text-base sm:text-lg tracking-widest text-black">
              <Eye className="w-5 h-5 text-black animate-pulse" />
              <span>ENTER VISION SYSTEM</span>
              <ArrowRight className="w-5 h-5 text-black group-hover:translate-x-1.5 transition-transform duration-300" />
            </div>
          </button>
        </div>
      </main>

      {/* Bottom Telemetry HUD Bar */}
      <footer
        className={`relative z-20 w-full max-w-7xl px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-700 ${
          bootPhase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="flex items-center gap-6 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>LATENCY: &lt;15ms</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>PRECISION: FP16 TENSOR</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>ACCELERATOR: WEBGL 2.0</span>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-rajdhani tracking-widest">
          STANDBY READY • CLICK ENTER TO LAUNCH HUD
        </div>
      </footer>
    </div>
  );
};
