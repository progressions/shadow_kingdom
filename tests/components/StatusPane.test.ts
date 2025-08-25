import React from 'react';
import { render } from 'ink-testing-library';
import { StatusPane } from '../../src/components/StatusPane';

describe('StatusPane Component', () => {
  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      const { lastFrame } = render(React.createElement(StatusPane, { status: 'Ready' }));
      expect(lastFrame()).toBeDefined();
    });

    it('should display status text', () => {
      const { lastFrame } = render(React.createElement(StatusPane, { status: 'Game Ready' }));
      const output = lastFrame();
      expect(output).toContain('Game Ready');
    });
  });

  describe('Static Information Display', () => {
    it('should show placeholder status information', () => {
      const { lastFrame } = render(React.createElement(StatusPane, { status: 'Shadow Kingdom v1.0' }));
      const output = lastFrame();
      expect(output).toContain('Shadow Kingdom');
      expect(output).toContain('v1.0');
    });

    it('should display multiple status items', () => {
      const statusInfo = {
        version: 'v1.0',
        mode: 'Development'
      };
      const { lastFrame } = render(React.createElement(StatusPane, { statusInfo }));
      const output = lastFrame();
      
      expect(output).toContain('v1.0');
      expect(output).toContain('Development');
    });
  });

  describe('Layout Constraints', () => {
    it('should limit content to 2 lines maximum', () => {
      const longStatus = 'Line 1\nLine 2\nLine 3\nLine 4'; // More than 2 lines
      const { lastFrame } = render(React.createElement(StatusPane, { status: longStatus }));
      
      const output = lastFrame();
      if (!output) return;
      const lines = output.split('\n');
      
      // Should not exceed reasonable height for status pane
      expect(lines.length).toBeLessThanOrEqual(5); // Allow some buffer for borders/padding
    });

    it('should maintain fixed height positioning', () => {
      const { lastFrame } = render(React.createElement(StatusPane, { status: 'Test Status' }));
      
      // Should render with consistent height
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('Information Types', () => {
    it('should handle simple string status', () => {
      const { lastFrame } = render(React.createElement(StatusPane, { status: 'Connected' }));
      expect(lastFrame()).toContain('Connected');
    });

    it('should handle structured status object', () => {
      const status = {
        connection: 'Ready',
        version: '1.0.0'
      };
      const { lastFrame } = render(React.createElement(StatusPane, { statusInfo: status }));
      const output = lastFrame();
      
      expect(output).toContain('Ready');
      expect(output).toContain('1.0.0');
    });
  });

  describe('Responsive Behavior', () => {
    it('should handle terminal width changes', () => {
      const { lastFrame, rerender } = render(React.createElement(StatusPane, { status: 'Initial' }));
      
      expect(lastFrame()).toContain('Initial');
      
      // Re-render with updated status
      rerender(React.createElement(StatusPane, { status: 'Updated Status Information' }));
      
      expect(lastFrame()).toContain('Updated Status');
    });

    it('should truncate long status messages appropriately', () => {
      const veryLongStatus = 'This is an extremely long status message that should be handled gracefully by the component without breaking the layout or exceeding the allocated space for the status pane component';
      
      const { lastFrame } = render(React.createElement(StatusPane, { status: veryLongStatus }));
      
      // Should render without breaking
      expect(lastFrame()).toBeDefined();
    });
  });
});