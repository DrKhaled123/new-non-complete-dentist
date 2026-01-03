import React from 'react';
import { ValidationResult } from '../../services/medical/contentValidator';

/**
 * VerificationBadge Component
 * 
 * Displays verification status for medical content with visual indicators
 * Shows validation state, errors, warnings, and clinical alerts
 */

interface VerificationBadgeProps {
  validation: ValidationResult | null;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  validation,
  showDetails = false,
  size = 'md',
  className = ''
}) => {
  if (!validation) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ${
          size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs'
        }`}>
          <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Not Verified
        </span>
      </div>
    );
  }

  const criticalErrors = validation.errors.filter(e => e.severity === 'critical').length;
  const highErrors = validation.errors.filter(e => e.severity === 'high').length;
  const criticalAlerts = validation.clinicalAlerts.filter(a => a.severity === 'critical').length;
  const majorAlerts = validation.clinicalAlerts.filter(a => a.severity === 'major').length;

  // Determine badge color and icon based on validation state
  let badgeColor = 'bg-success-100 text-success-700 border-success-200';
  let icon = (
    <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  let statusText = 'Verified';

  if (criticalErrors > 0 || criticalAlerts > 0) {
    badgeColor = 'bg-error-100 text-error-700 border-error-200';
    icon = (
      <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
    statusText = 'Critical Issues';
  } else if (highErrors > 0 || majorAlerts > 0) {
    badgeColor = 'bg-warning-100 text-warning-700 border-warning-200';
    icon = (
      <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
    statusText = 'Warnings';
  } else if (validation.warnings.length > 0) {
    badgeColor = 'bg-accent-100 text-accent-700 border-accent-200';
    icon = (
      <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
    statusText = 'Recommendations';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5'
  };

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <span className={`inline-flex items-center rounded-full font-medium border ${badgeColor} ${sizeClasses[size]}`}>
        {icon}
        {statusText}
      </span>
      
      {showDetails && (
        <div className="mt-2 space-y-1">
          {validation.errors.length > 0 && (
            <div className="text-xs text-error-600">
              {validation.errors.length} error{validation.errors.length !== 1 ? 's' : ''}
            </div>
          )}
          {validation.warnings.length > 0 && (
            <div className="text-xs text-warning-600">
              {validation.warnings.length} warning{validation.warnings.length !== 1 ? 's' : ''}
            </div>
          )}
          {validation.clinicalAlerts.length > 0 && (
            <div className="text-xs text-accent-600">
              {validation.clinicalAlerts.length} clinical alert{validation.clinicalAlerts.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VerificationBadge;
