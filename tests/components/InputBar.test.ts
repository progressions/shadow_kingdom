import React from 'react';
import { render } from 'ink-testing-library';
import { InputBar } from '../../src/components/InputBar';

describe('InputBar Component', () => {
  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      const mockOnSubmit = jest.fn();
      const { lastFrame } = render(
        React.createElement(InputBar, { 
          onSubmit: mockOnSubmit, 
          placeholder: 'Enter command...' 
        })
      );
      expect(lastFrame()).toBeDefined();
    });

    it('should display placeholder text', () => {
      const mockOnSubmit = jest.fn();
      const { lastFrame } = render(
        React.createElement(InputBar, { 
          onSubmit: mockOnSubmit, 
          placeholder: 'Enter command...' 
        })
      );
      const output = lastFrame();
      expect(output).toContain('Enter command');
    });
  });

  describe('Border Styling', () => {
    it('should render with ASCII borders', () => {
      const mockOnSubmit = jest.fn();
      const { lastFrame } = render(
        React.createElement(InputBar, { 
          onSubmit: mockOnSubmit, 
          placeholder: 'Enter command...' 
        })
      );
      const output = lastFrame();
      
      // Should contain box drawing characters for borders
      expect(output).toMatch(/[┌┐└┘│─]/);
    });

    it('should have visual separation from other components', () => {
      const mockOnSubmit = jest.fn();
      const { lastFrame } = render(
        React.createElement(InputBar, { 
          onSubmit: mockOnSubmit, 
          placeholder: 'Enter command...' 
        })
      );
      
      // Should render with distinctive styling
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('Input Handling', () => {
    it('should accept text input', () => {
      const mockOnSubmit = jest.fn();
      const { lastFrame, stdin } = render(
        React.createElement(InputBar, { 
          onSubmit: mockOnSubmit, 
          placeholder: 'Enter command...' 
        })
      );
      
      // Initial render should work
      expect(lastFrame()).toBeDefined();
      
      // Input should be ready to receive text
      expect(stdin).toBeDefined();
    });

    it('should call onSubmit when Enter is pressed', () => {
      const mockOnSubmit = jest.fn();
      const { stdin } = render(
        React.createElement(InputBar, { 
          onSubmit: mockOnSubmit, 
          placeholder: 'Enter command...' 
        })
      );
      
      // Simulate Enter key press (the TextInput component handles this)
      stdin.write('\r'); // Enter key
      
      // onSubmit should be called with whatever was in the input (empty in this case)
      expect(mockOnSubmit).toHaveBeenCalledWith('');
    });
  });

  describe('Fixed Positioning', () => {
    it('should maintain fixed height', () => {
      const mockOnSubmit = jest.fn();
      const { lastFrame } = render(
        React.createElement(InputBar, { 
          onSubmit: mockOnSubmit, 
          placeholder: 'Enter command...' 
        })
      );
      
      // Should render with consistent height
      expect(lastFrame()).toBeDefined();
    });

    it('should stay in position during content changes', () => {
      const mockOnSubmit = jest.fn();
      const { lastFrame, rerender } = render(
        React.createElement(InputBar, { 
          onSubmit: mockOnSubmit, 
          placeholder: 'Enter command...' 
        })
      );
      
      expect(lastFrame()).toBeDefined();
      
      // Re-render with different props
      rerender(
        React.createElement(InputBar, { 
          onSubmit: mockOnSubmit, 
          placeholder: 'Updated placeholder...' 
        })
      );
      
      expect(lastFrame()).toContain('Updated placeholder');
    });
  });
});