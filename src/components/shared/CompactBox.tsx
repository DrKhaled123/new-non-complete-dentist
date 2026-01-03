import React, { useState } from 'react';
import { CompactBoxProps } from '../../types';

/**
 * CompactBox - Enhanced expandable container for clinical notes and medical information
 * 
 * Features:
 * - Click to expand/collapse with smooth animations
 * - Keyboard accessible (Enter/Space to toggle)
 * - ARIA attributes for screen readers
 * - Medical theme styling with gradients
 * - Touch-friendly for mobile devices
 * - Enhanced visual feedback
 */
const CompactBox: React.FC<CompactBoxProps> = ({
  title,
  children,
  defaultExpanded = false,
  className = '',
  icon,
  badge,
  variant = 'default'
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Allow Enter or Space to toggle expansion
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleExpanded();
    }
  };

  // Variant styling
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          container: 'bg-gradient-to-br from-primary-50 via-white to-primary-50/30 border-primary-200',
          header: 'bg-gradient-to-r from-primary-100 to-primary-50 hover:from-primary-50 hover:to-primary-100',
          icon: 'text-primary-600'
        };
      case 'accent':
        return {
          container: 'bg-gradient-to-br from-accent-50 via-white to-accent-50/30 border-accent-200',
          header: 'bg-gradient-to-r from-accent-100 to-accent-50 hover:from-accent-50 hover:to-accent-100',
          icon: 'text-accent-600'
        };
      case 'success':
        return {
          container: 'bg-gradient-to-br from-success-50 via-white to-success-50/30 border-success-200',
          header: 'bg-gradient-to-r from-success-100 to-success-50 hover:from-success-50 hover:to-success-100',
          icon: 'text-success-600'
        };
      default:
        return {
          container: 'bg-gradient-to-br from-white via-secondary-50/30 to-secondary-50/50 border-secondary-200',
          header: 'bg-gradient-to-r from-secondary-50 to-primary-50/20 hover:from-primary-50/20 hover:to-secondary-50',
          icon: 'text-secondary-600'
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <div className={`compact-box rounded-2xl overflow-hidden transition-all duration-300 shadow-medical-card hover:shadow-medical-hover border ${variantStyles.container} ${className}`}>
      {/* Enhanced Header - clickable to expand/collapse */}
      <div
        className={`compact-box-header cursor-pointer transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] ${variantStyles.header}`}
        onClick={toggleExpanded}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
        aria-controls={`compact-box-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${title}`}
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            {/* Optional icon */}
            {icon && (
              <div className={`flex-shrink-0 ${variantStyles.icon}`}>
                {icon}
              </div>
            )}
            
            <h3 className="text-base font-bold text-secondary-900 select-none leading-tight">
              {title}
            </h3>
            
            {/* Optional badge */}
            {badge && (
              <span className="px-2 py-1 text-xs font-bold bg-accent-500 text-white rounded-full animate-pulse-subtle">
                {badge}
              </span>
            )}
          </div>
          
          {/* Enhanced Expand/Collapse Icon */}
          <div className="flex-shrink-0 ml-3">
            <svg
              className={`w-5 h-5 text-secondary-500 transition-all duration-500 transform ${
                isExpanded ? 'rotate-180 text-primary-600' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Enhanced Content - expandable */}
      <div
        id={`compact-box-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        }`}
        aria-hidden={!isExpanded}
      >
        <div className="p-4 bg-gradient-to-br from-white to-secondary-50/20 border-t border-secondary-200/50">
          <div className="animate-fade-in">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompactBox;