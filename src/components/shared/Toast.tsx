import React, { useEffect, useState } from 'react';
import { ToastProps } from '../../types';

/**
 * Enhanced Toast notification component with medical theming
 * 
 * Features:
 * - Multiple types with enhanced styling
 * - Smooth enter/exit animations
 * - Progress bar for timed notifications
 * - Medical gradient backgrounds
 * - Touch-friendly for mobile
 * - Auto-dismiss with customizable duration
 */
const Toast: React.FC<ToastProps> = ({ 
  type, 
  message, 
  duration = 5000, 
  onClose,
  showProgress = true
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Progress bar animation
    if (showProgress && duration > 0) {
      const interval = setInterval(() => {
        setProgress((prevProgress) => {
          const newProgress = prevProgress - (100 / (duration / 100));
          return newProgress <= 0 ? 0 : newProgress;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [duration, showProgress]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300); // Animation duration
  };

  const getToastStyles = () => {
    const baseStyles = "flex items-start p-4 mb-4 text-sm rounded-2xl shadow-medical-lg border backdrop-blur-md transform transition-all duration-300";
    
    switch (type) {
      case 'success':
        return `${baseStyles} text-success-800 bg-success-50/95 border-success-200 hover:bg-success-100/95`;
      case 'error':
        return `${baseStyles} text-error-800 bg-error-50/95 border-error-200 hover:bg-error-100/95`;
      case 'warning':
        return `${baseStyles} text-warning-800 bg-warning-50/95 border-warning-200 hover:bg-warning-100/95`;
      case 'info':
      default:
        return `${baseStyles} text-accent-800 bg-accent-50/95 border-accent-200 hover:bg-accent-100/95`;
    }
  };

  const getIcon = () => {
    const iconClass = "flex-shrink-0 w-5 h-5 mr-3";
    
    switch (type) {
      case 'success':
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className={iconClass} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className={`
        ${getToastStyles()} 
        ${isExiting ? 'translate-x-full opacity-0 scale-95' : 'translate-x-0 opacity-100 scale-100'}
        animate-slide-up
      `}
      role="alert"
      aria-live="polite"
    >
      {getIcon()}
      <div className="flex-1 min-w-0">
        <span className="font-semibold leading-tight">{message}</span>
        
        {/* Progress bar */}
        {showProgress && duration > 0 && (
          <div className="mt-2 w-full bg-black/10 rounded-full h-1 overflow-hidden">
            <div 
              className="h-full bg-current opacity-30 transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      
      <button
        onClick={handleClose}
        className="ml-3 -mx-1.5 -my-1.5 rounded-xl p-1.5 hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-current focus:ring-opacity-20 transition-all duration-300 transform hover:scale-110 active:scale-95"
        aria-label="Close notification"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};

export default Toast;