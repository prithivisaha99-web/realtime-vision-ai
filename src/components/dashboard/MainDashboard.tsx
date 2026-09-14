import React, { useState } from 'react';
import { TopNav } from './TopNav';
import { CameraViewport } from './CameraViewport';
import { StatsPanel } from './StatsPanel';
import { TrackingPanel } from './TrackingPanel';
import { ControlBar } from './ControlBar';
import { SettingsModal } from './SettingsModal';
import { SceneBackground } from '../3d/SceneBackground';

interface MainDashboardProps {
  onReturnHome: () => void;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({ onReturnHome }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className="relative min-h-screen w-screen bg-[#030612] text-slate-100 flex flex-col justify-between overflow-x-hidden animate-in fade-in duration-700">
      {/* 3D Background Starfield */}
      <SceneBackground />

      {/* Top Glassmorphic Navigation */}
      <TopNav 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        onReturnHome={onReturnHome}
      />

      {/* Main Grid Viewport & Telemetry Area */}
      <main className="relative z-20 flex-1 px-4 sm:px-6 py-4 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left / Center 3D Camera Viewport Stage (8 Cols) */}
        <section className="lg:col-span-8 flex flex-col min-h-[460px] lg:min-h-[580px]">
          <CameraViewport onFullscreenToggle={toggleFullscreen} />
        </section>

        {/* Right 3D Floating Information & Tracking Panels (4 Cols) */}
        <section className="lg:col-span-4 flex flex-col gap-5 justify-between">
          <StatsPanel />
          <TrackingPanel />
        </section>
      </main>

      {/* Bottom 3D Control Bar Dock */}
      <ControlBar
        onOpenSettings={() => setIsSettingsOpen(true)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* Settings Configuration Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};
