import React from 'react';
import { LoadingSpinnerProps } from '../../types';

/**
 * LoadingSpinner - Enhanced animated loading indicator for async operations
 * 
 * Features:
 * - Multiple sizes (sm, md, lg, xl)
 * - Optional loading text with medical theme
 * - Color variants for different contexts
 * - Center alignment with accessibility
 * - Pulse animation for enhanced visibility
 * - Medical gradient spinner
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  className = '',
  variant = 'primary',
  centered = true
}) => {
  // Enhanced size configurations
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  // Color variants
  const getVariantClasses = () => {
    switch (variant) {
      case 'secondary':
        return 'border-secondary-200 border-t-secondary-600';
      case 'accent':
        return 'border-secondary-200 border-t-accent-500';
      case 'success':
        return 'border-secondary-200 border-t-success-500';
      case 'white':
        return 'border-secondary-200 border-t-white';
      default:
        return 'border-secondary-200 border-t-primary-500';
    }
  };

  return (
    <div 
      className={`flex flex-col items-center justify-center ${
        centered ? 'min-h-[100px]' : ''
      } ${className}`}
      role="status"
      aria-live="polite"
      aria-label={text || 'Loading'}
    >
      {/* Enhanced Spinner with medical gradient */}
      <div
        className={`
          ${sizeClasses[size]} 
          ${getVariantClasses()}
          animate-spin rounded-full 
          shadow-medical-card
          relative
          before:absolute before:inset-0 before:rounded-full
          before:bg-gradient-to-r before:from-primary-400 before:to-accent-400
          before:opacity-20 before:animate-pulse
        `}
        aria-hidden="true"
      >
        {/* Inner glow effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-300 to-accent-300 opacity-30 animate-pulse"></div>
      </div>
      
      {/* Optional loading text with enhanced styling */}
      {text && (
        <div className="mt-4 text-center animate-fade-in">
          <p className={`font-semibold text-secondary-700 ${textSizeClasses[size]}`}>
            {text}
          </p>
          {/* Subtle loading dots animation */}
          <div className="flex justify-center mt-2 space-x-1">
            <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-1.5 h-1.5 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      )}
      
      {/* Screen reader text */}
      <span className="sr-only">
        {text || 'Loading, please wait...'}
      </span>
    </div>
  );
};

export default LoadingSpinner;