import React from 'react';

interface NavigationButtonsProps {
  onNavigateHome: () => void;
  onNavigateBack?: () => void;
  showBack?: boolean;
}

const NavigationButtons: React.FC<NavigationButtonsProps> = ({ 
  onNavigateHome, 
  onNavigateBack, 
  showBack = true 
}) => {
  return (
    <div className="flex space-x-3 mb-6">
      <button
        onClick={onNavigateHome}
        className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
      >
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        Home
      </button>
      
      {showBack && onNavigateBack && (
        <button
          onClick={onNavigateBack}
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
      )}
    </div>
  );
};

export default NavigationButtons;