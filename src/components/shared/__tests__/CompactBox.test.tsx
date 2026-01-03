import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CompactBox from '../CompactBox';

describe('CompactBox Component', () => {
  const defaultProps = {
    title: 'Test Clinical Notes',
    children: <div>Test content for clinical notes</div>,
  };

  it('renders with title and collapsed by default', () => {
    render(<CompactBox {...defaultProps} />);
    
    expect(screen.getByText('Test Clinical Notes')).toBeInTheDocument();
    expect(screen.getByText('Test content for clinical notes')).toBeInTheDocument();
    
    // Should be collapsed by default (aria-expanded=false)
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands when clicked', () => {
    render(<CompactBox {...defaultProps} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('toggles expansion on Enter key', () => {
    render(<CompactBox {...defaultProps} />);
    
    const button = screen.getByRole('button');
    
    // Press Enter to expand
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(button).toHaveAttribute('aria-expanded', 'true');
    
    // Press Enter again to collapse
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles expansion on Space key', () => {
    render(<CompactBox {...defaultProps} />);
    
    const button = screen.getByRole('button');
    
    // Press Space to expand
    fireEvent.keyDown(button, { key: ' ' });
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('starts expanded when defaultExpanded is true', () => {
    render(<CompactBox {...defaultProps} defaultExpanded={true} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('applies custom className', () => {
    const { container } = render(
      <CompactBox {...defaultProps} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('compact-box', 'custom-class');
  });

  it('has proper accessibility attributes', () => {
    render(<CompactBox {...defaultProps} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('tabIndex', '0');
    expect(button).toHaveAttribute('aria-controls');
    expect(button).toHaveAttribute('aria-label');
  });
});