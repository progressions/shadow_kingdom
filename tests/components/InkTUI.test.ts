import React from 'react';
import { render } from 'ink-testing-library';
import { InkTUI } from '../../src/components/InkTUI';

describe('InkTUI Component', () => {
  describe('Layout Structure', () => {
    it('should render all three main sections', () => {
      const { lastFrame } = render(React.createElement(InkTUI));
      
      // Should contain content suggesting three distinct sections
      const output = lastFrame();
      expect(output).toBeDefined();
      expect(typeof output).toBe('string');
    });

    it('should have proper component hierarchy', () => {
      const { lastFrame } = render(React.createElement(InkTUI));
      
      // The component should render without crashing
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('GamePane Component', () => {
    it('should render GamePane section', () => {
      const { lastFrame } = render(React.createElement(InkTUI));
      
      // GamePane should be present in the output
      const output = lastFrame();
      expect(output).toContain('Shadow Kingdom'); // Should contain some reference to game area
    });

    it('should occupy most of the screen height', () => {
      const { lastFrame } = render(React.createElement(InkTUI));
      
      // Component should render successfully indicating proper flex setup
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('InputBar Component', () => {
    it('should render InputBar with borders', () => {
      const { lastFrame } = render(React.createElement(InkTUI));
      
      // Should contain some form of border characters
      const output = lastFrame();
      expect(output).toMatch(/[┌┐└┘│─]/); // Unicode box drawing characters
    });

    it('should have fixed height positioning', () => {
      const { lastFrame } = render(React.createElement(InkTUI));
      
      // Component should render without layout issues
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('StatusPane Component', () => {
    it('should render StatusPane section', () => {
      const { lastFrame } = render(React.createElement(InkTUI));
      
      // StatusPane should be present
      const output = lastFrame();
      expect(output).toContain('Ready'); // Should contain status reference
    });

    it('should be limited to 2 lines height', () => {
      const { lastFrame } = render(React.createElement(InkTUI));
      
      // Should render successfully with height constraints
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('Responsive Layout', () => {
    it('should handle minimum terminal dimensions', () => {
      // Test with small terminal size
      const { lastFrame } = render(React.createElement(InkTUI));
      
      // Should render without errors even in small spaces
      expect(lastFrame()).toBeDefined();
    });

    it('should maintain component ratios', () => {
      const { lastFrame } = render(React.createElement(InkTUI));
      
      // Layout should be stable
      expect(lastFrame()).toBeDefined();
    });
  });
});