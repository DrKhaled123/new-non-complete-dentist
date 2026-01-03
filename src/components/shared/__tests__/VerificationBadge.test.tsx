import React from 'react';
import { render, screen } from '@testing-library/react';
import VerificationBadge from '../VerificationBadge';
import { ValidationResult } from '../../../services/medical/contentValidator';

describe('VerificationBadge', () => {
  test('shows "Not Verified" when validation is null', () => {
    render(<VerificationBadge validation={null} />);
    
    expect(screen.getByText('Not Verified')).toBeInTheDocument();
  });

  test('shows "Verified" for valid data', () => {
    const validation: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      clinicalAlerts: []
    };

    render(<VerificationBadge validation={validation} />);
    
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  test('shows "Critical Issues" for critical errors', () => {
    const validation: ValidationResult = {
      isValid: false,
      errors: [
        { field: 'name', message: 'Required', severity: 'critical', code: 'REQUIRED' }
      ],
      warnings: [],
      clinicalAlerts: [
        { type: 'contraindication', message: 'Critical issue', severity: 'critical', action: 'Stop' }
      ]
    };

    render(<VerificationBadge validation={validation} />);
    
    expect(screen.getByText('Critical Issues')).toBeInTheDocument();
  });

  test('shows "Warnings" for high errors', () => {
    const validation: ValidationResult = {
      isValid: false,
      errors: [
        { field: 'name', message: 'Required', severity: 'high', code: 'REQUIRED' }
      ],
      warnings: [],
      clinicalAlerts: [
        { type: 'dosage', message: 'Major issue', severity: 'major', action: 'Review' }
      ]
    };

    render(<VerificationBadge validation={validation} />);
    
    expect(screen.getByText('Warnings')).toBeInTheDocument();
  });

  test('shows "Recommendations" for warnings only', () => {
    const validation: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [
        { field: 'description', message: 'Missing', recommendation: 'Add description' }
      ],
      clinicalAlerts: []
    };

    render(<VerificationBadge validation={validation} />);
    
    expect(screen.getByText('Recommendations')).toBeInTheDocument();
  });

  test('shows details when showDetails is true', () => {
    const validation: ValidationResult = {
      isValid: false,
      errors: [
        { field: 'name', message: 'Required', severity: 'high', code: 'REQUIRED' }
      ],
      warnings: [
        { field: 'description', message: 'Missing', recommendation: 'Add description' }
      ],
      clinicalAlerts: [
        { type: 'dosage', message: 'Alert', severity: 'moderate', action: 'Review' }
      ]
    };

    render(<VerificationBadge validation={validation} showDetails={true} />);
    
    expect(screen.getByText(/1 error/)).toBeInTheDocument();
    expect(screen.getByText(/1 warning/)).toBeInTheDocument();
    expect(screen.getByText(/1 clinical alert/)).toBeInTheDocument();
  });

  test('applies correct size classes', () => {
    const validation: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      clinicalAlerts: []
    };

    const { rerender } = render(<VerificationBadge validation={validation} size="sm" />);
    expect(screen.getByText('Verified')).toHaveClass('text-xs', 'px-2', 'py-0.5');

    rerender(<VerificationBadge validation={validation} size="lg" />);
    expect(screen.getByText('Verified')).toHaveClass('text-sm', 'px-3', 'py-1.5');
  });

  test('applies custom className', () => {
    const validation: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      clinicalAlerts: []
    };

    render(<VerificationBadge validation={validation} className="custom-class" />);
    
    const container = screen.getByText('Verified').closest('div');
    expect(container).toHaveClass('custom-class');
  });
});