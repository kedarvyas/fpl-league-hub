import React from 'react';

const PlayerStatsLayout = ({ children, leftPanel, rightPanel }) => {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:space-x-6 p-4">
        {/* Left Panel - Hidden on mobile */}
        <div className="hidden lg:block lg:w-64 flex-shrink-0">
          {leftPanel}
        </div>
        
        {/* Main Content */}
        <div className="flex-grow lg:max-w-4xl lg:mx-auto">
          {children}
        </div>

        {/* Right Panel - Hidden on mobile */}
        <div className="hidden lg:block lg:w-64 flex-shrink-0">
          {rightPanel}
        </div>
        
        {/* Mobile Panels - Shown below header */}
        <div className="lg:hidden w-full space-y-4 mb-6">
          {leftPanel}
          {rightPanel}
        </div>
      </div>
    </div>
  );
};

export default PlayerStatsLayout;