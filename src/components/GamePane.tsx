import React, { useMemo, useCallback, useRef } from 'react';
import { Box, Text } from 'ink';
import { Message } from '../types/Message';
import {
  isRoomName,
  ensureRoomNameFormatting,
  convertExitsToLegacyFormat,
} from '../utils/textFormatting';

interface GamePaneProps {
  messages: Message[];
  maxLines?: number;
  width?: number;
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

export const GamePane: React.FC<GamePaneProps> = ({ messages, maxLines, width }) => {
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
  const formatMessage = useCallback((message: Message) => {
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

    // Convert modern exit format to legacy format first
    content = convertExitsToLegacyFormat(content);

    // Check for room names and ensure ASCII underline formatting
    if (isRoomName(content)) {
      content = ensureRoomNameFormatting(content);
      result = { text: content, color: 'cyan', bold: true };
    }
    // Check for headers with existing ASCII underlines
    else if (content.includes('===')) {
      result = { text: content, color: 'cyan', bold: true };
    }
    // Check for error messages
    else if (content.startsWith('Error:') || content.startsWith('Unable to')) {
      result = { text: content, color: 'red' };
    }
    // Check for commands (lines starting with >)
    else if (content.startsWith('> ')) {
      result = { text: content, color: 'green', dimColor: true };
    }
    // Check for exits line (including converted legacy format)
    else if (content.startsWith('Exits:')) {
      result = { text: content, color: 'yellow', dimColor: true };
    }
    // Check for items/characters headers
    else if (content.startsWith('You can see:') || content.startsWith('Also here:')) {
      result = { text: content, color: 'magenta', bold: true };
    }
    // Check for items/characters list entries (lines starting with -)
    else if (content.startsWith('- ') && content.includes(':')) {
      result = { text: content, color: 'white', dimColor: true }; // Subtle styling for list items
    }
    // Default formatting for room descriptions and other content
    else {
      result = { text: content, color: undefined };
    }

    // Cache the result using LRU eviction strategy
    formatCache.set(cacheKey, result);

    return result;
  }, []);

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
