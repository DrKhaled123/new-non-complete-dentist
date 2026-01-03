import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner Component', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
    
    // Should have screen reader text
    expect(screen.getByText('Loading, please wait...')).toBeInTheDocument();
  });

  it('renders with custom text', () => {
    const customText = 'Calculating dose...';
    render(<LoadingSpinner text={customText} />);
    
    expect(screen.getByText(customText)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', customText);
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />);
    let spinner = document.querySelector('.spinner');
    expect(spinner).toHaveClass('w-4', 'h-4');

    rerender(<LoadingSpinner size="md" />);
    spinner = document.querySelector('.spinner');
    expect(spinner).toHaveClass('w-8', 'h-8');

    rerender(<LoadingSpinner size="lg" />);
    spinner = document.querySelector('.spinner');
    expect(spinner).toHaveClass('w-12', 'h-12');
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-spinner" />);
    
    const container = screen.getByRole('status');
    expect(container).toHaveClass('custom-spinner');
  });

  it('has proper accessibility attributes', () => {
    render(<LoadingSpinner text="Processing..." />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-live', 'polite');
    expect(spinner).toHaveAttribute('aria-label', 'Processing...');
    
    // Spinner element should be hidden from screen readers
    const spinnerElement = document.querySelector('.spinner');
    expect(spinnerElement).toHaveAttribute('aria-hidden', 'true');
  });
});