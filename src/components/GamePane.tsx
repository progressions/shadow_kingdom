import React, { useMemo, useCallback, useRef } from 'react';
import { Box, Text } from 'ink';
import { Message } from '../types/Message';
import { ColorThemeService } from '../services/colorThemeService';
// Removed unnecessary text formatting imports

interface GamePaneProps {
  messages: Message[];
  maxLines?: number;
  width?: number;
  colorThemeService?: ColorThemeService;
}

// LRU Cache implementation for formatted messages
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 500) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (this.cache.has(key)) {
      // Move to end (most recently used)
      const value = this.cache.get(key)!;
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return undefined;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      // Update existing
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const GamePane: React.FC<GamePaneProps> = ({
  messages,
  maxLines,
  width,
  colorThemeService,
}) => {
  // Component-scoped cache with proper lifecycle management
  const formatCacheRef = useRef(
    new LRUCache<string, { text: string; color?: string; bold?: boolean; dimColor?: boolean }>(500)
  );
  // If maxLines is set, only show the last N messages
  const displayMessages = useMemo(() => {
    if (maxLines && maxLines > 0) {
      // Don't subtract padding since we're handling individual lines now
      if (messages.length > maxLines) {
        return messages.slice(-maxLines);
      }
    }
    return messages;
  }, [messages, maxLines]);

  // Memoized message formatting function with proper caching
  const formatMessage = useCallback(
    (message: Message) => {
      // Generate comprehensive cache key including message metadata
      const cacheKey = JSON.stringify({
        content: message.content,
        id: message.id,
        timestamp: message.timestamp.toISOString(),
      });

      const formatCache = formatCacheRef.current;
      const cachedResult = formatCache.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
      let content = message.content;
      let result;

      // Debug logging
      if (process.env.DEBUG === 'true') {
        console.log('GamePane formatMessage:', {
          content: content.substring(0, 50),
          hasEquals: content.includes('==='),
          startsWithError: content.startsWith('Error:'),
          startsWithCommand: content.startsWith('> '),
          startsWithExits: content.startsWith('Exits:'),
        });
      }

      // Check content type and determine result
      // Special handling for room headers (only the title line should be yellow)
      if (content.includes('===')) {
        // This is a room title with underline
        result = { text: content, color: 'yellow', bold: true };
        if (process.env.DEBUG === 'true') console.log('  -> Applying YELLOW for room title');
      } else if (content.startsWith('Error:') || content.startsWith('Unable to')) {
        result = { text: content, color: 'red' };
        if (process.env.DEBUG === 'true') console.log('  -> Applying RED for error');
      } else if (content.startsWith('> ')) {
        result = { text: content, color: 'green', dimColor: true };
        if (process.env.DEBUG === 'true') console.log('  -> Applying GREEN for command');
      } else if (content.startsWith('Exits:') || content.startsWith('→ Available exits:')) {
        result = { text: content, color: 'yellow' };
        if (process.env.DEBUG === 'true') console.log('  -> Applying YELLOW for exits');
      } else if (content.startsWith('You can see:') || content.startsWith('Also here:')) {
        result = { text: content, color: 'magenta', bold: true };
        if (process.env.DEBUG === 'true') console.log('  -> Applying MAGENTA for items');
      } else if (content.startsWith('- ') && content.includes(':')) {
        result = { text: content, color: 'gray', dimColor: true };
        if (process.env.DEBUG === 'true') console.log('  -> Applying GRAY for list items');
      } else {
        // Default formatting for room descriptions and other content
        result = { text: content, color: 'white' };
        if (process.env.DEBUG === 'true') console.log('  -> Applying WHITE (default)');
      }

      // Cache the result using LRU eviction strategy
      formatCache.set(cacheKey, result);

      return result;
    },
    [colorThemeService]
  );

  // Memoize the rendered messages for better performance
  const renderedMessages = useMemo(() => {
    return displayMessages.map((message, _index) => {
      const formatted = formatMessage(message);
      return (
        <Box key={message.id}>
          <Text
            color={formatted.color}
            bold={formatted.bold}
            dimColor={formatted.dimColor}
            wrap="wrap"
          >
            {formatted.text}
          </Text>
        </Box>
      );
    });
  }, [displayMessages, formatMessage]);

  return (
    <Box flexDirection="column" padding={0} width={width}>
      {renderedMessages}
    </Box>
  );
};
