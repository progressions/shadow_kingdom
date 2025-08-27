import { Message } from '../types/Message';

/**
 * Message buffer management utilities
 */

export const MAX_SCROLLBACK = 500;

/**
 * Trims a message buffer to the maximum scrollback size
 * Keeps the most recent messages
 */
export function trimMessageBuffer(messages: Message[]): Message[] {
  if (messages.length <= MAX_SCROLLBACK) {
    return messages;
  }
  return messages.slice(-MAX_SCROLLBACK);
}

/**
 * Adds messages to a buffer with automatic trimming
 */
export function addMessagesToBuffer(buffer: Message[], newMessages: Message[]): Message[] {
  const combined = [...buffer, ...newMessages];
  return trimMessageBuffer(combined);
}

/**
 * Gets buffer statistics for monitoring
 */
export function getBufferStats(messages: Message[]): {
  count: number;
  isFull: boolean;
  percentFull: number;
  oldestMessageAge: number | null;
} {
  const count = messages.length;
  const isFull = count >= MAX_SCROLLBACK;
  const percentFull = (count / MAX_SCROLLBACK) * 100;

  const oldestMessageAge =
    messages.length > 0 ? Date.now() - messages[0].timestamp.getTime() : null;

  return {
    count,
    isFull,
    percentFull,
    oldestMessageAge,
  };
}

/**
 * Estimates memory usage of message buffer (rough approximation)
 */
export function estimateBufferMemoryUsage(messages: Message[]): {
  messageCount: number;
  estimatedBytes: number;
  estimatedMB: number;
} {
  // Rough estimate: each message ~200 bytes (content + overhead)
  const avgBytesPerMessage = 200;
  const estimatedBytes = messages.length * avgBytesPerMessage;
  const estimatedMB = estimatedBytes / (1024 * 1024);

  return {
    messageCount: messages.length,
    estimatedBytes,
    estimatedMB,
  };
}
