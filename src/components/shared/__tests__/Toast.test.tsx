import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toast from '../Toast';

describe('Toast Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders success toast with correct styling', () => {
    render(
      <Toast type="success" message="Success message" onClose={mockOnClose} />
    );

    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('text-green-800', 'bg-green-50', 'border-green-200');
    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  it('renders error toast with correct styling', () => {
    render(
      <Toast type="error" message="Error message" onClose={mockOnClose} />
    );

    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('text-red-800', 'bg-red-50', 'border-red-200');
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('renders warning toast with correct styling', () => {
    render(
      <Toast type="warning" message="Warning message" onClose={mockOnClose} />
    );

    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('text-yellow-800', 'bg-yellow-50', 'border-yellow-200');
    expect(screen.getByText('Warning message')).toBeInTheDocument();
  });

  it('renders info toast with correct styling', () => {
    render(
      <Toast type="info" message="Info message" onClose={mockOnClose} />
    );

    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('text-blue-800', 'bg-blue-50', 'border-blue-200');
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    render(
      <Toast type="info" message="Test message" onClose={mockOnClose} />
    );

    const closeButton = screen.getByLabelText('Close notification');
    await user.click(closeButton);

    // Wait for animation
    jest.advanceTimersByTime(300);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('auto-closes after default duration', () => {
    render(
      <Toast type="info" message="Test message" onClose={mockOnClose} />
    );

    // Fast-forward time by default duration (5000ms)
    jest.advanceTimersByTime(5000);

    // Wait for animation
    jest.advanceTimersByTime(300);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('auto-closes after custom duration', () => {
    render(
      <Toast type="info" message="Test message" duration={3000} onClose={mockOnClose} />
    );

    // Fast-forward time by custom duration (3000ms)
    jest.advanceTimersByTime(3000);

    // Wait for animation
    jest.advanceTimersByTime(300);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('has proper accessibility attributes', () => {
    render(
      <Toast type="info" message="Test message" onClose={mockOnClose} />
    );

    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('aria-live', 'polite');

    const closeButton = screen.getByLabelText('Close notification');
    expect(closeButton).toBeInTheDocument();
  });

  it('displays correct icon for each type', () => {
    const { rerender } = render(
      <Toast type="success" message="Success" onClose={mockOnClose} />
    );
    
    // Success icon should be present
    expect(screen.getByRole('alert')).toContainHTML('svg');

    rerender(<Toast type="error" message="Error" onClose={mockOnClose} />);
    expect(screen.getByRole('alert')).toContainHTML('svg');

    rerender(<Toast type="warning" message="Warning" onClose={mockOnClose} />);
    expect(screen.getByRole('alert')).toContainHTML('svg');

    rerender(<Toast type="info" message="Info" onClose={mockOnClose} />);
    expect(screen.getByRole('alert')).toContainHTML('svg');
  });

  it('applies exit animation when closing', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    render(
      <Toast type="info" message="Test message" onClose={mockOnClose} />
    );

    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('translate-x-0', 'opacity-100');

    const closeButton = screen.getByLabelText('Close notification');
    await user.click(closeButton);

    // Should have exit classes applied
    expect(toast).toHaveClass('translate-x-full', 'opacity-0');
  });

  it('does not call onClose multiple times', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    render(
      <Toast type="info" message="Test message" onClose={mockOnClose} />
    );

    const closeButton = screen.getByLabelText('Close notification');
    
    // Click multiple times quickly
    await user.click(closeButton);
    await user.click(closeButton);
    await user.click(closeButton);

    // Wait for animation
    jest.advanceTimersByTime(300);

    // Should only be called once
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});