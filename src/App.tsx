import React, { useState } from 'react';
import { IntroPage } from './components/intro/IntroPage';
import { MainDashboard } from './components/dashboard/MainDashboard';
import { DetectionProvider } from './context/DetectionContext';

export function App() {
  const [currentPage, setCurrentPage] = useState<'intro' | 'dashboard'>('intro');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  const handleEnterDashboard = () => {
    setIsTransitioning(true);
    // Smooth cinematic 3D transition timing
    setTimeout(() => {
      setCurrentPage('dashboard');
      setIsTransitioning(false);
    }, 850);
  };

  const handleReturnToIntro = () => {
    setCurrentPage('intro');
  };

  return (
    <DetectionProvider>
      <div className="w-screen min-h-screen bg-[#030612] overflow-x-hidden">
        {currentPage === 'intro' ? (
          <IntroPage
            onEnter={handleEnterDashboard}
            isTransitioning={isTransitioning}
          />
        ) : (
          <MainDashboard onReturnHome={handleReturnToIntro} />
        )}
      </div>
    </DetectionProvider>
  );
}

export default App;
