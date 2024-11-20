import React from 'react';

const PlayerStatsLayout = ({ children, sidePanel }) => {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:space-x-6 p-4">
        {/* Side Panel - Hidden on mobile, shown on lg screens */}
        <div className="hidden lg:block lg:w-64 flex-shrink-0">
          {sidePanel}
        </div>
        
        {/* Main Content - Full width on mobile, centered on desktop */}
        <div className="flex-grow lg:max-w-4xl lg:mx-auto">
          {children}
        </div>
        
        {/* Mobile Side Panel Content - Shown below header on mobile only */}
        <div className="lg:hidden w-full space-y-4 mb-6">
          {sidePanel}
        </div>
      </div>
    </div>
  );
};

export default PlayerStatsLayout;