import React, { useEffect, useRef } from 'react';
import { ModalProps } from '../../types';

/**
 * Enhanced Modal component with medical theming and accessibility
 * 
 * Features:
 * - Multiple sizes with responsive design
 * - Enhanced backdrop blur and animations
 * - Focus trapping and keyboard navigation
 * - Medical gradient styling
 * - Touch-friendly for mobile devices
 */
const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  variant = 'default'
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Enhanced size classes with responsive design
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-[95vw] max-h-[95vh]',
  };

  // Variant styling
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          panel: 'bg-gradient-to-br from-primary-50 via-white to-primary-100/50 border-primary-200',
          header: 'border-b border-primary-200/50',
          title: 'text-primary-900'
        };
      case 'accent':
        return {
          panel: 'bg-gradient-to-br from-accent-50 via-white to-accent-100/50 border-accent-200',
          header: 'border-b border-accent-200/50',
          title: 'text-accent-900'
        };
      default:
        return {
          panel: 'bg-gradient-to-br from-white via-secondary-50/30 to-white border-secondary-200',
          header: 'border-b border-secondary-200/50',
          title: 'text-secondary-900'
        };
    }
  };

  const variantStyles = getVariantStyles();

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Focus the modal
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.focus();
        }
      }, 100);
    } else {
      // Restore body scroll
      document.body.style.overflow = 'unset';
      // Restore focus to previous element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  // Trap focus within modal
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab') {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements && focusableElements.length > 0) {
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
        
        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto animate-fade-in"
      aria-labelledby={title ? "modal-title" : undefined}
      aria-modal="true"
      role="dialog"
    >
      {/* Enhanced backdrop */}
      <div 
        className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
        onClick={handleBackdropClick}
      >
        {/* Background overlay with blur */}
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          aria-hidden="true"
        />

        {/* This element is to trick the browser into centering the modal contents. */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        {/* Enhanced Modal panel */}
        <div
          ref={modalRef}
          className={`
            inline-block align-bottom bg-white/95 backdrop-blur-xl rounded-3xl 
            px-4 pt-6 pb-6 text-left overflow-hidden shadow-medical-elevated 
            transform transition-all duration-300 sm:my-8 sm:align-middle 
            sm:p-8 w-full ${sizeClasses[size]} 
            border ${variantStyles.panel}
            animate-scale-in
          `}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          {/* Enhanced Header */}
          {title && (
            <div className={`flex items-center justify-between mb-6 pb-4 ${variantStyles.header}`}>
              <h3 
                id="modal-title"
                className={`text-xl font-bold leading-tight ${variantStyles.title}`}
              >
                {title}
              </h3>
              <button
                onClick={onClose}
                className="p-2 rounded-2xl text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300 transform hover:scale-110 active:scale-95"
                aria-label="Close modal"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Enhanced Content */}
          <div className="mt-2">
            <div className="animate-fade-in">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;