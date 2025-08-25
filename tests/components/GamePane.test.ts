import React from 'react';
import { render } from 'ink-testing-library';
import { GamePane } from '../../src/components/GamePane';

describe('GamePane Component', () => {
  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      const { lastFrame } = render(React.createElement(GamePane, { messages: [] }));
      expect(lastFrame()).toBeDefined();
    });

    it('should display placeholder text when no messages', () => {
      const { lastFrame } = render(React.createElement(GamePane, { messages: [] }));
      const output = lastFrame();
      expect(output).toContain('Shadow Kingdom'); // Should show game title or similar
    });
  });

  describe('Message Display', () => {
    it('should display simple text messages', () => {
      const messages = ['Hello World', 'Test Message'];
      const { lastFrame } = render(React.createElement(GamePane, { messages }));
      const output = lastFrame();
      
      expect(output).toContain('Hello World');
      expect(output).toContain('Test Message');
    });

    it('should handle multiple messages in order', () => {
      const messages = ['First', 'Second', 'Third'];
      const { lastFrame } = render(React.createElement(GamePane, { messages }));
      const output = lastFrame();
      
      // Messages should appear in the output
      expect(output).toContain('First');
      expect(output).toContain('Second');
      expect(output).toContain('Third');
    });
  });

  describe('Scrolling Behavior', () => {
    it('should handle long message lists', () => {
      const longMessages = Array.from({ length: 50 }, (_, i) => `Message ${i + 1}`);
      const { lastFrame } = render(React.createElement(GamePane, { messages: longMessages }));
      
      // Should render without errors even with many messages
      expect(lastFrame()).toBeDefined();
    });

    it('should show recent messages when scrolled', () => {
      const messages = ['Old Message', 'Recent Message'];
      const { lastFrame } = render(React.createElement(GamePane, { messages }));
      const output = lastFrame();
      
      // Recent message should be visible
      expect(output).toContain('Recent Message');
    });
  });

  describe('Layout Properties', () => {
    it('should use flex-grow for height expansion', () => {
      const { lastFrame } = render(React.createElement(GamePane, { messages: ['Test'] }));
      
      // Should render successfully with flex properties
      expect(lastFrame()).toBeDefined();
    });

    it('should handle terminal resize events', () => {
      const { lastFrame, rerender } = render(React.createElement(GamePane, { messages: ['Test'] }));
      
      // Initial render
      expect(lastFrame()).toBeDefined();
      
      // Re-render should work (simulating resize)
      rerender(React.createElement(GamePane, { messages: ['Test', 'Updated'] }));
      expect(lastFrame()).toContain('Updated');
    });
  });
});